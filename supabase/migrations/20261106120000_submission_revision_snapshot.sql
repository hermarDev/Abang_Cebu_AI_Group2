-- Immutable submitted-revision evidence: snapshot draft payload and confirmed media at submission,
-- and bind admin review to that exact submission revision.
BEGIN;
ALTER TABLE public.property_submissions
  ADD COLUMN IF NOT EXISTS snapshot_payload jsonb,
  ADD COLUMN IF NOT EXISTS snapshot_media jsonb;

CREATE OR REPLACE FUNCTION public.submit_property_from_draft(p_operation_id uuid, p_draft_id uuid, p_expected_revision bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_draft public.property_drafts%ROWTYPE;
  v_previous public.property_submissions%ROWTYPE;
  v_property uuid;
  v_p jsonb;
  v_u jsonb;
  v_media jsonb;
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
    RETURN pg_catalog.jsonb_build_object('property_id', v_previous.property_id);
  END IF;
  IF EXISTS (SELECT 1 FROM public.property_submissions WHERE draft_id = p_draft_id AND expected_revision = p_expected_revision AND owner_id = v_owner) THEN
    RAISE EXCEPTION 'this draft revision was already submitted' USING ERRCODE = '23505';
  END IF;
  SELECT * INTO v_draft FROM public.property_drafts WHERE id = p_draft_id AND owner_id = v_owner AND revision = p_expected_revision FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'draft changed or unavailable' USING ERRCODE = '40001'; END IF;
  v_p := v_draft.payload->'property';
  v_u := v_draft.payload->'unit';
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
  SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'operation_id', m.operation_id, 'kind', m.kind, 'content_type', m.content_type,
    'size_bytes', m.size_bytes, 'content_sha256', m.content_sha256, 'object_path', m.object_path
  ) ORDER BY m.created_at) INTO v_media
    FROM public.property_draft_media m WHERE m.draft_id = p_draft_id AND m.confirmed;
  INSERT INTO public.properties(landlord_id, title, description, property_type, street_address, barangay, city, coordinates)
  VALUES (v_owner, v_p->>'title', v_p->>'description', v_p->>'property_type', v_p->>'street_address', v_p->>'barangay', v_p->>'city',
    extensions.ST_SetSRID(extensions.ST_MakePoint((v_p->>'longitude')::numeric, (v_p->>'latitude')::numeric), 4326))
  RETURNING id INTO v_property;
  INSERT INTO public.rental_units(property_id, rental_type, monthly_rent, max_occupants)
  VALUES (v_property, v_u->>'rental_type', (v_u->>'monthly_rent')::numeric, GREATEST(1, COALESCE(NULLIF(v_u->>'max_occupants','')::integer, 1)));
  INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media)
  VALUES (v_owner, p_operation_id, p_draft_id, p_expected_revision, v_property, v_draft.payload, COALESCE(v_media, '[]'::jsonb));
  RETURN pg_catalog.jsonb_build_object('property_id', v_property);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_property_from_draft(uuid,uuid,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_property_from_draft(uuid,uuid,bigint) TO authenticated;

ALTER TABLE public.property_reviews
  ADD COLUMN IF NOT EXISTS submission_owner_id uuid,
  ADD COLUMN IF NOT EXISTS submission_operation_id uuid;

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
    OR (p_decision = 'rejected' AND (p_note IS NULL OR length(btrim(p_note)) = 0 OR length(p_note) > 1000)) THEN
    RAISE EXCEPTION 'invalid review' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('property-review:' || p_property_id::text, 0));
  SELECT * INTO v_previous FROM public.property_reviews WHERE admin_id = v_admin AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_previous.property_id IS DISTINCT FROM p_property_id OR v_previous.decision IS DISTINCT FROM p_decision OR v_previous.note IS DISTINCT FROM p_note THEN
      RAISE EXCEPTION 'operation already used for different review' USING ERRCODE = '23505';
    END IF;
    RETURN pg_catalog.jsonb_build_object('status', v_previous.decision);
  END IF;
  SELECT * INTO v_submission FROM public.property_submissions
    WHERE property_id = p_property_id
      AND (p_submission_draft_id IS NULL OR draft_id = p_submission_draft_id)
      AND (p_submission_expected_revision IS NULL OR expected_revision = p_submission_expected_revision)
    ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission revision not found' USING ERRCODE = '22023'; END IF;
  IF p_submission_draft_id IS NOT NULL AND v_submission.draft_id IS DISTINCT FROM p_submission_draft_id THEN
    RAISE EXCEPTION 'submission revision mismatch' USING ERRCODE = '23505';
  END IF;
  IF p_submission_expected_revision IS NOT NULL AND v_submission.expected_revision IS DISTINCT FROM p_submission_expected_revision THEN
    RAISE EXCEPTION 'submission revision mismatch' USING ERRCODE = '23505';
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
  RETURN pg_catalog.jsonb_build_object('status', v_status);
END;
$$;
REVOKE ALL ON FUNCTION public.review_property(uuid,uuid,text,text,uuid,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_property(uuid,uuid,text,text,uuid,bigint) TO authenticated;
DROP FUNCTION IF EXISTS public.review_property(uuid,uuid,text,text);
COMMIT;
