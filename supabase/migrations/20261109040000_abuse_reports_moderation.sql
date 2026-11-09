BEGIN;

-- Abuse reports with bounded evidence snapshots. Admins never read rental_messages (RLS stays participant-only);
-- they inspect only the snapshot captured at report time, and every inspection is appended to admin_audit_logs.

CREATE TABLE public.abuse_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('conversation', 'message', 'listing', 'account')),
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.rental_conversations(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.rental_messages(id) ON DELETE SET NULL,
  listing_id uuid,
  category text NOT NULL CHECK (category IN ('scam_or_fraud', 'harassment', 'inaccurate_listing', 'off_platform_payment', 'spam', 'other')),
  details text NOT NULL CHECK (length(btrim(details)) BETWEEN 10 AND 1000),
  evidence_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed')),
  resolution_note text CHECK (resolution_note IS NULL OR length(btrim(resolution_note)) <= 1000),
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  UNIQUE (reporter_id, operation_id)
);

CREATE INDEX idx_abuse_reports_queue ON public.abuse_reports(status, created_at DESC);

ALTER TABLE public.abuse_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.abuse_reports FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.abuse_reports TO service_role;
GRANT SELECT ON public.abuse_reports TO authenticated;

CREATE POLICY abuse_reports_reporter_or_admin_read ON public.abuse_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_admin());

-- Internal projection shared by the admin list (no evidence) and detail (with evidence) RPCs.
CREATE FUNCTION public._abuse_report_json(p_report_id uuid, p_with_evidence boolean)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT pg_catalog.jsonb_build_object(
    'id', r.id, 'operationId', r.operation_id,
    'reporterId', r.reporter_id, 'reporterName', rp.full_name,
    'targetType', r.target_type, 'targetUserId', r.target_user_id, 'targetUserName', tp.full_name,
    'targetUserSuspended', COALESCE(tp.is_suspended, false),
    'conversationId', r.conversation_id, 'messageId', r.message_id, 'listingId', r.listing_id,
    'category', r.category, 'details', r.details, 'status', r.status,
    'resolutionNote', r.resolution_note, 'resolvedBy', r.resolved_by, 'resolvedAt', r.resolved_at,
    'createdAt', r.created_at, 'updatedAt', r.updated_at)
    || CASE WHEN p_with_evidence THEN pg_catalog.jsonb_build_object('evidenceSnapshot', r.evidence_snapshot) ELSE '{}'::jsonb END
  FROM public.abuse_reports r
  LEFT JOIN public.profiles rp ON rp.id = r.reporter_id
  LEFT JOIN public.profiles tp ON tp.id = r.target_user_id
  WHERE r.id = p_report_id;
$$;

CREATE FUNCTION public.submit_abuse_report(
  p_operation_id uuid, p_target_type text, p_conversation_id uuid DEFAULT NULL, p_message_id uuid DEFAULT NULL,
  p_listing_id uuid DEFAULT NULL, p_category text DEFAULT NULL, p_details text DEFAULT NULL, p_block_counterpart boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_details text := pg_catalog.btrim(COALESCE(p_details, ''));
  v_existing public.abuse_reports%ROWTYPE;
  v_conv public.rental_conversations%ROWTYPE;
  v_msg public.rental_messages%ROWTYPE;
  v_target_user uuid;
  v_listing_id uuid := p_listing_id;
  v_conversation_id uuid;
  v_message_id uuid;
  v_snapshot jsonb;
  v_messages jsonb := '[]'::jsonb;
  v_title text;
  v_status text;
  v_found boolean := false;
  v_blocked boolean := false;
  v_report_id uuid;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user AND role IN ('renter', 'landlord') AND NOT is_suspended
  ) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_operation_id IS NULL
    OR p_target_type IS NULL OR p_target_type NOT IN ('conversation', 'message', 'listing', 'account')
    OR p_category IS NULL OR p_category NOT IN ('scam_or_fraud', 'harassment', 'inaccurate_listing', 'off_platform_payment', 'spam', 'other')
    OR length(v_details) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'invalid report' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('abuse-report:' || v_user::text || ':' || p_operation_id::text, 0));
  SELECT * INTO v_existing FROM public.abuse_reports WHERE reporter_id = v_user AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_existing.target_type <> p_target_type OR v_existing.category <> p_category THEN
      RAISE EXCEPTION 'operation id already used for a different report' USING ERRCODE = '23505';
    END IF;
    RETURN pg_catalog.jsonb_build_object('reportId', v_existing.id, 'status', v_existing.status,
      'blocked', COALESCE(p_block_counterpart, false), 'replayed', true);
  END IF;

  IF p_target_type IN ('conversation', 'message', 'account') THEN
    -- 'account' reports are only possible against a conversation counterpart (no free-form user ids).
    IF p_conversation_id IS NULL THEN
      RAISE EXCEPTION 'conversation required' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_conv FROM public.rental_conversations c
      WHERE c.id = p_conversation_id AND (c.renter_id = v_user OR c.landlord_id = v_user);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'not a participant of this conversation' USING ERRCODE = '42501';
    END IF;
    v_conversation_id := v_conv.id;
    v_target_user := CASE WHEN v_conv.renter_id = v_user THEN v_conv.landlord_id ELSE v_conv.renter_id END;
    v_listing_id := COALESCE(p_listing_id, v_conv.listing_id);

    IF p_target_type = 'message' THEN
      IF p_message_id IS NULL THEN
        RAISE EXCEPTION 'message required' USING ERRCODE = '22023';
      END IF;
      SELECT * INTO v_msg FROM public.rental_messages m WHERE m.id = p_message_id AND m.conversation_id = v_conv.id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'message does not belong to conversation' USING ERRCODE = '22023';
      END IF;
      v_message_id := v_msg.id;
    END IF;

    -- Bounded evidence: the reported message + up to 5 surrounding messages, or the 5 most recent for a conversation report.
    IF p_target_type IN ('conversation', 'message') THEN
      SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'id', t.id, 'senderId', t.sender_id, 'body', t.body, 'createdAt', t.created_at, 'reported', t.id = v_message_id)
        ORDER BY t.created_at, t.id), '[]'::jsonb)
      INTO v_messages
      FROM (
        SELECT m.id, m.sender_id, m.body, m.created_at
        FROM public.rental_messages m
        WHERE m.conversation_id = v_conv.id
          AND (v_message_id IS NULL OR m.id = v_message_id
               OR m.id IN (SELECT b.id FROM public.rental_messages b
                           WHERE b.conversation_id = v_conv.id AND (b.created_at, b.id) < (v_msg.created_at, v_msg.id)
                           ORDER BY b.created_at DESC, b.id DESC LIMIT 3)
               OR m.id IN (SELECT a.id FROM public.rental_messages a
                           WHERE a.conversation_id = v_conv.id AND (a.created_at, a.id) > (v_msg.created_at, v_msg.id)
                           ORDER BY a.created_at, a.id LIMIT 2))
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT CASE WHEN v_message_id IS NULL THEN 5 ELSE 6 END
      ) t;
    END IF;
    v_snapshot := pg_catalog.jsonb_build_object('conversationId', v_conv.id, 'listingId', v_listing_id,
      'reporterId', v_user, 'targetUserId', v_target_user, 'reportedMessageId', v_message_id, 'messages', v_messages);

    IF COALESCE(p_block_counterpart, false) THEN
      INSERT INTO public.user_blocks(blocker_id, blocked_id, reason)
      VALUES (v_user, v_target_user, 'Blocked when submitting abuse report')
      ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
      v_blocked := true;
    END IF;
  ELSE
    IF p_listing_id IS NULL THEN
      RAISE EXCEPTION 'listing required' USING ERRCODE = '22023';
    END IF;
    SELECT true, p.landlord_id, p.title, p.status INTO v_found, v_target_user, v_title, v_status
      FROM public.properties p WHERE p.id = p_listing_id;
    IF NOT COALESCE(v_found, false) THEN
      SELECT true, l.owner_id, l.title, l.status INTO v_found, v_target_user, v_title, v_status
        FROM public.listings l WHERE l.id = p_listing_id;
    END IF;
    IF NOT COALESCE(v_found, false) THEN
      RAISE EXCEPTION 'listing not found' USING ERRCODE = '22023';
    END IF;
    IF v_target_user = v_user THEN
      RAISE EXCEPTION 'cannot report own listing' USING ERRCODE = '42501';
    END IF;
    v_snapshot := pg_catalog.jsonb_build_object('listingId', p_listing_id, 'reporterId', v_user, 'targetUserId', v_target_user,
      'listing', pg_catalog.jsonb_build_object('id', p_listing_id, 'title', v_title, 'status', v_status));
  END IF;

  INSERT INTO public.abuse_reports(operation_id, reporter_id, target_type, target_user_id, conversation_id, message_id,
    listing_id, category, details, evidence_snapshot)
  VALUES (p_operation_id, v_user, p_target_type, v_target_user, v_conversation_id, v_message_id,
    v_listing_id, p_category, v_details, v_snapshot)
  RETURNING id INTO v_report_id;

  RETURN pg_catalog.jsonb_build_object('reportId', v_report_id, 'status', 'open', 'blocked', v_blocked, 'replayed', false);
END;
$$;

CREATE FUNCTION public.admin_list_abuse_reports(p_status text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('open', 'in_review', 'resolved', 'dismissed', 'all') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
  END IF;
  -- No evidence_snapshot here: private chat evidence requires admin_get_abuse_report_detail (audited).
  SELECT COALESCE(pg_catalog.jsonb_agg(public._abuse_report_json(t.id, false) ORDER BY t.created_at DESC, t.id ASC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT r.id, r.created_at FROM public.abuse_reports r
    WHERE p_status IS NULL OR p_status = 'all' OR r.status = p_status
    ORDER BY r.created_at DESC, r.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100) OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) t;
  RETURN v_result;
END;
$$;

CREATE FUNCTION public.admin_get_abuse_report_detail(p_report_id uuid, p_operation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_audit public.admin_audit_logs%ROWTYPE;
  v_status text;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_report_id IS NULL OR p_operation_id IS NULL THEN
    RAISE EXCEPTION 'invalid report request' USING ERRCODE = '22023';
  END IF;
  SELECT r.status INTO v_status FROM public.abuse_reports r WHERE r.id = p_report_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'report not found' USING ERRCODE = '22023'; END IF;

  SELECT * INTO v_audit FROM public.admin_audit_logs WHERE admin_id = v_admin AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_audit.target_id IS DISTINCT FROM p_report_id OR v_audit.action_type IS DISTINCT FROM 'report_evidence_viewed' THEN
      RAISE EXCEPTION 'operation already used for different change' USING ERRCODE = '23505';
    END IF;
  ELSE
    INSERT INTO public.admin_audit_logs(operation_id, admin_id, action_type, target_type, target_id, previous_state, new_state, reason)
    VALUES (p_operation_id, v_admin, 'report_evidence_viewed', 'report', p_report_id,
      pg_catalog.jsonb_build_object('status', v_status), pg_catalog.jsonb_build_object('status', v_status),
      'Inspected abuse report evidence snapshot');
  END IF;
  RETURN public._abuse_report_json(p_report_id, true);
END;
$$;

CREATE FUNCTION public.admin_resolve_abuse_report(
  p_report_id uuid, p_operation_id uuid, p_decision text, p_resolution_note text,
  p_suspend_target_user boolean DEFAULT false, p_unpublish_target_listing boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_audit public.admin_audit_logs%ROWTYPE;
  v_report public.abuse_reports%ROWTYPE;
  v_action text;
  v_count integer;
  v_user_suspended boolean := false;
  v_listing_unpublished boolean := false;
  v_result jsonb;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_report_id IS NULL OR p_operation_id IS NULL OR p_decision IS NULL OR p_decision NOT IN ('resolved', 'dismissed')
    OR length(pg_catalog.btrim(COALESCE(p_resolution_note, ''))) NOT BETWEEN 5 AND 1000 THEN
    RAISE EXCEPTION 'invalid report resolution' USING ERRCODE = '22023';
  END IF;
  v_action := CASE WHEN p_decision = 'resolved' THEN 'report_resolved' ELSE 'report_dismissed' END;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('abuse-report-resolve:' || p_report_id::text, 0));
  SELECT * INTO v_audit FROM public.admin_audit_logs WHERE admin_id = v_admin AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_audit.target_id IS DISTINCT FROM p_report_id OR v_audit.action_type IS DISTINCT FROM v_action THEN
      RAISE EXCEPTION 'operation already used for different change' USING ERRCODE = '23505';
    END IF;
    RETURN v_audit.new_state;
  END IF;

  SELECT * INTO v_report FROM public.abuse_reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'report not found' USING ERRCODE = '22023'; END IF;
  IF v_report.status IN ('resolved', 'dismissed') THEN
    RAISE EXCEPTION 'report already closed' USING ERRCODE = '40001';
  END IF;

  UPDATE public.abuse_reports
    SET status = p_decision, resolution_note = pg_catalog.btrim(p_resolution_note), resolved_by = v_admin,
        resolved_at = pg_catalog.now(), updated_at = pg_catalog.now()
    WHERE id = p_report_id;

  -- Unpublish the reported listing first so the flag is accurate when suspension would archive it anyway.
  IF p_decision = 'resolved' AND COALESCE(p_unpublish_target_listing, false) AND v_report.listing_id IS NOT NULL THEN
    UPDATE public.properties
      SET status = 'archived', moderation_note = pg_catalog.btrim(p_resolution_note), updated_at = pg_catalog.now()
      WHERE id = v_report.listing_id AND status IN ('approved', 'pending');
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_listing_unpublished := v_count > 0;
    UPDATE public.listings SET status = 'archived', updated_at = pg_catalog.now()
      WHERE id = v_report.listing_id AND status <> 'archived';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_listing_unpublished := v_listing_unpublished OR v_count > 0;
  END IF;

  IF p_decision = 'resolved' AND COALESCE(p_suspend_target_user, false) AND v_report.target_user_id IS NOT NULL THEN
    UPDATE public.profiles SET is_suspended = true, updated_at = pg_catalog.now()
      WHERE id = v_report.target_user_id AND role <> 'admin' AND NOT is_suspended;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_user_suspended := v_count > 0;
    IF v_user_suspended THEN
      UPDATE public.properties
        SET status = 'archived', moderation_note = 'Archived due to landlord account suspension', updated_at = pg_catalog.now()
        WHERE landlord_id = v_report.target_user_id AND status IN ('approved', 'pending');
    END IF;
  END IF;

  v_result := pg_catalog.jsonb_build_object('reportId', p_report_id, 'status', p_decision,
    'userSuspended', v_user_suspended, 'listingUnpublished', v_listing_unpublished);
  INSERT INTO public.admin_audit_logs(operation_id, admin_id, action_type, target_type, target_id, previous_state, new_state, reason)
  VALUES (p_operation_id, v_admin, v_action, 'report', p_report_id,
    pg_catalog.jsonb_build_object('status', v_report.status), v_result, pg_catalog.btrim(p_resolution_note));
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public._abuse_report_json(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_abuse_report(uuid, text, uuid, uuid, uuid, text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_list_abuse_reports(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_get_abuse_report_detail(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_resolve_abuse_report(uuid, uuid, text, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_abuse_report(uuid, text, uuid, uuid, uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_abuse_reports(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_abuse_report_detail(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_abuse_report(uuid, uuid, text, text, boolean, boolean) TO authenticated;

COMMIT;
