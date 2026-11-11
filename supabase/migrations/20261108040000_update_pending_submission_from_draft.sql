-- Resubmitting a newer revision of the same draft updates its existing pending/rejected listing in place
-- instead of creating a duplicate property. Approved listings are never overwritten here.
BEGIN;
CREATE OR REPLACE FUNCTION public.submit_property_from_draft(p_operation_id uuid, p_draft_id uuid, p_expected_revision bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_draft public.property_drafts%ROWTYPE;
  v_previous public.property_submissions%ROWTYPE;
  v_active_sub public.property_submissions%ROWTYPE;
  v_existing_status text;
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
    RETURN pg_catalog.jsonb_build_object('property_id', v_previous.property_id, 'status', 'pending');
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
    FROM public.property_draft_media m WHERE m.draft_id = p_draft_id AND m.confirmed AND m.released_at IS NULL;

  SELECT * INTO v_active_sub FROM public.property_submissions
    WHERE owner_id = v_owner AND draft_id = p_draft_id AND superseded_by IS NULL
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    SELECT status INTO v_existing_status FROM public.properties
      WHERE id = v_active_sub.property_id AND landlord_id = v_owner FOR UPDATE;
    IF NOT FOUND OR v_existing_status NOT IN ('pending', 'rejected') THEN
      RAISE EXCEPTION 'property cannot be updated in its current review status' USING ERRCODE = '40001';
    END IF;
    v_property := v_active_sub.property_id;
    UPDATE public.properties
      SET title = v_p->>'title', description = v_p->>'description', property_type = v_p->>'property_type',
          street_address = v_p->>'street_address', barangay = v_p->>'barangay', city = v_p->>'city',
          coordinates = extensions.ST_SetSRID(extensions.ST_MakePoint((v_p->>'longitude')::numeric, (v_p->>'latitude')::numeric), 4326),
          status = 'pending', moderation_note = NULL, approved_by = NULL, approved_at = NULL
      WHERE id = v_property AND landlord_id = v_owner;
    UPDATE public.rental_units
      SET rental_type = v_u->>'rental_type',
          monthly_rent = (v_u->>'monthly_rent')::numeric,
          max_occupants = GREATEST(1, COALESCE(NULLIF(v_u->>'max_occupants','')::integer, 1))
      WHERE id = (SELECT u.id FROM public.rental_units u WHERE u.property_id = v_property ORDER BY u.created_at ASC, u.id ASC LIMIT 1);
    INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media)
    VALUES (v_owner, p_operation_id, p_draft_id, p_expected_revision, v_property, v_draft.payload, COALESCE(v_media, '[]'::jsonb));
    UPDATE public.property_submissions SET superseded_by = p_operation_id
      WHERE owner_id = v_owner AND property_id = v_property AND operation_id <> p_operation_id AND superseded_by IS NULL;
  ELSE
    INSERT INTO public.properties(landlord_id, title, description, property_type, street_address, barangay, city, coordinates)
    VALUES (v_owner, v_p->>'title', v_p->>'description', v_p->>'property_type', v_p->>'street_address', v_p->>'barangay', v_p->>'city',
      extensions.ST_SetSRID(extensions.ST_MakePoint((v_p->>'longitude')::numeric, (v_p->>'latitude')::numeric), 4326))
    RETURNING id INTO v_property;
    INSERT INTO public.rental_units(property_id, rental_type, monthly_rent, max_occupants)
    VALUES (v_property, v_u->>'rental_type', (v_u->>'monthly_rent')::numeric, GREATEST(1, COALESCE(NULLIF(v_u->>'max_occupants','')::integer, 1)));
    INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media)
    VALUES (v_owner, p_operation_id, p_draft_id, p_expected_revision, v_property, v_draft.payload, COALESCE(v_media, '[]'::jsonb));
  END IF;
  RETURN pg_catalog.jsonb_build_object('property_id', v_property, 'status', 'pending');
END;
$$;
REVOKE ALL ON FUNCTION public.submit_property_from_draft(uuid,uuid,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_property_from_draft(uuid,uuid,bigint) TO authenticated;
COMMIT;
