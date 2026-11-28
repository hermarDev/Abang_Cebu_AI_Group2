-- Phase 3 Audit Remediation Migration

-- ---------------------------------------------------------------------------
-- Finding #2: Ensure finder_profile_read and finder_profile_update policies exist
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS finder_profile_read ON public.profiles;
CREATE POLICY finder_profile_read ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS finder_profile_update ON public.profiles;
CREATE POLICY finder_profile_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() AND NOT is_suspended)
  WITH CHECK (id = auth.uid() AND NOT is_suspended);

-- ---------------------------------------------------------------------------
-- Finding #5: Escalated support ticket visibility, dashboard count, and admin notifications
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
LANGUAGE plpgsql STABLE
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
  LEFT JOIN public.profiles landlord ON landlord.id = st.reported_landlord_id
  WHERE (p_ticket_id IS NULL OR st.id = p_ticket_id)
    AND (p_status IS NULL OR p_status = 'all' OR st.status = p_status)
    AND (p_category IS NULL OR p_category = 'all' OR st.category = p_category)
    AND (v_search IS NULL OR pg_catalog.strpos(lower(st.ticket_number || ' ' || st.requester_name || ' ' || st.requester_email || ' ' || st.subject || ' ' || st.description || ' ' || COALESCE(landlord.full_name, '')), v_search) > 0);

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
      'reportedLandlordId', st.reported_landlord_id,
      'reportedLandlordName', landlord.full_name,
      'landlordInquiryNote', st.landlord_inquiry_note,
      'landlordInquirySentAt', st.landlord_inquiry_sent_at,
      'landlordResponse', st.landlord_response,
      'landlordRespondedAt', st.landlord_responded_at,
      'handledBySupportId', st.handled_by_support_id,
      'handledBySupportName', support_staff.full_name,
      'supportResolutionNote', st.support_resolution_note,
      'escalatedToAdminAt', st.escalated_to_admin_at,
      'escalationReason', st.escalation_reason,
      'recommendedAdminAction', st.recommended_admin_action,
      'adminResponse', st.admin_response,
      'assignedAdminId', st.assigned_admin_id,
      'assignedAdminName', ap.full_name,
      'resolvedAt', st.resolved_at,
      'createdAt', st.created_at,
      'updatedAt', st.updated_at
    ) AS j
    FROM public.support_tickets st
    LEFT JOIN public.profiles ap ON ap.id = st.assigned_admin_id
    LEFT JOIN public.profiles landlord ON landlord.id = st.reported_landlord_id
    LEFT JOIN public.profiles support_staff ON support_staff.id = st.handled_by_support_id
    WHERE (p_ticket_id IS NULL OR st.id = p_ticket_id)
      AND (p_status IS NULL OR p_status = 'all' OR st.status = p_status)
      AND (p_category IS NULL OR p_category = 'all' OR st.category = p_category)
      AND (v_search IS NULL OR pg_catalog.strpos(lower(st.ticket_number || ' ' || st.requester_name || ' ' || st.requester_email || ' ' || st.subject || ' ' || st.description || ' ' || COALESCE(landlord.full_name, '')), v_search) > 0)
    ORDER BY st.created_at DESC, st.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) t;

  RETURN pg_catalog.jsonb_build_object('tickets', v_tickets, 'total', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_support_tickets(text, text, text, integer, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_support_tickets(text, text, text, integer, integer, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_dashboard_overview()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_open_reports integer := 0;
  v_open_support integer := 0;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF pg_catalog.to_regclass('public.abuse_reports') IS NOT NULL THEN
    EXECUTE 'SELECT count(*)::int FROM public.abuse_reports WHERE status IN (''open'', ''in_review'')' INTO v_open_reports;
  END IF;
  IF pg_catalog.to_regclass('public.support_tickets') IS NOT NULL THEN
    EXECUTE 'SELECT count(*)::int FROM public.support_tickets WHERE status IN (''open'', ''in_progress'', ''awaiting_landlord'', ''escalated'')' INTO v_open_support;
  END IF;
  RETURN pg_catalog.jsonb_build_object(
    'pendingReviewCount', (SELECT count(*)::int FROM public.properties WHERE status = 'pending'),
    'approvedLiveCount', (SELECT count(*)::int FROM public.properties p WHERE p.status = 'approved'
      AND EXISTS (SELECT 1 FROM public.rental_units u WHERE u.property_id = p.id AND u.is_available = true)),
    'changesRequestedCount', (SELECT count(*)::int FROM public.properties WHERE status = 'rejected'),
    'archivedListingCount', (SELECT count(*)::int FROM public.properties WHERE status = 'archived'),
    'activeRenterCount', (SELECT count(*)::int FROM public.profiles WHERE role = 'renter' AND NOT is_suspended),
    'activeLandlordCount', (SELECT count(*)::int FROM public.profiles WHERE role = 'landlord' AND NOT is_suspended),
    'suspendedAccountCount', (SELECT count(*)::int FROM public.profiles WHERE is_suspended = true),
    'openReportCount', v_open_reports,
    'openSupportTicketCount', v_open_support,
    'recentAuditEntries', public.admin_list_audit_logs(NULL, 10, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_overview() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.support_desk_act_on_ticket(
  p_ticket_id uuid, p_operation_id uuid, p_action text, p_note text,
  p_reported_landlord_id uuid DEFAULT NULL, p_recommended_admin_action text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_ticket public.support_tickets%ROWTYPE;
  v_trimmed_note text := pg_catalog.btrim(COALESCE(p_note, ''));
  v_op public.support_ticket_operations%ROWTYPE;
  v_landlord_id uuid;
  v_res jsonb;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND p.role::text IN ('customer_support','admin') AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active support or admin required' USING ERRCODE = '42501';
  END IF;
  IF p_ticket_id IS NULL OR p_operation_id IS NULL OR p_action IS NULL
     OR p_action NOT IN ('request_landlord_response', 'resolve', 'escalate_to_admin')
     OR length(v_trimmed_note) < 5 THEN
    RAISE EXCEPTION 'invalid support desk action parameters' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('support-desk-act:' || v_actor::text || ':' || p_operation_id::text, 0));

  SELECT * INTO v_op FROM public.support_ticket_operations WHERE actor_id = v_actor AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_op.ticket_id <> p_ticket_id OR v_op.action IS DISTINCT FROM p_action THEN
      RAISE EXCEPTION 'operation id already used for a different ticket or action' USING ERRCODE = '23505';
    END IF;
    RETURN v_op.response_payload || pg_catalog.jsonb_build_object('replayed', true);
  END IF;

  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'support ticket not found' USING ERRCODE = 'P0002'; END IF;

  IF p_action = 'request_landlord_response' AND v_ticket.status NOT IN ('open', 'in_progress') THEN
    RAISE EXCEPTION 'invalid status transition for request_landlord_response' USING ERRCODE = '22023';
  ELSIF p_action = 'resolve' AND v_ticket.status NOT IN ('open', 'in_progress', 'awaiting_landlord') THEN
    RAISE EXCEPTION 'invalid status transition for resolve' USING ERRCODE = '22023';
  ELSIF p_action = 'escalate_to_admin' AND v_ticket.status NOT IN ('open', 'in_progress', 'awaiting_landlord') THEN
    RAISE EXCEPTION 'invalid status transition for escalate_to_admin' USING ERRCODE = '22023';
  END IF;

  IF p_action = 'request_landlord_response' THEN
    v_landlord_id := COALESCE(p_reported_landlord_id, v_ticket.reported_landlord_id);
    IF v_landlord_id IS NULL THEN
      RAISE EXCEPTION 'reported landlord required to request response' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_landlord_id AND p.role = 'landlord' AND NOT p.is_suspended) THEN
      RAISE EXCEPTION 'reported landlord must be an active landlord profile' USING ERRCODE = '22023';
    END IF;

    UPDATE public.support_tickets SET
      status = 'awaiting_landlord',
      reported_landlord_id = v_landlord_id,
      landlord_inquiry_note = v_trimmed_note,
      landlord_inquiry_sent_at = pg_catalog.now(),
      handled_by_support_id = v_actor,
      updated_at = pg_catalog.now()
    WHERE id = p_ticket_id;

    INSERT INTO public.notifications (recipient_id, actor_id, type, title, body, link, entity_type, entity_id)
    VALUES (
      v_landlord_id,
      v_actor,
      'report',
      'Customer Support Inquiry',
      'Support inquiry regarding ticket: ' || left(v_trimmed_note, 100),
      '/support',
      'report',
      p_ticket_id
    );

  ELSIF p_action = 'resolve' THEN
    UPDATE public.support_tickets SET
      status = 'resolved',
      support_resolution_note = v_trimmed_note,
      handled_by_support_id = v_actor,
      resolved_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
    WHERE id = p_ticket_id;

  ELSIF p_action = 'escalate_to_admin' THEN
    IF p_recommended_admin_action IS NOT NULL AND p_recommended_admin_action NOT IN ('suspend_account','unpublish_listing','both','review') THEN
      RAISE EXCEPTION 'invalid recommended admin action' USING ERRCODE = '22023';
    END IF;
    UPDATE public.support_tickets SET
      status = 'escalated',
      escalation_reason = v_trimmed_note,
      escalated_to_admin_at = pg_catalog.now(),
      recommended_admin_action = p_recommended_admin_action,
      handled_by_support_id = v_actor,
      updated_at = pg_catalog.now()
    WHERE id = p_ticket_id;

    INSERT INTO public.notifications (recipient_id, actor_id, type, title, body, link, entity_type, entity_id)
    SELECT
      p.id,
      v_actor,
      'support',
      'Escalated Support Ticket',
      'Ticket escalated to admin: ' || pg_catalog.left(v_trimmed_note, 120),
      '/admin/support?ticket=' || p_ticket_id::text,
      'support_ticket',
      p_ticket_id
    FROM public.profiles p
    WHERE p.role = 'admin'
      AND NOT p.is_suspended;
  END IF;

  v_res := pg_catalog.jsonb_build_object('ticketId', p_ticket_id, 'action', p_action, 'success', true);
  INSERT INTO public.support_ticket_operations (ticket_id, actor_id, operation_id, action, response_payload)
  VALUES (p_ticket_id, v_actor, p_operation_id, p_action, v_res);

  RETURN v_res;
END;
$$;
REVOKE ALL ON FUNCTION public.support_desk_act_on_ticket(uuid,uuid,text,text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.support_desk_act_on_ticket(uuid,uuid,text,text,uuid,text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Finding #6: Landlord suspension archives public.listings & verifier queue filters archived/suspended
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_account_suspension(
  p_target_user_id uuid,
  p_operation_id uuid,
  p_suspend boolean,
  p_reason text,
  p_unpublish_listings boolean DEFAULT true
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_audit public.admin_audit_logs%ROWTYPE;
  v_action text;
  v_role text;
  v_was_suspended boolean;
  v_unpublished_properties integer := 0;
  v_unpublished_listings integer := 0;
  v_unpublished integer := 0;
  v_result jsonb;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_target_user_id IS NULL OR p_operation_id IS NULL OR p_suspend IS NULL
    OR length(btrim(COALESCE(p_reason, ''))) NOT BETWEEN 5 AND 1000 THEN
    RAISE EXCEPTION 'invalid suspension change' USING ERRCODE = '22023';
  END IF;
  IF p_target_user_id = v_admin THEN
    RAISE EXCEPTION 'cannot change own account suspension' USING ERRCODE = '42501';
  END IF;
  v_action := CASE WHEN p_suspend THEN 'account_suspended' ELSE 'account_reinstated' END;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('account-moderation:' || p_target_user_id::text, 0));
  SELECT * INTO v_audit FROM public.admin_audit_logs WHERE admin_id = v_admin AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_audit.target_id IS DISTINCT FROM p_target_user_id OR v_audit.action_type IS DISTINCT FROM v_action THEN
      RAISE EXCEPTION 'operation already used for different change' USING ERRCODE = '23505';
    END IF;
    RETURN v_audit.new_state;
  END IF;
  SELECT pr.role::text, pr.is_suspended INTO v_role, v_was_suspended
  FROM public.profiles pr WHERE pr.id = p_target_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found' USING ERRCODE = '22023'; END IF;
  IF v_role = 'admin' THEN
    RAISE EXCEPTION 'cannot change another admin account' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles SET is_suspended = p_suspend, updated_at = pg_catalog.now() WHERE id = p_target_user_id;
  IF p_suspend AND COALESCE(p_unpublish_listings, true) THEN
    UPDATE public.properties
      SET status = 'archived', moderation_note = 'Archived due to landlord account suspension', updated_at = pg_catalog.now()
      WHERE landlord_id = p_target_user_id AND status IN ('approved', 'pending');
    GET DIAGNOSTICS v_unpublished_properties = ROW_COUNT;

    UPDATE public.listings
      SET status = 'archived', is_available = false, published_at = NULL, updated_at = pg_catalog.now()
      WHERE owner_id = p_target_user_id AND status = 'published';
    GET DIAGNOSTICS v_unpublished_listings = ROW_COUNT;

    v_unpublished := v_unpublished_properties + v_unpublished_listings;
  END IF;
  v_result := pg_catalog.jsonb_build_object('userId', p_target_user_id, 'isSuspended', p_suspend, 'unpublishedCount', v_unpublished);
  INSERT INTO public.admin_audit_logs(operation_id, admin_id, action_type, target_type, target_id, previous_state, new_state, reason)
  VALUES (p_operation_id, v_admin, v_action, 'account', p_target_user_id,
    pg_catalog.jsonb_build_object('isSuspended', v_was_suspended), v_result, btrim(p_reason));
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_account_suspension(uuid, uuid, boolean, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_account_suspension(uuid, uuid, boolean, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.verifier_list_queue(
  p_status text DEFAULT NULL, p_search text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_search text := lower(NULLIF(btrim(p_search), ''));
  v_result jsonb;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND p.role::text IN ('verification_officer','admin') AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active verifier or admin required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(pg_catalog.jsonb_agg(t.j ORDER BY t.submission_created_at DESC, t.id ASC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT s.created_at AS submission_created_at, p.id, pg_catalog.jsonb_build_object(
      'id', p.id,
      'title', CASE WHEN p.status = 'approved' THEN COALESCE(NULLIF(s.snapshot_payload->'property'->>'title', ''), p.title) ELSE p.title END,
      'description', CASE WHEN p.status = 'approved' THEN COALESCE(NULLIF(s.snapshot_payload->'property'->>'description', ''), p.description) ELSE p.description END,
      'propertyType', CASE WHEN p.status = 'approved' THEN COALESCE(NULLIF(s.snapshot_payload->'property'->>'property_type', ''), p.property_type) ELSE p.property_type END,
      'publishedTitle', p.title,
      'publishedDescription', p.description,
      'publishedPropertyType', p.property_type,
      'isPendingRevision', (p.status = 'approved' AND s.review_status = 'pending'),
      'proposedUnit', CASE WHEN p.status = 'approved' THEN s.snapshot_payload->'unit' ELSE NULL END,
      'proposedUnits', CASE WHEN p.status = 'approved' THEN s.snapshot_payload->'units' ELSE NULL END,
      'displaySource', CASE WHEN p.status = 'approved' THEN 'pending_revision_snapshot' ELSE 'live_submission' END,
      'streetAddress', p.street_address,
      'barangay', p.barangay,
      'city', p.city,
      'latitude', p.latitude,
      'longitude', p.longitude,
      'landlordId', p.landlord_id,
      'landlordName', owner.full_name,
      'landlordPhone', owner.phone_number,
      'submissionDraftId', s.draft_id,
      'submissionExpectedRevision', s.expected_revision,
      'submissionOperationId', s.operation_id,
      'submissionCreatedAt', s.created_at,
      'reviewStatus', s.review_status,
      'fieldVerificationStatus', s.field_verification_status,
      'fieldVerifiedBy', s.field_verified_by,
      'fieldVerifiedAt', s.field_verified_at,
      'fieldVerificationMethod', s.field_verification_method,
      'fieldVerificationNotes', s.field_verification_notes,
      'fieldVerificationProof', s.field_verification_proof,
      'fieldVerificationProxyName', s.field_verification_proxy_name,
      'fieldVerificationProxyRelationship', s.field_verification_proxy_relationship
    ) AS j
    FROM public.properties p
    JOIN public.profiles owner ON owner.id = p.landlord_id
    JOIN LATERAL (
      SELECT s.* FROM public.property_submissions s
      WHERE s.property_id = p.id AND s.superseded_by IS NULL AND s.review_status = 'pending'
      ORDER BY s.created_at DESC LIMIT 1
    ) s ON true
    WHERE p.status IN ('pending', 'approved')
      AND NOT owner.is_suspended
      AND (p_status IS NULL OR p_status = 'all' OR s.field_verification_status = p_status)
      AND (v_search IS NULL OR pg_catalog.strpos(lower(
        CASE WHEN p.status = 'approved' THEN COALESCE(NULLIF(s.snapshot_payload->'property'->>'title', ''), p.title) ELSE p.title END
        || ' ' || p.street_address || ' ' || p.barangay || ' ' || p.city || ' ' || COALESCE(owner.full_name, '')
      ), v_search) > 0)
    ORDER BY s.created_at DESC, p.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100) OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) t;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.verifier_list_queue(text,text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verifier_list_queue(text,text,integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.verifier_dashboard_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
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
  WHERE p.status IN ('pending', 'approved')
    AND NOT owner.is_suspended;

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
    WHERE p.status IN ('pending', 'approved')
      AND NOT owner.is_suspended
      AND s.field_verification_status = 'pending_verification'
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

CREATE OR REPLACE FUNCTION public.verifier_get_queue_property(p_property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_actor
      AND p.role::text IN ('verification_officer', 'admin')
      AND NOT p.is_suspended
  ) THEN
    RAISE EXCEPTION 'active verifier or admin required' USING ERRCODE = '42501';
  END IF;

  SELECT pg_catalog.jsonb_build_object(
    'id', p.id,
    'title', CASE WHEN p.status = 'approved' THEN COALESCE(NULLIF(s.snapshot_payload->'property'->>'title', ''), NULLIF(s.snapshot_payload->'property'->>'name', ''), p.title) ELSE p.title END,
    'description', CASE WHEN p.status = 'approved' THEN COALESCE(NULLIF(s.snapshot_payload->'property'->>'description', ''), p.description) ELSE p.description END,
    'propertyType', CASE WHEN p.status = 'approved' THEN COALESCE(NULLIF(s.snapshot_payload->'property'->>'property_type', ''), NULLIF(s.snapshot_payload->'property'->>'propertyType', ''), p.property_type) ELSE p.property_type END,
    'publishedTitle', p.title,
    'publishedDescription', p.description,
    'publishedPropertyType', p.property_type,
    'isPendingRevision', (p.status = 'approved' AND s.review_status = 'pending'),
    'proposedUnit', CASE WHEN p.status = 'approved' THEN s.snapshot_payload->'unit' ELSE NULL END,
    'proposedUnits', CASE WHEN p.status = 'approved' THEN s.snapshot_payload->'units' ELSE NULL END,
    'displaySource', CASE WHEN p.status = 'approved' THEN 'pending_revision_snapshot' ELSE 'live_submission' END,
    'streetAddress', p.street_address,
    'barangay', p.barangay,
    'city', p.city,
    'latitude', p.latitude,
    'longitude', p.longitude,
    'landlordId', p.landlord_id,
    'landlordName', owner.full_name,
    'landlordPhone', owner.phone_number,
    'submissionDraftId', s.draft_id,
    'submissionExpectedRevision', s.expected_revision,
    'submissionOperationId', s.operation_id,
    'submissionCreatedAt', s.created_at,
    'reviewStatus', s.review_status,
    'fieldVerificationStatus', s.field_verification_status,
    'fieldVerifiedBy', s.field_verified_by,
    'fieldVerifiedAt', s.field_verified_at,
    'fieldVerificationMethod', s.field_verification_method,
    'fieldVerificationNotes', s.field_verification_notes,
    'fieldVerificationProof', s.field_verification_proof,
    'fieldVerificationProxyName', s.field_verification_proxy_name,
    'fieldVerificationProxyRelationship', s.field_verification_proxy_relationship
  ) INTO v_result
  FROM public.properties p
  JOIN public.profiles owner ON owner.id = p.landlord_id
  JOIN LATERAL (
    SELECT s.* FROM public.property_submissions s
    WHERE s.property_id = p.id AND s.superseded_by IS NULL AND s.review_status = 'pending'
    ORDER BY s.created_at DESC LIMIT 1
  ) s ON true
  WHERE p.id = p_property_id
    AND p.status IN ('pending', 'approved')
    AND NOT owner.is_suspended;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.verifier_get_queue_property(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verifier_get_queue_property(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.verifier_submit_verification(
  p_property_id uuid, p_operation_id uuid, p_submission_draft_id uuid, p_submission_expected_revision bigint,
  p_status text, p_method text, p_notes text, p_proof jsonb DEFAULT '[]'::jsonb,
  p_proxy_name text DEFAULT NULL, p_proxy_relationship text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_submission public.property_submissions%ROWTYPE;
  v_existing public.property_field_verifications%ROWTYPE;
  v_proof jsonb := COALESCE(p_proof, '[]'::jsonb);
  v_proxy_name text := NULLIF(pg_catalog.btrim(COALESCE(p_proxy_name, '')), '');
  v_proxy_relationship text := NULLIF(pg_catalog.btrim(COALESCE(p_proxy_relationship, '')), '');
  v_proof_elem jsonb;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND p.role::text IN ('verification_officer','admin') AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active verifier or admin required' USING ERRCODE = '42501';
  END IF;
  IF p_property_id IS NULL OR p_operation_id IS NULL OR p_submission_draft_id IS NULL OR p_submission_expected_revision IS NULL OR p_submission_expected_revision < 1
     OR p_status IS NULL OR p_status NOT IN ('verified','flagged') OR p_method IS NULL OR p_method <> 'site_visit'
     OR length(pg_catalog.btrim(COALESCE(p_notes,''))) NOT BETWEEN 5 AND 2000
     OR pg_catalog.jsonb_typeof(v_proof) <> 'array' OR pg_catalog.jsonb_array_length(v_proof) > 10 OR pg_catalog.octet_length(v_proof::text) > 32768
     OR ((v_proxy_name IS NOT NULL AND v_proxy_relationship IS NULL) OR (v_proxy_relationship IS NOT NULL AND v_proxy_name IS NULL)
         OR (v_proxy_name IS NOT NULL AND length(v_proxy_name) > 200) OR (v_proxy_relationship IS NOT NULL AND length(v_proxy_relationship) > 200)) THEN
    RAISE EXCEPTION 'invalid verification' USING ERRCODE = '22023';
  END IF;

  IF p_status = 'verified' AND pg_catalog.jsonb_array_length(v_proof) < 1 THEN
    RAISE EXCEPTION 'verification requires at least one proof item' USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.jsonb_array_length(v_proof) > 0 THEN
    FOR v_proof_elem IN SELECT * FROM pg_catalog.jsonb_array_elements(v_proof) LOOP
      IF pg_catalog.jsonb_typeof(v_proof_elem) <> 'object'
         OR v_proof_elem->>'kind' IS DISTINCT FROM 'proof'
         OR v_proof_elem->>'object_path' IS NULL
         OR v_proof_elem->>'object_path' !~ '^[0-9a-f-]+/[0-9a-f-]+/[0-9a-f-]+/[0-9a-f]{64}\.(jpg|png|webp|pdf)$'
         OR pg_catalog.split_part(v_proof_elem->>'object_path', '/', 2) <> p_property_id::text
         OR NOT EXISTS (
           SELECT 1 FROM storage.objects o
           WHERE o.bucket_id = 'field-verification-media' AND o.name = v_proof_elem->>'object_path'
         ) THEN
        RAISE EXCEPTION 'invalid verification proof object' USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('field-verification:' || v_actor::text || ':' || p_operation_id::text, 0));
  SELECT * INTO v_existing FROM public.property_field_verifications WHERE officer_id = v_actor AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_existing.property_id IS DISTINCT FROM p_property_id OR v_existing.draft_id IS DISTINCT FROM p_submission_draft_id
      OR v_existing.expected_revision IS DISTINCT FROM p_submission_expected_revision OR v_existing.status IS DISTINCT FROM p_status
      OR v_existing.method IS DISTINCT FROM p_method OR v_existing.notes IS DISTINCT FROM pg_catalog.btrim(p_notes)
      OR v_existing.proof IS DISTINCT FROM v_proof OR v_existing.proxy_name IS DISTINCT FROM v_proxy_name
      OR v_existing.proxy_relationship IS DISTINCT FROM v_proxy_relationship THEN
      RAISE EXCEPTION 'operation already used for different verification' USING ERRCODE = '23505';
    END IF;
    RETURN pg_catalog.jsonb_build_object('propertyId',p_property_id,'status',v_existing.status,'replayed',true);
  END IF;

  SELECT s.* INTO v_submission
    FROM public.property_submissions s
    JOIN public.properties p ON p.id = s.property_id
    JOIN public.profiles owner ON owner.id = p.landlord_id
    WHERE s.property_id = p_property_id AND s.draft_id = p_submission_draft_id AND s.expected_revision = p_submission_expected_revision
      AND s.superseded_by IS NULL AND s.review_status = 'pending'
      AND p.status IN ('pending', 'approved') AND NOT owner.is_suspended
    ORDER BY s.created_at DESC LIMIT 1 FOR UPDATE OF s;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission revision changed or unavailable' USING ERRCODE = '40001'; END IF;

  UPDATE public.property_submissions SET field_verification_status = p_status, field_verified_by = v_actor,
    field_verified_at = pg_catalog.now(), field_verification_method = p_method, field_verification_notes = pg_catalog.btrim(p_notes),
    field_verification_proof = v_proof, field_verification_proxy_name = v_proxy_name, field_verification_proxy_relationship = v_proxy_relationship
    WHERE owner_id = v_submission.owner_id AND operation_id = v_submission.operation_id;

  INSERT INTO public.property_field_verifications(officer_id,operation_id,submission_owner_id,submission_operation_id,property_id,draft_id,expected_revision,status,method,notes,proof,proxy_name,proxy_relationship)
    VALUES(v_actor,p_operation_id,v_submission.owner_id,v_submission.operation_id,p_property_id,p_submission_draft_id,p_submission_expected_revision,p_status,p_method,pg_catalog.btrim(p_notes),v_proof,v_proxy_name,v_proxy_relationship);

  INSERT INTO public.admin_audit_logs(admin_id, operation_id, target_type, target_id, action_type, previous_state, new_state, reason)
    VALUES (v_actor, p_operation_id, 'property', p_property_id,
      CASE WHEN p_status = 'verified' THEN 'property_field_verified' ELSE 'property_field_flagged' END,
      pg_catalog.jsonb_build_object('field_verification_status', v_submission.field_verification_status),
      pg_catalog.jsonb_build_object('field_verification_status', p_status, 'method', p_method, 'draft_id', p_submission_draft_id, 'revision', p_submission_expected_revision),
      CASE WHEN p_status = 'verified' THEN 'Field verification completed' ELSE 'Field verification flagged issues' END);

  RETURN pg_catalog.jsonb_build_object('propertyId',p_property_id,'status',p_status,'replayed',false);
END;
$$;

REVOKE ALL ON FUNCTION public.verifier_submit_verification(uuid,uuid,uuid,bigint,text,text,text,jsonb,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verifier_submit_verification(uuid,uuid,uuid,bigint,text,text,text,jsonb,text,text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Finding #11: Prevent duplicate rental agreements in an already-agreed conversation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_rental_agreement_consent(
  p_conversation_id uuid,
  p_operation_id uuid,
  p_agree boolean DEFAULT true,
  p_unit_id uuid DEFAULT NULL,
  p_expected_version integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_conv public.rental_conversations%ROWTYPE;
  v_agreement public.rental_agreements%ROWTYPE;
  v_unit public.rental_units%ROWTYPE;
  v_op public.rental_agreement_ops%ROWTYPE;
  v_unit_id uuid;
  v_property_id uuid;
  v_listing_id uuid;
  v_is_renter boolean;
  v_is_landlord boolean;
  v_new_status text;
  v_both_agreed boolean := false;
  v_new_version integer;
  v_renter_name text;
  v_unit_number text;
  v_result jsonb;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND NOT p.is_suspended
  ) THEN
    RAISE EXCEPTION 'active user account required' USING ERRCODE = '42501';
  END IF;
  IF p_conversation_id IS NULL OR p_operation_id IS NULL THEN
    RAISE EXCEPTION 'invalid agreement parameters' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('rental-agreement:' || p_conversation_id::text, 0));

  SELECT * INTO v_conv FROM public.rental_conversations WHERE id = p_conversation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'conversation not found' USING ERRCODE = 'P0002'; END IF;

  v_is_renter := (v_conv.renter_id = v_actor);
  v_is_landlord := (v_conv.landlord_id = v_actor);
  IF NOT v_is_renter AND NOT v_is_landlord THEN
    RAISE EXCEPTION 'not a participant in this conversation' USING ERRCODE = '42501';
  END IF;

  IF v_conv.listing_source = 'property' THEN
    v_property_id := v_conv.listing_id;
    v_listing_id := NULL;
  ELSE
    v_property_id := (SELECT property_id FROM public.listings WHERE id = v_conv.listing_id);
    v_listing_id := v_conv.listing_id;
  END IF;

  SELECT * INTO v_op FROM public.rental_agreement_ops
    WHERE actor_id = v_actor AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_op.conversation_id IS DISTINCT FROM p_conversation_id
       OR v_op.agree IS DISTINCT FROM p_agree
       OR v_op.requested_unit_id IS DISTINCT FROM p_unit_id THEN
      RAISE EXCEPTION 'operation already used for different agreement action' USING ERRCODE = '23505';
    END IF;
    RETURN v_op.result;
  END IF;

  IF p_expected_version IS NOT NULL AND v_conv.agreement_seq IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'agreement state changed; please refresh and try again' USING ERRCODE = '40001';
  END IF;

  IF p_agree AND EXISTS (
    SELECT 1 FROM public.rental_agreements
    WHERE conversation_id = p_conversation_id AND status = 'agreed'
  ) THEN
    RAISE EXCEPTION 'conversation already has an agreed rental' USING ERRCODE = '40001';
  END IF;

  SELECT * INTO v_agreement FROM public.rental_agreements
    WHERE conversation_id = p_conversation_id AND status NOT IN ('agreed', 'cancelled')
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF FOUND THEN
    v_unit_id := v_agreement.unit_id;
    IF p_unit_id IS NOT NULL AND p_unit_id IS DISTINCT FROM v_unit_id THEN
      UPDATE public.rental_agreements SET status = 'cancelled', updated_at = pg_catalog.now() WHERE id = v_agreement.id;
      v_agreement := NULL;
      v_unit_id := p_unit_id;
    END IF;
  ELSE
    v_unit_id := p_unit_id;
  END IF;

  v_new_version := v_conv.agreement_seq;

  IF p_agree THEN
    IF v_unit_id IS NULL THEN
      SELECT id INTO v_unit_id FROM public.rental_units
        WHERE property_id = v_property_id AND is_available = true AND NOT is_retired
        ORDER BY created_at ASC LIMIT 1;
      IF v_unit_id IS NULL THEN
        RAISE EXCEPTION 'no available units for this property' USING ERRCODE = '40001';
      END IF;
    END IF;

    SELECT * INTO v_unit FROM public.rental_units
      WHERE id = v_unit_id AND property_id = v_property_id AND is_available = true AND NOT is_retired
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'selected unit is no longer available' USING ERRCODE = '40001';
    END IF;

    IF v_agreement.id IS NULL THEN
      INSERT INTO public.rental_agreements(
        conversation_id, property_id, listing_id, unit_id, renter_id, landlord_id,
        renter_agreed_at, landlord_agreed_at, status, operation_id
      ) VALUES (
        p_conversation_id, v_property_id, v_listing_id, v_unit_id, v_conv.renter_id, v_conv.landlord_id,
        CASE WHEN v_is_renter THEN pg_catalog.now() ELSE NULL END,
        CASE WHEN v_is_landlord THEN pg_catalog.now() ELSE NULL END,
        CASE WHEN v_is_renter THEN 'renter_agreed' ELSE 'landlord_agreed' END,
        p_operation_id
      ) RETURNING * INTO v_agreement;
    ELSE
      IF v_is_renter THEN
        v_agreement.renter_agreed_at := pg_catalog.now();
      ELSE
        v_agreement.landlord_agreed_at := pg_catalog.now();
      END IF;

      IF v_agreement.renter_agreed_at IS NOT NULL AND v_agreement.landlord_agreed_at IS NOT NULL THEN
        v_new_status := 'agreed';
        v_both_agreed := true;
      ELSIF v_agreement.renter_agreed_at IS NOT NULL THEN
        v_new_status := 'renter_agreed';
      ELSE
        v_new_status := 'landlord_agreed';
      END IF;

      UPDATE public.rental_agreements SET
        renter_agreed_at = v_agreement.renter_agreed_at,
        landlord_agreed_at = v_agreement.landlord_agreed_at,
        status = v_new_status,
        updated_at = pg_catalog.now()
      WHERE id = v_agreement.id
      RETURNING * INTO v_agreement;
    END IF;

    UPDATE public.rental_conversations
      SET agreement_seq = agreement_seq + 1
      WHERE id = p_conversation_id
      RETURNING agreement_seq INTO v_new_version;

    IF v_both_agreed THEN
      UPDATE public.rental_units SET is_available = false WHERE id = v_unit_id;
      UPDATE public.rental_agreements SET status = 'cancelled', updated_at = pg_catalog.now()
        WHERE unit_id = v_unit_id AND id <> v_agreement.id AND status NOT IN ('agreed', 'cancelled');
    END IF;
  ELSE
    IF v_agreement.id IS NOT NULL THEN
      UPDATE public.rental_agreements SET status = 'cancelled', updated_at = pg_catalog.now() WHERE id = v_agreement.id
      RETURNING * INTO v_agreement;

      UPDATE public.rental_conversations
        SET agreement_seq = agreement_seq + 1
        WHERE id = p_conversation_id
        RETURNING agreement_seq INTO v_new_version;
    END IF;
  END IF;

  SELECT full_name INTO v_renter_name FROM public.profiles WHERE id = v_conv.renter_id;
  IF v_agreement.unit_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(pg_catalog.btrim(unit_number), ''), 'Room 1') INTO v_unit_number
    FROM public.rental_units WHERE id = v_agreement.unit_id;
  END IF;

  v_result := pg_catalog.jsonb_build_object(
    'id', v_agreement.id,
    'agreementId', v_agreement.id,
    'unitId', v_agreement.unit_id,
    'unitNumber', v_unit_number,
    'status', COALESCE(v_agreement.status, 'cancelled'),
    'renterAgreed', v_agreement.renter_agreed_at IS NOT NULL,
    'landlordAgreed', v_agreement.landlord_agreed_at IS NOT NULL,
    'bothAgreed', COALESCE(v_agreement.status = 'agreed', false),
    'renterName', v_renter_name,
    'version', v_new_version
  );

  INSERT INTO public.rental_agreement_ops(actor_id, operation_id, conversation_id, agree, requested_unit_id, result)
  VALUES (v_actor, p_operation_id, p_conversation_id, p_agree, p_unit_id, v_result);

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.set_rental_agreement_consent(uuid, uuid, boolean, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_rental_agreement_consent(uuid, uuid, boolean, uuid, integer) TO authenticated;
