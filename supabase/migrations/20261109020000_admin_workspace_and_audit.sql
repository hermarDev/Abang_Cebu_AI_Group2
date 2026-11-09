-- Admin workspace: append-only audit log + SECURITY DEFINER moderation/overview RPCs.
BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL,
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action_type text NOT NULL CHECK (action_type IN (
    'property_approved', 'property_rejected', 'property_unpublished', 'property_restored',
    'account_suspended', 'account_reinstated', 'report_resolved', 'report_dismissed', 'report_evidence_viewed')),
  target_type text NOT NULL CHECK (target_type IN ('property', 'listing', 'account', 'report')),
  target_id uuid NOT NULL,
  previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE (admin_id, operation_id)
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON public.admin_audit_logs(target_type, target_id, created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;
GRANT SELECT ON public.admin_audit_logs TO authenticated;
DROP POLICY IF EXISTS admin_audit_logs_read ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_read ON public.admin_audit_logs FOR SELECT TO authenticated USING (public.is_admin());

-- Audit list (also reused by the overview).
CREATE OR REPLACE FUNCTION public.admin_list_audit_logs(p_target_type text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_target_type IS NOT NULL AND p_target_type NOT IN ('property', 'listing', 'account', 'report') THEN
    RAISE EXCEPTION 'invalid target type' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(t.j ORDER BY t.created_at DESC, t.id ASC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT l.created_at, l.id, pg_catalog.jsonb_build_object(
      'id', l.id, 'operationId', l.operation_id, 'adminId', l.admin_id, 'adminName', a.full_name,
      'actionType', l.action_type, 'targetType', l.target_type, 'targetId', l.target_id,
      'previousState', l.previous_state, 'newState', l.new_state, 'reason', l.reason, 'createdAt', l.created_at) AS j
    FROM public.admin_audit_logs l
    LEFT JOIN public.profiles a ON a.id = l.admin_id
    WHERE p_target_type IS NULL OR l.target_type = p_target_type
    ORDER BY l.created_at DESC, l.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100) OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) t;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_overview()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_open_reports integer := 0;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  -- abuse_reports arrives in a later migration; tolerate its absence.
  IF pg_catalog.to_regclass('public.abuse_reports') IS NOT NULL THEN
    EXECUTE 'SELECT count(*)::int FROM public.abuse_reports WHERE status IN (''open'', ''in_review'')' INTO v_open_reports;
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
    'recentAuditEntries', public.admin_list_audit_logs(NULL, 10, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_properties(p_status text DEFAULT NULL, p_search text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_search text := lower(NULLIF(btrim(p_search), ''));
  v_result jsonb;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'approved', 'rejected', 'archived', 'all') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(t.j ORDER BY t.updated_at DESC, t.created_at DESC, t.id ASC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT p.updated_at, p.created_at, p.id, pg_catalog.jsonb_build_object(
      'id', p.id, 'title', p.title, 'description', p.description, 'propertyType', p.property_type,
      'rentalType', u.rental_type, 'monthlyRent', u.monthly_rent, 'maxOccupants', u.max_occupants,
      'floorAreaSqm', u.floor_area_sqm, 'isAvailable', COALESCE(u.is_available, false),
      'streetAddress', p.street_address, 'barangay', p.barangay, 'city', p.city, 'postalCode', p.postal_code,
      'latitude', p.latitude, 'longitude', p.longitude, 'status', p.status, 'moderationNote', p.moderation_note,
      'landlordId', p.landlord_id, 'landlordName', owner.full_name, 'landlordSuspended', owner.is_suspended,
      'submissionDraftId', s.draft_id, 'submissionExpectedRevision', s.expected_revision,
      'photoPaths', pg_catalog.to_jsonb(COALESCE(
        NULLIF(ARRAY(
          SELECT e.elem->>'object_path'
          FROM pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(s.snapshot_media) = 'array' THEN s.snapshot_media ELSE '[]'::jsonb END)
            WITH ORDINALITY AS e(elem, ord)
          WHERE e.elem->>'kind' = 'photo' AND e.elem->>'object_path' IS NOT NULL ORDER BY e.ord), '{}'::text[]),
        ARRAY(
          SELECT m.object_path FROM public.property_draft_media m
          WHERE m.draft_id = s.draft_id AND m.confirmed AND m.released_at IS NULL AND m.kind = 'photo'
          ORDER BY m.created_at))),
      'permitPaths', pg_catalog.to_jsonb(COALESCE(
        NULLIF(ARRAY(
          SELECT e.elem->>'object_path'
          FROM pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(s.snapshot_media) = 'array' THEN s.snapshot_media ELSE '[]'::jsonb END)
            WITH ORDINALITY AS e(elem, ord)
          WHERE e.elem->>'kind' = 'permit' AND e.elem->>'object_path' IS NOT NULL ORDER BY e.ord), '{}'::text[]),
        ARRAY(
          SELECT m.object_path FROM public.property_draft_media m
          WHERE m.draft_id = s.draft_id AND m.confirmed AND m.released_at IS NULL AND m.kind = 'permit'
          ORDER BY m.created_at))),
      'createdAt', p.created_at, 'updatedAt', p.updated_at) AS j
    FROM public.properties p
    LEFT JOIN public.profiles owner ON owner.id = p.landlord_id
    LEFT JOIN LATERAL (
      SELECT u.* FROM public.rental_units u WHERE u.property_id = p.id ORDER BY u.created_at ASC, u.id ASC LIMIT 1
    ) u ON true
    LEFT JOIN LATERAL (
      SELECT s.* FROM public.property_submissions s WHERE s.property_id = p.id AND s.superseded_by IS NULL
      ORDER BY s.created_at DESC LIMIT 1
    ) s ON true
    WHERE (p_status IS NULL OR p_status = 'all' OR p.status = p_status)
      AND (v_search IS NULL OR pg_catalog.strpos(lower(p.title || ' ' || p.street_address || ' ' || p.barangay || ' ' || p.city || ' ' || COALESCE(owner.full_name, '')), v_search) > 0)
    ORDER BY p.updated_at DESC, p.created_at DESC, p.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100) OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) t;
  RETURN v_result;
END;
$$;

-- review_property: unchanged contract from 20261106200000, plus an audit row.
CREATE OR REPLACE FUNCTION public.review_property(p_property_id uuid, p_operation_id uuid, p_decision text, p_note text, p_submission_draft_id uuid DEFAULT NULL, p_submission_expected_revision bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_previous public.property_reviews%ROWTYPE;
  v_status text;
  v_submission public.property_submissions%ROWTYPE;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_property_id IS NULL OR p_operation_id IS NULL OR p_decision NOT IN ('approved','rejected')
    OR (p_decision = 'rejected' AND (p_note IS NULL OR length(btrim(p_note)) = 0 OR length(p_note) > 1000))
    OR p_submission_draft_id IS NULL OR p_submission_expected_revision IS NULL OR p_submission_expected_revision < 1 THEN
    RAISE EXCEPTION 'invalid review' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('property-review:' || p_property_id::text, 0));
  SELECT * INTO v_previous FROM public.property_reviews WHERE admin_id = v_admin AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_previous.property_id IS DISTINCT FROM p_property_id OR v_previous.decision IS DISTINCT FROM p_decision OR v_previous.note IS DISTINCT FROM (CASE WHEN p_decision = 'rejected' THEN p_note ELSE NULL END) THEN
      RAISE EXCEPTION 'operation already used for different review' USING ERRCODE = '23505';
    END IF;
    IF p_submission_draft_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.property_submissions s
      WHERE s.owner_id = v_previous.submission_owner_id
        AND s.operation_id = v_previous.submission_operation_id
        AND s.property_id = p_property_id
        AND s.draft_id = p_submission_draft_id
        AND s.expected_revision = p_submission_expected_revision
    ) THEN
      RAISE EXCEPTION 'operation already used for different submission revision' USING ERRCODE = '23505';
    END IF;
    RETURN pg_catalog.jsonb_build_object('status', v_previous.decision);
  END IF;
  -- An operation id first used by another admin action must not be silently re-used (and its audit row dropped).
  IF EXISTS (SELECT 1 FROM public.admin_audit_logs WHERE admin_id = v_admin AND operation_id = p_operation_id) THEN
    RAISE EXCEPTION 'operation already used for different change' USING ERRCODE = '23505';
  END IF;
  -- Lock the live revision (same order as submit_property_from_draft: submission row, then property row) so a
  -- concurrent resubmission either commits first (this revision is then superseded -> not found) or waits for us.
  SELECT * INTO v_submission FROM public.property_submissions
    WHERE property_id = p_property_id AND draft_id = p_submission_draft_id AND expected_revision = p_submission_expected_revision
      AND superseded_by IS NULL
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    -- Existing but no longer live (resubmitted meanwhile) is stale (409); a revision that never existed stays invalid.
    IF EXISTS (SELECT 1 FROM public.property_submissions WHERE property_id = p_property_id AND draft_id = p_submission_draft_id AND expected_revision = p_submission_expected_revision) THEN
      RAISE EXCEPTION 'submission revision superseded' USING ERRCODE = '40001';
    END IF;
    RAISE EXCEPTION 'submission revision not found' USING ERRCODE = '22023';
  END IF;
  UPDATE public.properties
    SET status = p_decision, moderation_note = CASE WHEN p_decision = 'rejected' THEN p_note ELSE NULL END,
        approved_by = CASE WHEN p_decision = 'approved' THEN v_admin ELSE NULL END,
        approved_at = CASE WHEN p_decision = 'approved' THEN pg_catalog.now() ELSE NULL END
    WHERE id = p_property_id AND status = 'pending'
    RETURNING status INTO v_status;
  IF v_status IS NULL THEN RAISE EXCEPTION 'property is not pending review' USING ERRCODE = '40001'; END IF;
  INSERT INTO public.property_reviews(admin_id, operation_id, property_id, decision, note, submission_owner_id, submission_operation_id)
  VALUES (v_admin, p_operation_id, p_property_id, p_decision, CASE WHEN p_decision = 'rejected' THEN p_note ELSE NULL END,
    v_submission.owner_id, v_submission.operation_id);
  INSERT INTO public.admin_audit_logs(operation_id, admin_id, action_type, target_type, target_id, previous_state, new_state, reason)
  VALUES (p_operation_id, v_admin,
    CASE WHEN p_decision = 'approved' THEN 'property_approved' ELSE 'property_rejected' END,
    'property', p_property_id,
    pg_catalog.jsonb_build_object('status', 'pending'),
    pg_catalog.jsonb_build_object('status', v_status, 'draft_id', p_submission_draft_id, 'revision', p_submission_expected_revision),
    CASE WHEN p_decision = 'rejected' THEN btrim(p_note) ELSE 'Approved pending submission' END);
  RETURN pg_catalog.jsonb_build_object('status', v_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_property_lifecycle(p_property_id uuid, p_operation_id uuid, p_action text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_audit public.admin_audit_logs%ROWTYPE;
  v_action text;
  v_status text;
  v_suspended boolean;
  v_new_status text;
  v_result jsonb;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_property_id IS NULL OR p_operation_id IS NULL OR p_action IS NULL OR p_action NOT IN ('unpublish', 'restore')
    OR length(btrim(COALESCE(p_reason, ''))) NOT BETWEEN 5 AND 1000 THEN
    RAISE EXCEPTION 'invalid lifecycle change' USING ERRCODE = '22023';
  END IF;
  v_action := CASE WHEN p_action = 'unpublish' THEN 'property_unpublished' ELSE 'property_restored' END;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('property-review:' || p_property_id::text, 0));
  SELECT * INTO v_audit FROM public.admin_audit_logs WHERE admin_id = v_admin AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_audit.target_id IS DISTINCT FROM p_property_id OR v_audit.action_type IS DISTINCT FROM v_action THEN
      RAISE EXCEPTION 'operation already used for different change' USING ERRCODE = '23505';
    END IF;
    RETURN v_audit.new_state;
  END IF;
  SELECT p.status, o.is_suspended INTO v_status, v_suspended
  FROM public.properties p LEFT JOIN public.profiles o ON o.id = p.landlord_id
  WHERE p.id = p_property_id FOR UPDATE OF p;
  IF NOT FOUND THEN RAISE EXCEPTION 'property not found' USING ERRCODE = '22023'; END IF;
  IF p_action = 'unpublish' THEN
    IF v_status <> 'approved' THEN RAISE EXCEPTION 'property is not approved' USING ERRCODE = '40001'; END IF;
    v_new_status := 'archived';
    UPDATE public.properties SET status = 'archived', moderation_note = btrim(p_reason), updated_at = pg_catalog.now()
      WHERE id = p_property_id;
  ELSE
    IF v_status <> 'archived' THEN RAISE EXCEPTION 'property is not archived' USING ERRCODE = '40001'; END IF;
    IF COALESCE(v_suspended, false) THEN
      RAISE EXCEPTION 'cannot restore property of suspended landlord' USING ERRCODE = '40001';
    END IF;
    v_new_status := 'approved';
    UPDATE public.properties SET status = 'approved', moderation_note = NULL, approved_by = v_admin,
      approved_at = pg_catalog.now(), updated_at = pg_catalog.now()
      WHERE id = p_property_id;
  END IF;
  v_result := pg_catalog.jsonb_build_object('propertyId', p_property_id, 'status', v_new_status);
  INSERT INTO public.admin_audit_logs(operation_id, admin_id, action_type, target_type, target_id, previous_state, new_state, reason)
  VALUES (p_operation_id, v_admin, v_action, 'property', p_property_id,
    pg_catalog.jsonb_build_object('status', v_status), v_result, btrim(p_reason));
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_accounts(p_role text DEFAULT NULL, p_suspended boolean DEFAULT NULL, p_search text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_search text := lower(NULLIF(btrim(p_search), ''));
  v_reports jsonb := '{}'::jsonb;
  v_result jsonb;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('renter', 'landlord', 'admin') THEN
    RAISE EXCEPTION 'invalid role' USING ERRCODE = '22023';
  END IF;
  -- abuse_reports arrives in a later migration; tolerate its absence.
  IF pg_catalog.to_regclass('public.abuse_reports') IS NOT NULL THEN
    EXECUTE 'SELECT COALESCE(jsonb_object_agg(target_user_id::text, c), ''{}''::jsonb) FROM (SELECT target_user_id, count(*)::int AS c FROM public.abuse_reports WHERE status IN (''open'', ''in_review'') AND target_user_id IS NOT NULL GROUP BY 1) r' INTO v_reports;
  END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(t.j ORDER BY t.created_at DESC, t.id ASC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT pr.created_at, pr.id, pg_catalog.jsonb_build_object(
      'id', pr.id, 'fullName', pr.full_name, 'role', pr.role, 'isSuspended', pr.is_suspended,
      'phoneNumber', pr.phone_number, 'createdAt', pr.created_at, 'updatedAt', pr.updated_at,
      'propertyCount', (SELECT count(*)::int FROM public.properties p WHERE p.landlord_id = pr.id),
      'livePropertyCount', (SELECT count(*)::int FROM public.properties p WHERE p.landlord_id = pr.id AND p.status = 'approved'),
      'openReportCount', COALESCE((v_reports->>(pr.id::text))::int, 0)) AS j
    FROM public.profiles pr
    WHERE (p_role IS NULL OR pr.role::text = p_role)
      AND (p_suspended IS NULL OR pr.is_suspended = p_suspended)
      AND (v_search IS NULL OR pg_catalog.strpos(lower(pr.full_name || ' ' || COALESCE(pr.phone_number, '')), v_search) > 0)
    ORDER BY pr.created_at DESC, pr.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100) OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) t;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_account_suspension(p_target_user_id uuid, p_operation_id uuid, p_suspend boolean, p_reason text, p_unpublish_listings boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_audit public.admin_audit_logs%ROWTYPE;
  v_action text;
  v_role text;
  v_was_suspended boolean;
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
    GET DIAGNOSTICS v_unpublished = ROW_COUNT;
  END IF;
  v_result := pg_catalog.jsonb_build_object('userId', p_target_user_id, 'isSuspended', p_suspend, 'unpublishedCount', v_unpublished);
  INSERT INTO public.admin_audit_logs(operation_id, admin_id, action_type, target_type, target_id, previous_state, new_state, reason)
  VALUES (p_operation_id, v_admin, v_action, 'account', p_target_user_id,
    pg_catalog.jsonb_build_object('isSuspended', v_was_suspended), v_result, btrim(p_reason));
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_audit_logs(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit_logs(text, integer, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_dashboard_overview() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_overview() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_list_properties(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_properties(text, text, integer, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.review_property(uuid, uuid, text, text, uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_property(uuid, uuid, text, text, uuid, bigint) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_set_property_lifecycle(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_property_lifecycle(uuid, uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_list_accounts(text, boolean, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_accounts(text, boolean, text, integer, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_set_account_suspension(uuid, uuid, boolean, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_account_suspension(uuid, uuid, boolean, text, boolean) TO authenticated;

COMMIT;
