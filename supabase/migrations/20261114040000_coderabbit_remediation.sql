-- Forward migration: CodeRabbit PR #95 remediation
-- 1. Make admin_staff_creation_ops.user_id ON DELETE CASCADE so failed assignment rollbacks and user deletions succeed
-- 2. Make admin_assign_staff_role replay-safe via admin_audit_logs check and advisory lock
-- 3. Add keyset pagination cursor (p_cursor_created_at, p_cursor_id) to support_desk_list_tickets
-- 4. Add rental_units.is_retired + full unit reconciliation & shared unit specs in review_property,
--    preserving rental_agreements references and filtering retired units across all unit readers

BEGIN;

-- ============================================================================
-- 1. Allow auth.users deletion after staff creation tracking
-- ============================================================================
DO $$
DECLARE
  v_con record;
BEGIN
  FOR v_con IN
    SELECT c.conname
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class r ON r.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public'
      AND r.relname = 'admin_staff_creation_ops'
      AND c.contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE public.admin_staff_creation_ops DROP CONSTRAINT %I', v_con.conname);
  END LOOP;

  ALTER TABLE public.admin_staff_creation_ops
    ADD CONSTRAINT admin_staff_creation_ops_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- ============================================================================
-- 2. Make admin_assign_staff_role idempotent on replay
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_assign_staff_role(
  p_target_user_id uuid, p_operation_id uuid, p_role text, p_full_name text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_target public.profiles%ROWTYPE;
  v_audit public.admin_audit_logs%ROWTYPE;
  v_trimmed_name text := NULLIF(pg_catalog.btrim(p_full_name), '');
  v_effective_name text;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_target_user_id IS NULL OR p_operation_id IS NULL OR p_role IS NULL OR p_role NOT IN ('verification_officer', 'customer_support') THEN
    RAISE EXCEPTION 'invalid staff assignment parameters' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('staff-assign:' || v_admin::text || ':' || p_operation_id::text, 0));

  SELECT * INTO v_audit FROM public.admin_audit_logs
    WHERE admin_id = v_admin AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_audit.action_type IS DISTINCT FROM 'staff_account_created'
       OR v_audit.target_type IS DISTINCT FROM 'account'
       OR v_audit.target_id IS DISTINCT FROM p_target_user_id
       OR (v_audit.new_state->>'role') IS DISTINCT FROM p_role
       OR (v_trimmed_name IS NOT NULL AND (v_audit.new_state->>'full_name') IS DISTINCT FROM v_trimmed_name) THEN
      RAISE EXCEPTION 'operation already used for different staff assignment' USING ERRCODE = '23505';
    END IF;
    RETURN pg_catalog.jsonb_build_object(
      'targetUserId', p_target_user_id,
      'role', p_role,
      'replayed', true,
      'success', true
    );
  END IF;

  SELECT * INTO v_target FROM public.profiles WHERE id = p_target_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'target profile not found' USING ERRCODE = 'P0002';
  END IF;

  v_effective_name := COALESCE(v_trimmed_name, v_target.full_name);

  UPDATE public.profiles
    SET role = p_role::public.user_role,
        full_name = v_effective_name,
        updated_at = pg_catalog.now()
    WHERE id = p_target_user_id;

  INSERT INTO public.admin_audit_logs(admin_id, operation_id, target_type, target_id, action_type, previous_state, new_state, reason)
    VALUES (v_admin, p_operation_id, 'account', p_target_user_id, 'staff_account_created',
      pg_catalog.jsonb_build_object('role', v_target.role, 'full_name', v_target.full_name),
      pg_catalog.jsonb_build_object('role', p_role, 'full_name', v_effective_name),
      'Staff account assigned role: ' || p_role);

  RETURN pg_catalog.jsonb_build_object('targetUserId', p_target_user_id, 'role', p_role, 'success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_staff_role(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_staff_role(uuid,uuid,text,text) TO authenticated;

-- ============================================================================
-- 3. Keyset pagination cursor on support_desk_list_tickets
-- ============================================================================
DROP FUNCTION IF EXISTS public.support_desk_list_tickets(text,text,text,integer,integer,uuid);

CREATE OR REPLACE FUNCTION public.support_desk_list_tickets(
  p_status text DEFAULT NULL, p_category text DEFAULT NULL, p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_ticket_id uuid DEFAULT NULL,
  p_cursor_created_at timestamptz DEFAULT NULL, p_cursor_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_search text := lower(NULLIF(btrim(p_search), ''));
  v_use_cursor boolean := (p_cursor_created_at IS NOT NULL AND p_cursor_id IS NOT NULL);
  v_result jsonb;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND p.role::text IN ('customer_support','admin') AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active support or admin required' USING ERRCODE = '42501';
  END IF;
  IF (p_cursor_created_at IS NULL) <> (p_cursor_id IS NULL) THEN
    RAISE EXCEPTION 'invalid cursor parameters' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(pg_catalog.jsonb_agg(t.j ORDER BY t.created_at DESC, t.id ASC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT st.created_at, st.id, pg_catalog.jsonb_build_object(
      'id', st.id,
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
      'resolvedAt', st.resolved_at,
      'createdAt', st.created_at,
      'updatedAt', st.updated_at
    ) AS j
    FROM public.support_tickets st
    LEFT JOIN public.profiles landlord ON landlord.id = st.reported_landlord_id
    LEFT JOIN public.profiles support_staff ON support_staff.id = st.handled_by_support_id
    WHERE (p_ticket_id IS NULL OR st.id = p_ticket_id)
      AND (p_status IS NULL OR p_status = 'all' OR st.status = p_status)
      AND (p_category IS NULL OR p_category = 'all' OR st.category = p_category)
      AND (v_search IS NULL OR pg_catalog.strpos(lower(st.subject || ' ' || st.description || ' ' || st.requester_name || ' ' || st.requester_email || ' ' || COALESCE(landlord.full_name, '')), v_search) > 0)
      AND (NOT v_use_cursor OR st.created_at < p_cursor_created_at OR (st.created_at = p_cursor_created_at AND st.id > p_cursor_id))
    ORDER BY st.created_at DESC, st.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
    OFFSET CASE WHEN v_use_cursor THEN 0 ELSE GREATEST(COALESCE(p_offset, 0), 0) END
  ) t;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.support_desk_list_tickets(text,text,text,integer,integer,uuid,timestamptz,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.support_desk_list_tickets(text,text,text,integer,integer,uuid,timestamptz,uuid) TO authenticated;

-- ============================================================================
-- 4. Multi-unit reconciliation, unit retirement preserving agreements, & shared specs
-- ============================================================================
ALTER TABLE public.rental_units
  ADD COLUMN IF NOT EXISTS is_retired boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS rental_unit_active_property_idx
  ON public.rental_units(property_id, created_at, id)
  WHERE NOT is_retired;

CREATE OR REPLACE FUNCTION public.submit_property_from_draft(p_operation_id uuid, p_draft_id uuid, p_expected_revision bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_draft public.property_drafts%ROWTYPE;
  v_previous public.property_submissions%ROWTYPE;
  v_active_sub public.property_submissions%ROWTYPE;
  v_existing_prop public.properties%ROWTYPE;
  v_property uuid;
  v_p jsonb;
  v_u jsonb;
  v_units jsonb;
  v_unit_elem jsonb;
  v_media jsonb;
  v_has_units boolean;
BEGIN
  IF v_owner IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_owner AND p.role = 'landlord' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active landlord required' USING ERRCODE = '42501';
  END IF;
  IF p_operation_id IS NULL OR p_draft_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision < 1 THEN
    RAISE EXCEPTION 'invalid submission' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('property-submission-owner:' || v_owner::text, 0));
  SELECT * INTO v_previous FROM public.property_submissions WHERE owner_id = v_owner AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_previous.draft_id IS DISTINCT FROM p_draft_id OR v_previous.expected_revision IS DISTINCT FROM p_expected_revision THEN
      RAISE EXCEPTION 'operation already used for different submission' USING ERRCODE = '23505';
    END IF;
    RETURN pg_catalog.jsonb_build_object('property_id', v_previous.property_id, 'status', 'pending');
  END IF;
  IF EXISTS (SELECT 1 FROM public.property_submissions WHERE draft_id = p_draft_id AND expected_revision = p_expected_revision AND owner_id = v_owner) THEN
    RAISE EXCEPTION 'this draft revision was already submitted' USING ERRCODE = '23505';
  END IF;
  SELECT * INTO v_draft FROM public.property_drafts WHERE id = p_draft_id AND owner_id = v_owner AND revision = p_expected_revision FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'draft changed or unavailable' USING ERRCODE = '40001'; END IF;
  v_p := v_draft.payload->'property';
  v_u := v_draft.payload->'unit';
  v_units := v_draft.payload->'units';
  v_has_units := (v_units IS NOT NULL AND pg_catalog.jsonb_typeof(v_units) = 'array' AND pg_catalog.jsonb_array_length(v_units) > 0);
  IF pg_catalog.jsonb_typeof(v_p) <> 'object' OR pg_catalog.jsonb_typeof(v_u) <> 'object'
    OR v_p->>'title' IS NULL OR length(btrim(v_p->>'title')) = 0
    OR v_p->>'description' IS NULL OR length(btrim(v_p->>'description')) < 20
    OR v_p->>'property_type' IS NULL OR v_p->>'property_type' NOT IN ('apartment','condominium','house','townhouse','commercial','boarding_house')
    OR v_p->>'street_address' IS NULL OR length(btrim(v_p->>'street_address')) = 0
    OR v_p->>'barangay' IS NULL OR length(btrim(v_p->>'barangay')) = 0
    OR v_p->>'city' IS NULL OR length(btrim(v_p->>'city')) = 0
    OR v_p->'latitude' IS NULL OR v_p->'longitude' IS NULL
    OR v_u->>'rental_type' NOT IN ('entire_place','private_room','shared_room','bedspace')
    OR v_u->'monthly_rent' IS NULL OR (v_u->>'monthly_rent')::numeric <= 0
    OR v_p->>'permit_applicability' IS NULL OR v_p->>'permit_applicability' NOT IN ('required','not_required')
    OR (v_p->>'permit_applicability' = 'required' AND NOT EXISTS (SELECT 1 FROM public.property_draft_media m JOIN storage.objects o ON o.bucket_id = 'property-draft-media' AND o.name = m.object_path WHERE m.draft_id = p_draft_id AND m.kind = 'permit' AND m.confirmed))
    OR (v_p->>'permit_applicability' = 'not_required' AND v_p->>'permit_not_required_confirmed' IS DISTINCT FROM 'true') THEN
    RAISE EXCEPTION 'invalid draft payload' USING ERRCODE = '22023';
  END IF;

  IF v_has_units THEN
    FOR v_unit_elem IN SELECT * FROM pg_catalog.jsonb_array_elements(v_units) LOOP
      IF NULLIF(btrim(COALESCE(v_unit_elem->>'unit_number','')), '') IS NULL
         OR COALESCE(v_unit_elem->>'rental_type','') NOT IN ('entire_place','private_room','shared_room','bedspace')
         OR v_unit_elem->>'monthly_rent' IS NULL OR (v_unit_elem->>'monthly_rent')::numeric <= 0 THEN
        RAISE EXCEPTION 'invalid multi-unit entry' USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END IF;

  SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'operation_id', m.operation_id, 'kind', m.kind, 'content_type', m.content_type,
    'size_bytes', m.size_bytes, 'content_sha256', m.content_sha256, 'object_path', m.object_path
  ) ORDER BY m.created_at) INTO v_media
    FROM public.property_draft_media m WHERE m.draft_id = p_draft_id AND m.confirmed AND m.released_at IS NULL;

  SELECT * INTO v_active_sub FROM public.property_submissions
    WHERE owner_id = v_owner AND draft_id = p_draft_id AND superseded_by IS NULL
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    SELECT * INTO v_existing_prop FROM public.properties
      WHERE id = v_active_sub.property_id AND landlord_id = v_owner FOR UPDATE;
    IF NOT FOUND OR v_existing_prop.status NOT IN ('pending', 'rejected', 'approved') THEN
      RAISE EXCEPTION 'property cannot be updated in its current review status' USING ERRCODE = '40001';
    END IF;

    IF v_existing_prop.status IN ('pending', 'rejected') THEN
      v_property := v_active_sub.property_id;
      UPDATE public.properties
        SET title = v_p->>'title', description = v_p->>'description', property_type = v_p->>'property_type',
            street_address = v_p->>'street_address', barangay = v_p->>'barangay', city = v_p->>'city',
            coordinates = extensions.ST_SetSRID(extensions.ST_MakePoint((v_p->>'longitude')::numeric, (v_p->>'latitude')::numeric), 4326),
            status = 'pending', moderation_note = NULL, approved_by = NULL, approved_at = NULL
        WHERE id = v_property AND landlord_id = v_owner;

      IF v_has_units THEN
        DELETE FROM public.rental_units u
          WHERE u.property_id = v_property
            AND NOT EXISTS (SELECT 1 FROM public.rental_agreements a WHERE a.unit_id = u.id);
        UPDATE public.rental_units
          SET is_retired = true, is_available = false, updated_at = pg_catalog.now()
          WHERE property_id = v_property AND NOT is_retired;

        INSERT INTO public.rental_units(property_id, unit_number, rental_type, monthly_rent, max_occupants, floor_area_sqm, bedrooms, bathrooms, furnished_status, is_retired)
        SELECT
          v_property,
          btrim(u.elem->>'unit_number'),
          u.elem->>'rental_type',
          (u.elem->>'monthly_rent')::numeric,
          GREATEST(1, COALESCE(NULLIF(u.elem->>'max_occupants','')::integer, 1)),
          CASE WHEN (v_u->>'floor_area_sqm') IS NOT NULL AND (v_u->>'floor_area_sqm') <> '' THEN (v_u->>'floor_area_sqm')::numeric ELSE NULL END,
          CASE WHEN (v_u->>'bedrooms') IS NOT NULL AND (v_u->>'bedrooms') <> '' THEN (v_u->>'bedrooms')::integer ELSE 1 END,
          CASE WHEN (v_u->>'bathrooms') IS NOT NULL AND (v_u->>'bathrooms') <> '' THEN (v_u->>'bathrooms')::numeric ELSE 1 END,
          CASE
            WHEN (v_u->>'furnished_status') = 'furnished' THEN 'fully_furnished'
            WHEN (v_u->>'furnished_status') IN ('unfurnished', 'semi_furnished', 'fully_furnished') THEN (v_u->>'furnished_status')
            ELSE 'unfurnished'
          END,
          false
        FROM pg_catalog.jsonb_array_elements(v_units) WITH ORDINALITY AS u(elem, ord)
        ORDER BY u.ord;
      ELSE
        UPDATE public.rental_units
          SET rental_type = v_u->>'rental_type',
              monthly_rent = (v_u->>'monthly_rent')::numeric,
              max_occupants = GREATEST(1, COALESCE(NULLIF(v_u->>'max_occupants','')::integer, 1)),
              floor_area_sqm = CASE WHEN (v_u->>'floor_area_sqm') IS NOT NULL AND (v_u->>'floor_area_sqm') <> '' THEN (v_u->>'floor_area_sqm')::numeric ELSE floor_area_sqm END,
              bedrooms = CASE WHEN (v_u->>'bedrooms') IS NOT NULL AND (v_u->>'bedrooms') <> '' THEN (v_u->>'bedrooms')::integer ELSE bedrooms END,
              bathrooms = CASE WHEN (v_u->>'bathrooms') IS NOT NULL AND (v_u->>'bathrooms') <> '' THEN (v_u->>'bathrooms')::numeric ELSE bathrooms END,
              furnished_status = CASE
                WHEN (v_u->>'furnished_status') = 'furnished' THEN 'fully_furnished'
                WHEN (v_u->>'furnished_status') IN ('unfurnished', 'semi_furnished', 'fully_furnished') THEN (v_u->>'furnished_status')
                ELSE furnished_status
              END,
              is_retired = false
          WHERE id = (SELECT u.id FROM public.rental_units u WHERE u.property_id = v_property ORDER BY u.is_retired ASC, u.created_at ASC, u.id ASC LIMIT 1);
      END IF;

      INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media, review_status)
      VALUES (v_owner, p_operation_id, p_draft_id, p_expected_revision, v_property, v_draft.payload, COALESCE(v_media, '[]'::jsonb), 'pending');
      UPDATE public.property_submissions SET superseded_by = p_operation_id
        WHERE owner_id = v_owner AND property_id = v_property AND operation_id <> p_operation_id AND superseded_by IS NULL;
    ELSIF v_existing_prop.status = 'approved' THEN
      v_draft.payload := pg_catalog.jsonb_set(v_draft.payload, '{property}', v_p || pg_catalog.jsonb_build_object(
        'street_address', v_existing_prop.street_address, 'barangay', v_existing_prop.barangay, 'city', v_existing_prop.city,
        'latitude', v_existing_prop.latitude, 'longitude', v_existing_prop.longitude));
      v_property := v_active_sub.property_id;
      INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media, review_status)
      VALUES (v_owner, p_operation_id, p_draft_id, p_expected_revision, v_property, v_draft.payload, COALESCE(v_media, '[]'::jsonb), 'pending');
      UPDATE public.property_submissions SET superseded_by = p_operation_id
        WHERE owner_id = v_owner AND property_id = v_property AND operation_id <> p_operation_id AND superseded_by IS NULL;
    END IF;
  ELSE
    INSERT INTO public.properties(landlord_id, title, description, property_type, street_address, barangay, city, coordinates)
    VALUES (v_owner, v_p->>'title', v_p->>'description', v_p->>'property_type', v_p->>'street_address', v_p->>'barangay', v_p->>'city',
      extensions.ST_SetSRID(extensions.ST_MakePoint((v_p->>'longitude')::numeric, (v_p->>'latitude')::numeric), 4326))
    RETURNING id INTO v_property;

    IF v_has_units THEN
      INSERT INTO public.rental_units(property_id, unit_number, rental_type, monthly_rent, max_occupants, floor_area_sqm, bedrooms, bathrooms, furnished_status)
      SELECT
        v_property,
        btrim(u.elem->>'unit_number'),
        u.elem->>'rental_type',
        (u.elem->>'monthly_rent')::numeric,
        GREATEST(1, COALESCE(NULLIF(u.elem->>'max_occupants','')::integer, 1)),
        CASE WHEN (v_u->>'floor_area_sqm') IS NOT NULL AND (v_u->>'floor_area_sqm') <> '' THEN (v_u->>'floor_area_sqm')::numeric ELSE NULL END,
        CASE WHEN (v_u->>'bedrooms') IS NOT NULL AND (v_u->>'bedrooms') <> '' THEN (v_u->>'bedrooms')::integer ELSE 1 END,
        CASE WHEN (v_u->>'bathrooms') IS NOT NULL AND (v_u->>'bathrooms') <> '' THEN (v_u->>'bathrooms')::numeric ELSE 1 END,
        CASE
          WHEN (v_u->>'furnished_status') = 'furnished' THEN 'fully_furnished'
          WHEN (v_u->>'furnished_status') IN ('unfurnished', 'semi_furnished', 'fully_furnished') THEN (v_u->>'furnished_status')
          ELSE 'unfurnished'
        END
      FROM pg_catalog.jsonb_array_elements(v_units) WITH ORDINALITY AS u(elem, ord)
      ORDER BY u.ord;
    ELSE
      INSERT INTO public.rental_units(property_id, rental_type, monthly_rent, max_occupants, floor_area_sqm, bedrooms, bathrooms, furnished_status)
      VALUES (
        v_property,
        v_u->>'rental_type',
        (v_u->>'monthly_rent')::numeric,
        GREATEST(1, COALESCE(NULLIF(v_u->>'max_occupants','')::integer, 1)),
        CASE WHEN (v_u->>'floor_area_sqm') IS NOT NULL AND (v_u->>'floor_area_sqm') <> '' THEN (v_u->>'floor_area_sqm')::numeric ELSE NULL END,
        CASE WHEN (v_u->>'bedrooms') IS NOT NULL AND (v_u->>'bedrooms') <> '' THEN (v_u->>'bedrooms')::integer ELSE 1 END,
        CASE WHEN (v_u->>'bathrooms') IS NOT NULL AND (v_u->>'bathrooms') <> '' THEN (v_u->>'bathrooms')::numeric ELSE 1 END,
        CASE
          WHEN (v_u->>'furnished_status') = 'furnished' THEN 'fully_furnished'
          WHEN (v_u->>'furnished_status') IN ('unfurnished', 'semi_furnished', 'fully_furnished') THEN (v_u->>'furnished_status')
          ELSE 'unfurnished'
        END
      );
    END IF;

    INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media, review_status)
    VALUES (v_owner, p_operation_id, p_draft_id, p_expected_revision, v_property, v_draft.payload, COALESCE(v_media, '[]'::jsonb), 'pending');
  END IF;
  RETURN pg_catalog.jsonb_build_object('property_id', v_property, 'status', 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.review_property(
  p_property_id uuid,
  p_operation_id uuid,
  p_decision text,
  p_note text,
  p_submission_draft_id uuid DEFAULT NULL,
  p_submission_expected_revision bigint DEFAULT NULL,
  p_document_decision text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_previous public.property_reviews%ROWTYPE;
  v_existing_prop public.properties%ROWTYPE;
  v_status text;
  v_submission public.property_submissions%ROWTYPE;
  v_u jsonb;
  v_units jsonb;
  v_unit_elem jsonb;
  v_existing_unit_id uuid;
  v_kept_unit_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_property_id IS NULL OR p_operation_id IS NULL OR p_decision NOT IN ('approved','rejected')
    OR (p_decision = 'rejected' AND (p_note IS NULL OR length(btrim(p_note)) = 0 OR length(p_note) > 1000))
    OR p_submission_draft_id IS NULL OR p_submission_expected_revision IS NULL OR p_submission_expected_revision < 1
    OR (p_document_decision IS NOT NULL AND p_document_decision NOT IN ('documents_verified', 'exemption_accepted', 'documents_required')) THEN
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

  IF EXISTS (SELECT 1 FROM public.admin_audit_logs WHERE admin_id = v_admin AND operation_id = p_operation_id) THEN
    RAISE EXCEPTION 'operation already used for different change' USING ERRCODE = '23505';
  END IF;

  SELECT * INTO v_submission FROM public.property_submissions
    WHERE property_id = p_property_id AND draft_id = p_submission_draft_id AND expected_revision = p_submission_expected_revision
      AND superseded_by IS NULL
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.property_submissions WHERE property_id = p_property_id AND draft_id = p_submission_draft_id AND expected_revision = p_submission_expected_revision) THEN
      RAISE EXCEPTION 'submission revision superseded' USING ERRCODE = '40001';
    END IF;
    RAISE EXCEPTION 'submission revision not found' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing_prop FROM public.properties WHERE id = p_property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'property not found' USING ERRCODE = '22023'; END IF;

  IF v_existing_prop.status NOT IN ('pending', 'approved') OR (v_existing_prop.status = 'approved' AND v_submission.review_status <> 'pending') THEN
    RAISE EXCEPTION 'property is not pending review' USING ERRCODE = '40001';
  END IF;

  IF p_decision = 'approved' THEN
    UPDATE public.properties
      SET title = COALESCE(v_submission.snapshot_payload->'property'->>'title', title),
          description = COALESCE(v_submission.snapshot_payload->'property'->>'description', description),
          property_type = COALESCE(v_submission.snapshot_payload->'property'->>'property_type', property_type),
          status = 'approved',
          moderation_note = NULL,
          approved_by = v_admin,
          approved_at = pg_catalog.now(),
          updated_at = pg_catalog.now()
      WHERE id = p_property_id
      RETURNING status INTO v_status;

    v_u := v_submission.snapshot_payload->'unit';
    v_units := v_submission.snapshot_payload->'units';
    IF v_units IS NOT NULL AND pg_catalog.jsonb_typeof(v_units) = 'array' AND pg_catalog.jsonb_array_length(v_units) > 0 THEN
      FOR v_unit_elem IN SELECT elem FROM pg_catalog.jsonb_array_elements(v_units) WITH ORDINALITY AS u(elem, ord) ORDER BY u.ord LOOP
        v_existing_unit_id := NULL;
        SELECT u.id INTO v_existing_unit_id FROM public.rental_units u
          WHERE u.property_id = p_property_id
            AND u.unit_number = btrim(v_unit_elem->>'unit_number')
            AND NOT (u.id = ANY(v_kept_unit_ids))
          ORDER BY u.is_retired ASC, u.created_at ASC, u.id ASC LIMIT 1;
        IF v_existing_unit_id IS NOT NULL THEN
          UPDATE public.rental_units
            SET rental_type = COALESCE(NULLIF(v_unit_elem->>'rental_type',''), rental_type),
                monthly_rent = CASE WHEN (v_unit_elem->>'monthly_rent') IS NOT NULL AND (v_unit_elem->>'monthly_rent') <> '' THEN (v_unit_elem->>'monthly_rent')::numeric ELSE monthly_rent END,
                max_occupants = CASE WHEN (v_unit_elem->>'max_occupants') IS NOT NULL AND (v_unit_elem->>'max_occupants') <> '' THEN GREATEST(1, (v_unit_elem->>'max_occupants')::integer) ELSE max_occupants END,
                floor_area_sqm = CASE WHEN (v_u->>'floor_area_sqm') IS NOT NULL AND (v_u->>'floor_area_sqm') <> '' THEN (v_u->>'floor_area_sqm')::numeric ELSE floor_area_sqm END,
                bedrooms = CASE WHEN (v_u->>'bedrooms') IS NOT NULL AND (v_u->>'bedrooms') <> '' THEN (v_u->>'bedrooms')::integer ELSE bedrooms END,
                bathrooms = CASE WHEN (v_u->>'bathrooms') IS NOT NULL AND (v_u->>'bathrooms') <> '' THEN (v_u->>'bathrooms')::numeric ELSE bathrooms END,
                furnished_status = CASE
                  WHEN (v_u->>'furnished_status') = 'furnished' THEN 'fully_furnished'
                  WHEN (v_u->>'furnished_status') IN ('unfurnished', 'semi_furnished', 'fully_furnished') THEN (v_u->>'furnished_status')
                  ELSE furnished_status
                END,
                is_retired = false
            WHERE id = v_existing_unit_id;
          v_kept_unit_ids := array_append(v_kept_unit_ids, v_existing_unit_id);
        ELSE
          INSERT INTO public.rental_units(
            property_id, unit_number, rental_type, monthly_rent, max_occupants,
            floor_area_sqm, bedrooms, bathrooms, furnished_status, is_retired
          )
          VALUES (
            p_property_id,
            btrim(v_unit_elem->>'unit_number'),
            COALESCE(NULLIF(v_unit_elem->>'rental_type',''), COALESCE(v_u->>'rental_type', 'private_room')),
            (v_unit_elem->>'monthly_rent')::numeric,
            GREATEST(1, COALESCE(NULLIF(v_unit_elem->>'max_occupants','')::integer, 1)),
            CASE WHEN (v_u->>'floor_area_sqm') IS NOT NULL AND (v_u->>'floor_area_sqm') <> '' THEN (v_u->>'floor_area_sqm')::numeric ELSE NULL END,
            CASE WHEN (v_u->>'bedrooms') IS NOT NULL AND (v_u->>'bedrooms') <> '' THEN (v_u->>'bedrooms')::integer ELSE 1 END,
            CASE WHEN (v_u->>'bathrooms') IS NOT NULL AND (v_u->>'bathrooms') <> '' THEN (v_u->>'bathrooms')::numeric ELSE 1 END,
            CASE
              WHEN (v_u->>'furnished_status') = 'furnished' THEN 'fully_furnished'
              WHEN (v_u->>'furnished_status') IN ('unfurnished', 'semi_furnished', 'fully_furnished') THEN (v_u->>'furnished_status')
              ELSE 'unfurnished'
            END,
            false
          )
          RETURNING id INTO v_existing_unit_id;
          v_kept_unit_ids := array_append(v_kept_unit_ids, v_existing_unit_id);
        END IF;
      END LOOP;
    ELSE
      SELECT u.id INTO v_existing_unit_id
        FROM public.rental_units u
        WHERE u.property_id = p_property_id
        ORDER BY u.is_retired ASC, u.created_at ASC, u.id ASC
        LIMIT 1;
      IF v_existing_unit_id IS NOT NULL THEN
        UPDATE public.rental_units
          SET rental_type = COALESCE(v_u->>'rental_type', rental_type),
              monthly_rent = CASE WHEN (v_u->>'monthly_rent') IS NOT NULL AND (v_u->>'monthly_rent') <> '' THEN (v_u->>'monthly_rent')::numeric ELSE monthly_rent END,
              max_occupants = CASE WHEN (v_u->>'max_occupants') IS NOT NULL AND (v_u->>'max_occupants') <> '' THEN GREATEST(1, (v_u->>'max_occupants')::integer) ELSE max_occupants END,
              floor_area_sqm = CASE WHEN (v_u->>'floor_area_sqm') IS NOT NULL AND (v_u->>'floor_area_sqm') <> '' THEN (v_u->>'floor_area_sqm')::numeric ELSE floor_area_sqm END,
              bedrooms = CASE WHEN (v_u->>'bedrooms') IS NOT NULL AND (v_u->>'bedrooms') <> '' THEN (v_u->>'bedrooms')::integer ELSE bedrooms END,
              bathrooms = CASE WHEN (v_u->>'bathrooms') IS NOT NULL AND (v_u->>'bathrooms') <> '' THEN (v_u->>'bathrooms')::numeric ELSE bathrooms END,
              furnished_status = CASE
                WHEN (v_u->>'furnished_status') = 'furnished' THEN 'fully_furnished'
                WHEN (v_u->>'furnished_status') IN ('unfurnished', 'semi_furnished', 'fully_furnished') THEN (v_u->>'furnished_status')
                ELSE furnished_status
              END,
              is_retired = false
          WHERE id = v_existing_unit_id;
      ELSE
        INSERT INTO public.rental_units(
          property_id, rental_type, monthly_rent, max_occupants,
          floor_area_sqm, bedrooms, bathrooms, furnished_status, is_retired
        )
        VALUES (
          p_property_id,
          COALESCE(v_u->>'rental_type', 'private_room'),
          COALESCE(NULLIF(v_u->>'monthly_rent','')::numeric, 1),
          GREATEST(1, COALESCE(NULLIF(v_u->>'max_occupants','')::integer, 1)),
          CASE WHEN (v_u->>'floor_area_sqm') IS NOT NULL AND (v_u->>'floor_area_sqm') <> '' THEN (v_u->>'floor_area_sqm')::numeric ELSE NULL END,
          CASE WHEN (v_u->>'bedrooms') IS NOT NULL AND (v_u->>'bedrooms') <> '' THEN (v_u->>'bedrooms')::integer ELSE 1 END,
          CASE WHEN (v_u->>'bathrooms') IS NOT NULL AND (v_u->>'bathrooms') <> '' THEN (v_u->>'bathrooms')::numeric ELSE 1 END,
          CASE
            WHEN (v_u->>'furnished_status') = 'furnished' THEN 'fully_furnished'
            WHEN (v_u->>'furnished_status') IN ('unfurnished', 'semi_furnished', 'fully_furnished') THEN (v_u->>'furnished_status')
            ELSE 'unfurnished'
          END,
          false
        )
        RETURNING id INTO v_existing_unit_id;
      END IF;
      v_kept_unit_ids := ARRAY[v_existing_unit_id];
    END IF;

    -- Retire any units omitted from the approved snapshot while preserving agreement rows
    UPDATE public.rental_units
      SET is_retired = true,
          is_available = false,
          updated_at = pg_catalog.now()
      WHERE property_id = p_property_id
        AND NOT (id = ANY(v_kept_unit_ids))
        AND NOT is_retired;

    UPDATE public.rental_agreements
      SET status = 'cancelled',
          updated_at = pg_catalog.now()
      WHERE property_id = p_property_id
        AND NOT (unit_id = ANY(v_kept_unit_ids))
        AND status NOT IN ('agreed', 'cancelled');

    UPDATE public.property_submissions
      SET review_status = 'approved', document_applicability_decision = p_document_decision, rejection_note = NULL
      WHERE owner_id = v_submission.owner_id AND operation_id = v_submission.operation_id;
  ELSIF p_decision = 'rejected' THEN
    IF v_existing_prop.status = 'approved' THEN
      v_status := 'rejected';
      UPDATE public.property_submissions
        SET review_status = 'rejected', rejection_note = p_note, document_applicability_decision = p_document_decision
        WHERE owner_id = v_submission.owner_id AND operation_id = v_submission.operation_id;
    ELSE
      UPDATE public.properties
        SET status = 'rejected', moderation_note = p_note, updated_at = pg_catalog.now()
        WHERE id = p_property_id AND status = 'pending'
        RETURNING status INTO v_status;
      UPDATE public.property_submissions
        SET review_status = 'rejected', rejection_note = p_note, document_applicability_decision = p_document_decision
        WHERE owner_id = v_submission.owner_id AND operation_id = v_submission.operation_id;
    END IF;
  END IF;

  INSERT INTO public.property_reviews(admin_id, operation_id, property_id, decision, note, submission_owner_id, submission_operation_id)
  VALUES (v_admin, p_operation_id, p_property_id, p_decision, CASE WHEN p_decision = 'rejected' THEN p_note ELSE NULL END,
    v_submission.owner_id, v_submission.operation_id);

  INSERT INTO public.admin_audit_logs(operation_id, admin_id, action_type, target_type, target_id, previous_state, new_state, reason)
  VALUES (p_operation_id, v_admin,
    CASE WHEN p_decision = 'approved' THEN 'property_approved' ELSE 'property_rejected' END,
    'property', p_property_id,
    pg_catalog.jsonb_build_object('status', v_existing_prop.status, 'review_status', v_submission.review_status),
    pg_catalog.jsonb_build_object('status', v_status, 'draft_id', p_submission_draft_id, 'revision', p_submission_expected_revision, 'document_decision', p_document_decision),
    CASE WHEN p_decision = 'rejected' THEN btrim(p_note) ELSE 'Approved pending submission' END);

  RETURN pg_catalog.jsonb_build_object('status', v_status);
END;
$$;

-- Exclude retired units from landlord_set_unit_availability, set_rental_agreement_consent,
-- get_public_submitted_rentals, admin_list_properties, and _rental_thread_json

CREATE OR REPLACE FUNCTION public.landlord_set_unit_availability(
  p_unit_id uuid, p_is_available boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_unit public.rental_units%ROWTYPE;
  v_prop public.properties%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND NOT p.is_suspended
  ) THEN
    RAISE EXCEPTION 'active user account required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_unit FROM public.rental_units WHERE id = p_unit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unit not found' USING ERRCODE = 'P0002'; END IF;
  IF v_unit.is_retired THEN RAISE EXCEPTION 'retired unit cannot be modified' USING ERRCODE = '40001'; END IF;

  SELECT * INTO v_prop FROM public.properties WHERE id = v_unit.property_id;
  IF v_prop.landlord_id IS DISTINCT FROM v_actor AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND p.role = 'admin' AND NOT p.is_suspended
  ) THEN
    RAISE EXCEPTION 'not authorized to modify unit availability' USING ERRCODE = '42501';
  END IF;

  UPDATE public.rental_units SET is_available = p_is_available WHERE id = p_unit_id;
  RETURN pg_catalog.jsonb_build_object('unitId', p_unit_id, 'isAvailable', p_is_available, 'success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_rental_agreement_consent(
  p_conversation_id uuid, p_operation_id uuid, p_agree boolean DEFAULT true, p_unit_id uuid DEFAULT NULL
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

  SELECT * INTO v_conv FROM public.rental_conversations WHERE id = p_conversation_id;
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

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('rental-agreement:' || p_conversation_id::text, 0));

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

    IF v_both_agreed THEN
      UPDATE public.rental_units SET is_available = false WHERE id = v_unit_id;
      UPDATE public.rental_agreements SET status = 'cancelled', updated_at = pg_catalog.now()
        WHERE unit_id = v_unit_id AND id <> v_agreement.id AND status NOT IN ('agreed', 'cancelled');
    END IF;
  ELSE
    IF v_agreement.id IS NOT NULL THEN
      UPDATE public.rental_agreements SET status = 'cancelled', updated_at = pg_catalog.now() WHERE id = v_agreement.id
      RETURNING * INTO v_agreement;
    END IF;
  END IF;

  v_result := pg_catalog.jsonb_build_object(
    'agreementId', v_agreement.id,
    'unitId', v_agreement.unit_id,
    'status', v_agreement.status,
    'renterAgreed', v_agreement.renter_agreed_at IS NOT NULL,
    'landlordAgreed', v_agreement.landlord_agreed_at IS NOT NULL,
    'bothAgreed', v_agreement.status = 'agreed'
  );

  INSERT INTO public.rental_agreement_ops(actor_id, operation_id, conversation_id, agree, requested_unit_id, result)
  VALUES (v_actor, p_operation_id, p_conversation_id, p_agree, p_unit_id, v_result);

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_submitted_rentals()
RETURNS TABLE (
  id uuid, title text, description text, price numeric, property_type text, rental_type text,
  latitude double precision, longitude double precision, address text, barangay text, city text,
  max_occupants integer, floor_area_sqm numeric, bathroom_type text, tenant_policy text,
  amenities jsonb, photo_paths text[], moderation_status text, created_at timestamptz,
  available_units_count integer, total_units_count integer, units jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH latest_approved_submission AS (
    SELECT s.property_id, s.draft_id, s.expected_revision, s.snapshot_payload, s.snapshot_media,
           r.created_at AS review_created_at
    FROM public.property_submissions s
    JOIN public.property_reviews r
      ON r.property_id = s.property_id
     AND r.submission_owner_id = s.owner_id
     AND r.submission_operation_id = s.operation_id
     AND r.decision = 'approved'
    JOIN public.admin_audit_logs a
      ON a.admin_id = r.admin_id
     AND a.operation_id = r.operation_id
     AND a.target_type = 'property'
     AND a.target_id = r.property_id
     AND a.action_type = 'property_approved'
     AND a.new_state->>'status' = 'approved'
     AND a.new_state->>'draft_id' = s.draft_id::text
     AND a.new_state->>'revision' = s.expected_revision::text
    WHERE r.created_at >= s.created_at
      AND a.created_at >= s.created_at
  ),
  ranked_submissions AS (
    SELECT p.id, p.title, p.description, u.monthly_rent AS price, p.property_type, u.rental_type,
           p.latitude::double precision, p.longitude::double precision,
           p.street_address AS address, p.barangay, p.city,
           u.max_occupants, u.floor_area_sqm,
           NULLIF(l.snapshot_payload->'unit'->>'bathroom_type', '') AS bathroom_type,
           NULLIF(l.snapshot_payload->'unit'->>'tenant_policy', '') AS tenant_policy,
           CASE WHEN pg_catalog.jsonb_typeof(l.snapshot_payload->'amenities') = 'array'
                THEN l.snapshot_payload->'amenities' ELSE '[]'::jsonb END AS amenities,
           CASE WHEN l.snapshot_payload IS NOT NULL THEN ARRAY(
               SELECT dedup.object_path
               FROM (
                 SELECT DISTINCT ON (COALESCE(e.elem->>'content_sha256', e.elem->>'object_path'))
                       e.elem->>'object_path' AS object_path, e.ord
                 FROM pg_catalog.jsonb_array_elements(
                        CASE WHEN pg_catalog.jsonb_typeof(l.snapshot_media) = 'array'
                             THEN l.snapshot_media ELSE '[]'::jsonb END
                      ) WITH ORDINALITY AS e(elem, ord)
                 WHERE e.elem->>'kind' = 'photo'
                   AND e.elem->>'object_path' ~ '^[0-9a-f-]+/[0-9a-f-]+/[0-9a-f-]+/[0-9a-f]{64}\.(jpg|png|webp)$'
                 ORDER BY COALESCE(e.elem->>'content_sha256', e.elem->>'object_path'), e.ord
               ) dedup
               ORDER BY dedup.ord
             )
             ELSE '{}'::text[] END AS photo_paths,
           p.status AS moderation_status, p.created_at,
           u_summary.available_units_count,
           u_summary.total_units_count,
           u_summary.units_json AS units,
           ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY l.review_created_at DESC NULLS LAST) AS rn
    FROM public.properties p
    JOIN LATERAL (
      SELECT u.* FROM public.rental_units u
      WHERE u.property_id = p.id AND u.is_available = true AND NOT u.is_retired
      ORDER BY u.created_at ASC, u.id ASC LIMIT 1
    ) u ON true
    JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE ru.is_available = true)::integer AS available_units_count,
        COUNT(*)::integer AS total_units_count,
        COALESCE(pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', ru.id,
            'unit_number', COALESCE(ru.unit_number, 'Room ' || ord::text),
            'rental_type', ru.rental_type,
            'monthly_rent', ru.monthly_rent,
            'max_occupants', ru.max_occupants,
            'is_available', ru.is_available
          ) ORDER BY ru.created_at ASC, ru.id ASC
        ), '[]'::jsonb) AS units_json
      FROM (
        SELECT ru.*, ROW_NUMBER() OVER (ORDER BY ru.created_at ASC, ru.id ASC) AS ord
        FROM public.rental_units ru
        WHERE ru.property_id = p.id AND NOT ru.is_retired
      ) ru
    ) u_summary ON u_summary.available_units_count > 0
    LEFT JOIN LATERAL (
      SELECT s.* FROM public.property_submissions s
      JOIN latest_approved_submission approved
        ON approved.property_id = s.property_id
       AND approved.draft_id = s.draft_id
       AND approved.expected_revision = s.expected_revision
      WHERE s.property_id = p.id
      ORDER BY approved.review_created_at DESC NULLS LAST, s.created_at DESC, s.operation_id DESC LIMIT 1
    ) s ON true
    LEFT JOIN latest_approved_submission l
      ON l.property_id = p.id
     AND l.draft_id = s.draft_id
     AND l.expected_revision = s.expected_revision
    WHERE p.status = 'approved'
      AND p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.profiles owner
                  WHERE owner.id = p.landlord_id AND NOT owner.is_suspended)
  )
  SELECT id, title, description, price, property_type, rental_type,
         latitude, longitude, address, barangay, city,
         max_occupants, floor_area_sqm,
         bathroom_type, tenant_policy, amenities,
         photo_paths, moderation_status, created_at,
         available_units_count, total_units_count, units
  FROM ranked_submissions
  WHERE rn = 1
  ORDER BY created_at DESC, id ASC
  LIMIT 200;
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
      'hasPendingRevision', (p.status = 'approved' AND s.review_status = 'pending'),
      'fieldVerificationStatus', s.field_verification_status,
      'fieldVerifiedBy', s.field_verified_by,
      'fieldVerifiedAt', s.field_verified_at,
      'fieldVerificationMethod', s.field_verification_method,
      'fieldVerificationNotes', s.field_verification_notes,
      'fieldVerificationProof', s.field_verification_proof,
      'permitApplicability', s.snapshot_payload->'property'->>'permit_applicability',
      'permitNumber', s.snapshot_payload->'property'->>'permit_number',
      'permitLgu', s.snapshot_payload->'property'->>'permit_lgu',
      'permitExpiresOn', s.snapshot_payload->'property'->>'permit_expires_on',
      'permitNotRequiredConfirmed', (s.snapshot_payload->'property'->>'permit_not_required_confirmed' = 'true'),
      'permitExemptionReason', s.snapshot_payload->'property'->>'permit_exemption_reason',
      'documentCategories', s.snapshot_payload->'property'->>'document_categories',
      'documentApplicabilityDecision', s.document_applicability_decision,
      'photoPaths', pg_catalog.to_jsonb(CASE WHEN s.snapshot_payload IS NULL THEN
        ARRAY(
          SELECT m.object_path FROM public.property_draft_media m
          WHERE m.draft_id = s.draft_id AND m.confirmed AND m.released_at IS NULL AND m.kind = 'photo'
          ORDER BY m.created_at)
        ELSE ARRAY(
          SELECT e.elem->>'object_path'
          FROM pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(s.snapshot_media) = 'array' THEN s.snapshot_media ELSE '[]'::jsonb END)
            WITH ORDINALITY AS e(elem, ord)
          WHERE e.elem->>'kind' = 'photo' AND e.elem->>'object_path' IS NOT NULL ORDER BY e.ord)
        END),
      'permitPaths', pg_catalog.to_jsonb(CASE WHEN s.snapshot_payload IS NULL THEN
        ARRAY(
          SELECT m.object_path FROM public.property_draft_media m
          WHERE m.draft_id = s.draft_id AND m.confirmed AND m.released_at IS NULL AND m.kind = 'permit'
          ORDER BY m.created_at)
        ELSE ARRAY(
          SELECT e.elem->>'object_path'
          FROM pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(s.snapshot_media) = 'array' THEN s.snapshot_media ELSE '[]'::jsonb END)
            WITH ORDINALITY AS e(elem, ord)
          WHERE e.elem->>'kind' = 'permit' AND e.elem->>'object_path' IS NOT NULL ORDER BY e.ord)
        END),
      'createdAt', p.created_at, 'updatedAt', p.updated_at) AS j
    FROM public.properties p
    LEFT JOIN public.profiles owner ON owner.id = p.landlord_id
    LEFT JOIN LATERAL (
      SELECT u.* FROM public.rental_units u WHERE u.property_id = p.id AND NOT u.is_retired ORDER BY u.created_at ASC, u.id ASC LIMIT 1
    ) u ON true
    LEFT JOIN LATERAL (
      SELECT s.* FROM public.property_submissions s WHERE s.property_id = p.id AND s.superseded_by IS NULL
      ORDER BY s.created_at DESC LIMIT 1
    ) s ON true
    WHERE (p_status IS NULL OR p_status = 'all' OR p.status = p_status OR (p_status = 'pending' AND p.status = 'approved' AND s.review_status = 'pending'))
      AND (v_search IS NULL OR pg_catalog.strpos(lower(p.title || ' ' || p.street_address || ' ' || p.barangay || ' ' || p.city || ' ' || COALESCE(owner.full_name, '')), v_search) > 0)
    ORDER BY p.updated_at DESC, p.created_at DESC, p.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100) OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) t;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public._rental_thread_json(p_conversation_id uuid, p_viewer uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  r record;
  v_blocked boolean;
  v_blocked_by_viewer boolean;
  v_status text;
BEGIN
  SELECT c.*, cp.id AS cp_id, cp.full_name AS cp_name, cp.avatar_url AS cp_avatar, cp.role AS cp_role,
         cp.is_suspended AS cp_suspended,
         lo.id AS lo_id, lo.full_name AS lo_name, lo.avatar_url AS lo_avatar, lo.role AS lo_role,
         lo.is_suspended AS lo_suspended,
         li.title, li.price, li.address, li.city, li.status AS li_status, li.available, li.photo
    INTO r
  FROM public.rental_conversations c
  JOIN public.profiles cp ON cp.id = CASE WHEN c.renter_id = p_viewer THEN c.landlord_id ELSE c.renter_id END
  LEFT JOIN public.profiles lo ON lo.id = c.landlord_id
  LEFT JOIN LATERAL (
    SELECT p.title, u.monthly_rent AS price, p.street_address AS address, p.city, p.status,
      COALESCE((p.status = 'approved' OR p.status = 'pending') AND COALESCE(u.is_available, true), false) AS available,
      COALESCE(
        (SELECT e.elem->>'object_path'
           FROM public.property_submissions s,
             pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(s.snapshot_media) = 'array' THEN s.snapshot_media ELSE '[]'::jsonb END)
               WITH ORDINALITY AS e(elem, ord)
          WHERE s.property_id = p.id AND s.superseded_by IS NULL AND e.elem->>'kind' = 'photo'
          ORDER BY s.created_at DESC, e.ord LIMIT 1),
        (SELECT m.object_path
           FROM public.property_submissions s
           JOIN public.property_draft_media m ON m.draft_id = s.draft_id
          WHERE s.property_id = p.id AND s.superseded_by IS NULL
            AND m.confirmed AND m.released_at IS NULL AND m.kind = 'photo'
          ORDER BY s.created_at DESC, m.created_at LIMIT 1)
      ) AS photo
    FROM public.properties p
    LEFT JOIN LATERAL (
      SELECT u2.monthly_rent, u2.is_available FROM public.rental_units u2 WHERE u2.property_id = p.id AND NOT u2.is_retired
      ORDER BY u2.is_available DESC, u2.created_at, u2.id LIMIT 1
    ) u ON true
    WHERE c.listing_source = 'property' AND p.id = c.listing_id
    UNION ALL
    SELECT l.title, l.price, l.address, l.city, l.status,
      (l.status = 'published' AND l.is_available) AS available, l.image_urls[1] AS photo
    FROM public.listings l
    WHERE c.listing_source = 'listing' AND l.id = c.listing_id
  ) li ON true
  WHERE c.id = p_conversation_id;

  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(pg_catalog.bool_or(true), false),
         COALESCE(pg_catalog.bool_or(b.blocker_id = p_viewer), false)
    INTO v_blocked, v_blocked_by_viewer
  FROM public.user_blocks b
  WHERE (b.blocker_id = r.renter_id AND b.blocked_id = r.landlord_id)
     OR (b.blocker_id = r.landlord_id AND b.blocked_id = r.renter_id);

  v_status := COALESCE(r.li_status, 'removed');

  RETURN pg_catalog.jsonb_build_object(
    'id', r.id,
    'listingSource', r.listing_source,
    'listingId', r.listing_id,
    'listingTitle', COALESCE(r.title, 'Listing unavailable'),
    'listingPrice', r.price,
    'listingAddress', r.address,
    'listingCity', r.city,
    'listingStatus', v_status,
    'listingAvailable', COALESCE(r.available, false),
    'listingPhotoPath', r.photo,
    'counterpart', pg_catalog.jsonb_build_object(
      'id', r.cp_id, 'fullName', r.cp_name, 'avatarUrl', r.cp_avatar, 'role', r.cp_role, 'isSuspended', r.cp_suspended),
    'listingOwner', CASE WHEN r.lo_id IS NULL THEN NULL ELSE pg_catalog.jsonb_build_object(
      'id', r.lo_id, 'fullName', r.lo_name, 'avatarUrl', r.lo_avatar, 'role', r.lo_role, 'isSuspended', r.lo_suspended) END,
    'unreadCount', CASE WHEN r.renter_id = p_viewer THEN r.renter_unread_count ELSE r.landlord_unread_count END,
    'isArchived', (CASE WHEN r.renter_id = p_viewer THEN r.renter_archived_at ELSE r.landlord_archived_at END) IS NOT NULL,
    'isBlocked', v_blocked,
    'blockedByViewer', v_blocked_by_viewer,
    'canSend', r.status = 'active' AND NOT r.cp_suspended AND NOT v_blocked AND v_status IN ('approved', 'pending', 'published'),
    'lastMessagePreview', r.last_message_preview,
    'lastMessageAt', r.last_message_at,
    'createdAt', r.created_at
  );
END;
$$;

COMMIT;
