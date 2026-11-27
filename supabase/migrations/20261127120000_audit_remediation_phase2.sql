-- Phase 2 Audit Remediation Migration:
-- 1. Add verifier_dashboard_overview() RPC for uncapped verification dashboard counts + top 5 pending items
-- 2. Allow 'awaiting_landlord' and 'escalated' statuses in admin_list_support_tickets and admin_update_support_ticket
-- 3. Enforce 50-conversation limit on assistant_conversations via BEFORE INSERT trigger

-- ---------------------------------------------------------------------------
-- 1. Field verification dashboard overview RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verifier_dashboard_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_pending_count integer := 0;
  v_verified_count integer := 0;
  v_flagged_count integer := 0;
  v_latest_pending jsonb := '[]'::jsonb;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_actor
      AND p.role::text IN ('verification_officer', 'admin')
      AND NOT p.is_suspended
  ) THEN
    RAISE EXCEPTION 'active verifier or admin required' USING ERRCODE = '42501';
  END IF;

  SELECT
    count(*) FILTER (WHERE s.field_verification_status = 'pending_verification')::int,
    count(*) FILTER (WHERE s.field_verification_status = 'verified')::int,
    count(*) FILTER (WHERE s.field_verification_status = 'flagged')::int
  INTO v_pending_count, v_verified_count, v_flagged_count
  FROM public.properties p
  JOIN LATERAL (
    SELECT s.*
    FROM public.property_submissions s
    WHERE s.property_id = p.id
      AND s.superseded_by IS NULL
      AND s.review_status = 'pending'
    ORDER BY s.created_at DESC
    LIMIT 1
  ) s ON true;

  SELECT COALESCE(
    pg_catalog.jsonb_agg(t.j ORDER BY t.submission_created_at DESC, t.id ASC),
    '[]'::jsonb
  )
  INTO v_latest_pending
  FROM (
    SELECT
      s.created_at AS submission_created_at,
      p.id,
      pg_catalog.jsonb_build_object(
        'id', p.id,
        'title', CASE
          WHEN p.status = 'approved' THEN COALESCE(NULLIF(s.snapshot_payload->'property'->>'title', ''), p.title)
          ELSE p.title
        END,
        'fieldVerificationStatus', s.field_verification_status,
        'landlordId', p.landlord_id,
        'landlordName', owner.full_name,
        'landlordPhone', owner.phone_number
      ) AS j
    FROM public.properties p
    JOIN public.profiles owner ON owner.id = p.landlord_id
    JOIN LATERAL (
      SELECT s.*
      FROM public.property_submissions s
      WHERE s.property_id = p.id
        AND s.superseded_by IS NULL
        AND s.review_status = 'pending'
      ORDER BY s.created_at DESC
      LIMIT 1
    ) s ON true
    WHERE s.field_verification_status = 'pending_verification'
    ORDER BY s.created_at DESC, p.id ASC
    LIMIT 5
  ) t;

  RETURN pg_catalog.jsonb_build_object(
    'pendingCount', v_pending_count,
    'verifiedCount', v_verified_count,
    'flaggedCount', v_flagged_count,
    'latestPending', v_latest_pending
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verifier_dashboard_overview() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verifier_dashboard_overview() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Admin support ticket RPCs: allow 'awaiting_landlord' and 'escalated'
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_support_tickets(
  p_status text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_ticket_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_search text := lower(NULLIF(pg_catalog.btrim(p_search), ''));
  v_total integer := 0;
  v_tickets jsonb;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('open', 'in_progress', 'awaiting_landlord', 'escalated', 'resolved', 'closed', 'all') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
  END IF;
  IF p_category IS NOT NULL AND p_category NOT IN (
    'all', 'account_access', 'rental_search', 'listing_submission',
    'messaging_safety', 'bug_report', 'billing_or_policy', 'other'
  ) THEN
    RAISE EXCEPTION 'invalid category' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::int INTO v_total
  FROM public.support_tickets st
  WHERE (p_ticket_id IS NULL OR st.id = p_ticket_id)
    AND (p_status IS NULL OR p_status = 'all' OR st.status = p_status)
    AND (p_category IS NULL OR p_category = 'all' OR st.category = p_category)
    AND (v_search IS NULL OR pg_catalog.strpos(lower(st.ticket_number || ' ' || st.requester_name || ' ' || st.requester_email || ' ' || st.subject || ' ' || st.description), v_search) > 0);

  SELECT COALESCE(pg_catalog.jsonb_agg(t.j ORDER BY t.created_at DESC, t.id ASC), '[]'::jsonb)
  INTO v_tickets
  FROM (
    SELECT st.created_at, st.id, pg_catalog.jsonb_build_object(
      'id', st.id,
      'ticketNumber', st.ticket_number,
      'userId', st.user_id,
      'requesterName', st.requester_name,
      'requesterEmail', st.requester_email,
      'requesterRole', st.requester_role,
      'category', st.category,
      'subject', st.subject,
      'description', st.description,
      'relatedListingId', st.related_listing_id,
      'attachments', st.attachments,
      'status', st.status,
      'priority', st.priority,
      'adminResponse', st.admin_response,
      'assignedAdminId', st.assigned_admin_id,
      'assignedAdminName', ap.full_name,
      'resolvedAt', st.resolved_at,
      'createdAt', st.created_at,
      'updatedAt', st.updated_at
    ) AS j
    FROM public.support_tickets st
    LEFT JOIN public.profiles ap ON ap.id = st.assigned_admin_id
    WHERE (p_ticket_id IS NULL OR st.id = p_ticket_id)
      AND (p_status IS NULL OR p_status = 'all' OR st.status = p_status)
      AND (p_category IS NULL OR p_category = 'all' OR st.category = p_category)
      AND (v_search IS NULL OR pg_catalog.strpos(lower(st.ticket_number || ' ' || st.requester_name || ' ' || st.requester_email || ' ' || st.subject || ' ' || st.description), v_search) > 0)
    ORDER BY st.created_at DESC, st.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) t;

  RETURN pg_catalog.jsonb_build_object('tickets', v_tickets, 'total', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_support_tickets(text, text, text, integer, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_support_tickets(text, text, text, integer, integer, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_update_support_ticket(
  p_ticket_id uuid,
  p_operation_id uuid,
  p_status text,
  p_priority text DEFAULT NULL,
  p_admin_response text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_expected_updated_at timestamptz DEFAULT NULL,
  p_clear_response boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_audit public.admin_audit_logs%ROWTYPE;
  v_ticket public.support_tickets%ROWTYPE;
  v_next_priority text;
  v_response text := NULLIF(pg_catalog.btrim(COALESCE(p_admin_response, '')), '');
  v_next_response text;
  v_reason text := NULLIF(pg_catalog.btrim(COALESCE(p_reason, '')), '');
  v_resolved_at timestamptz;
  v_now timestamptz := pg_catalog.now();
  v_result jsonb;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_ticket_id IS NULL OR p_operation_id IS NULL
     OR p_status IS NULL OR p_status NOT IN ('open', 'in_progress', 'awaiting_landlord', 'escalated', 'resolved', 'closed')
     OR (p_priority IS NOT NULL AND p_priority NOT IN ('low', 'normal', 'high', 'urgent'))
     OR (v_response IS NOT NULL AND length(v_response) > 2000) THEN
    RAISE EXCEPTION 'invalid support ticket update' USING ERRCODE = '22023';
  END IF;

  v_reason := COALESCE(v_reason, v_response, 'Updated ticket status to ' || p_status);
  IF length(v_reason) > 1000 THEN
    v_reason := pg_catalog.left(v_reason, 1000);
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('support-ticket-update:' || p_ticket_id::text, 0));

  SELECT * INTO v_audit FROM public.admin_audit_logs WHERE admin_id = v_admin AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_audit.target_id IS DISTINCT FROM p_ticket_id OR v_audit.action_type IS DISTINCT FROM 'support_ticket_updated' THEN
      RAISE EXCEPTION 'operation already used for different change' USING ERRCODE = '23505';
    END IF;
    RETURN v_audit.new_state;
  END IF;

  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'support ticket not found' USING ERRCODE = '22023';
  END IF;

  IF p_expected_updated_at IS NOT NULL
     AND pg_catalog.date_trunc('milliseconds', v_ticket.updated_at) <> pg_catalog.date_trunc('milliseconds', p_expected_updated_at) THEN
    RAISE EXCEPTION 'support ticket changed concurrently' USING ERRCODE = '40001';
  END IF;

  v_next_priority := COALESCE(p_priority, v_ticket.priority);
  v_next_response := CASE
    WHEN COALESCE(p_clear_response, false) THEN NULL
    WHEN v_response IS NOT NULL THEN v_response
    ELSE v_ticket.admin_response
  END;
  v_resolved_at := CASE
    WHEN p_status IN ('resolved', 'closed') THEN COALESCE(v_ticket.resolved_at, v_now)
    ELSE NULL
  END;

  UPDATE public.support_tickets
  SET
    status = p_status,
    priority = v_next_priority,
    admin_response = v_next_response,
    assigned_admin_id = v_admin,
    resolved_at = v_resolved_at,
    updated_at = v_now
  WHERE id = p_ticket_id;

  v_result := pg_catalog.jsonb_build_object(
    'ticketId', p_ticket_id,
    'ticketNumber', v_ticket.ticket_number,
    'status', p_status,
    'priority', v_next_priority,
    'adminResponse', v_next_response,
    'resolvedAt', v_resolved_at,
    'updatedAt', v_now
  );

  INSERT INTO public.admin_audit_logs (
    operation_id, admin_id, action_type, target_type, target_id, previous_state, new_state, reason
  )
  VALUES (
    p_operation_id,
    v_admin,
    'support_ticket_updated',
    'support_ticket',
    p_ticket_id,
    pg_catalog.jsonb_build_object('status', v_ticket.status, 'priority', v_ticket.priority, 'adminResponse', v_ticket.admin_response),
    v_result,
    v_reason
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_support_ticket(uuid, uuid, text, text, text, text, timestamptz, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_support_ticket(uuid, uuid, text, text, text, text, timestamptz, boolean) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Enforce 50-conversation cap on assistant_conversations
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_assistant_conversation_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('assistant-conv:' || NEW.user_id::text, 0)
  );

  IF (SELECT count(*) FROM public.assistant_conversations WHERE user_id = NEW.user_id) >= 50 THEN
    RAISE EXCEPTION 'assistant conversation limit reached' USING ERRCODE = '54000';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_assistant_conversation_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS assistant_conversations_enforce_limit ON public.assistant_conversations;
CREATE TRIGGER assistant_conversations_enforce_limit
  BEFORE INSERT ON public.assistant_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_assistant_conversation_limit();
