-- Idempotent submission from an owner-bound draft; pending property and first unit are created atomically.
BEGIN;
CREATE TABLE IF NOT EXISTS public.property_submissions (
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  draft_id uuid NOT NULL REFERENCES public.property_drafts(id) ON DELETE CASCADE,
  expected_revision bigint NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  PRIMARY KEY (owner_id, operation_id)
);
ALTER TABLE public.property_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_submissions FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_property_from_draft(p_operation_id uuid, p_draft_id uuid, p_expected_revision bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_draft public.property_drafts%ROWTYPE;
  v_previous public.property_submissions%ROWTYPE;
  v_property uuid;
  v_p jsonb;
  v_u jsonb;
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
  INSERT INTO public.properties(landlord_id, title, description, property_type, street_address, barangay, city, coordinates)
  VALUES (v_owner, v_p->>'title', v_p->>'description', v_p->>'property_type', v_p->>'street_address', v_p->>'barangay', v_p->>'city',
    extensions.ST_SetSRID(extensions.ST_MakePoint((v_p->>'longitude')::numeric, (v_p->>'latitude')::numeric), 4326))
  RETURNING id INTO v_property;
  INSERT INTO public.rental_units(property_id, rental_type, monthly_rent, max_occupants)
  VALUES (v_property, v_u->>'rental_type', (v_u->>'monthly_rent')::numeric, NULLIF(v_u->>'max_occupants','')::integer);
  INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id)
  VALUES (v_owner, p_operation_id, p_draft_id, p_expected_revision, v_property);
  RETURN pg_catalog.jsonb_build_object('property_id', v_property);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_property_from_draft(uuid,uuid,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_property_from_draft(uuid,uuid,bigint) TO authenticated;
COMMIT;
