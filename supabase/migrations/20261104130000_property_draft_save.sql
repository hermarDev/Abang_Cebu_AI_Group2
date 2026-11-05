-- Private, immutable draft attempts. Submission and media remain separate workflows.
BEGIN;
CREATE TABLE public.property_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  payload jsonb NOT NULL,
  original_payload jsonb NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, operation_id)
);
ALTER TABLE public.property_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.property_drafts TO authenticated;
CREATE POLICY property_drafts_owner_read ON public.property_drafts FOR SELECT TO authenticated
  USING (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'landlord' AND NOT p.is_suspended));

CREATE FUNCTION public.save_property_draft(p_operation_id uuid, p_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_id uuid;
  v_payload jsonb;
BEGIN
  IF v_owner IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id = v_owner AND p.role = 'landlord' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active landlord required' USING ERRCODE = '42501';
  END IF;
  IF p_operation_id IS NULL OR p_payload IS NULL OR pg_catalog.jsonb_typeof(p_payload) <> 'object'
    OR pg_catalog.octet_length(p_payload::text) > 32768
    OR NOT (p_payload ? 'property') OR NOT (p_payload ? 'unit')
    OR pg_catalog.jsonb_typeof(p_payload->'property') <> 'object'
    OR pg_catalog.jsonb_typeof(p_payload->'unit') <> 'object'
    OR (p_payload - 'property' - 'unit' - 'amenities') <> '{}'::jsonb
    OR (p_payload ? 'amenities' AND (pg_catalog.jsonb_typeof(p_payload->'amenities') <> 'array'
      OR p_payload->'amenities' <@ '["wifi","aircon","cooking","laundry","water_included","electricity_included","motorcycle_parking","car_parking"]'::jsonb IS NOT TRUE))
    OR ((p_payload->'property') - ARRAY['title','description','property_type','street_address','barangay','city','postal_code','latitude','longitude']) <> '{}'::jsonb
    OR ((p_payload->'unit') - ARRAY['rental_type','monthly_rent','security_deposit','advance_rent','bedrooms','bathrooms','floor_area_sqm','max_occupants','furnished_status','available_from','minimum_lease_months']) <> '{}'::jsonb
    OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_payload->'property') e WHERE pg_catalog.jsonb_typeof(e.value) NOT IN ('string','number','null'))
    OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_payload->'unit') e WHERE pg_catalog.jsonb_typeof(e.value) NOT IN ('string','number','null')) THEN
    RAISE EXCEPTION 'invalid draft payload' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.property_drafts(owner_id,operation_id,payload,original_payload)
    VALUES (v_owner,p_operation_id,p_payload,p_payload) ON CONFLICT (owner_id,operation_id) DO NOTHING
    RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT id,original_payload INTO v_id,v_payload FROM public.property_drafts
      WHERE owner_id=v_owner AND operation_id=p_operation_id;
    IF v_id IS NULL OR v_payload IS DISTINCT FROM p_payload THEN
      RAISE EXCEPTION 'operation already used for different draft' USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_property_draft(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_property_draft(uuid,jsonb) TO authenticated;

CREATE TABLE public.property_draft_updates (
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  draft_id uuid NOT NULL REFERENCES public.property_drafts(id) ON DELETE CASCADE,
  expected_revision bigint NOT NULL,
  payload jsonb NOT NULL,
  result_revision bigint NOT NULL,
  PRIMARY KEY(owner_id, operation_id)
);
ALTER TABLE public.property_draft_updates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_draft_updates FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.update_property_draft(p_draft_id uuid, p_operation_id uuid, p_expected_revision bigint, p_payload jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_revision bigint;
  v_previous public.property_draft_updates%ROWTYPE;
BEGIN
  IF v_owner IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = v_owner AND p.role = 'landlord' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active landlord required' USING ERRCODE = '42501';
  END IF;
  IF p_draft_id IS NULL OR p_operation_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision < 1
    OR p_payload IS NULL OR pg_catalog.jsonb_typeof(p_payload) <> 'object'
    OR pg_catalog.octet_length(p_payload::text) > 32768
    OR NOT (p_payload ? 'property') OR NOT (p_payload ? 'unit')
    OR pg_catalog.jsonb_typeof(p_payload->'property') <> 'object'
    OR pg_catalog.jsonb_typeof(p_payload->'unit') <> 'object'
    OR (p_payload - 'property' - 'unit' - 'amenities') <> '{}'::jsonb
    OR (p_payload ? 'amenities' AND (pg_catalog.jsonb_typeof(p_payload->'amenities') <> 'array'
      OR p_payload->'amenities' <@ '["wifi","aircon","cooking","laundry","water_included","electricity_included","motorcycle_parking","car_parking"]'::jsonb IS NOT TRUE))
    OR ((p_payload->'property') - ARRAY['title','description','property_type','street_address','barangay','city','postal_code','latitude','longitude']) <> '{}'::jsonb
    OR ((p_payload->'unit') - ARRAY['rental_type','monthly_rent','security_deposit','advance_rent','bedrooms','bathrooms','floor_area_sqm','max_occupants','furnished_status','available_from','minimum_lease_months']) <> '{}'::jsonb
    OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_payload->'property') e WHERE pg_catalog.jsonb_typeof(e.value) NOT IN ('string','number','null'))
    OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_payload->'unit') e WHERE pg_catalog.jsonb_typeof(e.value) NOT IN ('string','number','null')) THEN
    RAISE EXCEPTION 'invalid draft payload' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_owner::text || ':' || p_operation_id::text, 0));
  SELECT * INTO v_previous FROM public.property_draft_updates WHERE owner_id = v_owner AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_previous.draft_id IS DISTINCT FROM p_draft_id OR v_previous.expected_revision IS DISTINCT FROM p_expected_revision OR v_previous.payload IS DISTINCT FROM p_payload THEN
      RAISE EXCEPTION 'operation already used for different draft update' USING ERRCODE = '23505';
    END IF;
    RETURN v_previous.result_revision;
  END IF;
  UPDATE public.property_drafts SET payload = p_payload, revision = revision + 1
    WHERE id = p_draft_id AND owner_id = v_owner AND revision = p_expected_revision AND revision < 9223372036854775807
    RETURNING revision INTO v_revision;
  IF v_revision IS NULL THEN
    RAISE EXCEPTION 'draft changed or unavailable' USING ERRCODE = '40001';
  END IF;
  INSERT INTO public.property_draft_updates(owner_id, operation_id, draft_id, expected_revision, payload, result_revision)
    VALUES (v_owner, p_operation_id, p_draft_id, p_expected_revision, p_payload, v_revision);
  RETURN v_revision;
END;
$$;
REVOKE ALL ON FUNCTION public.update_property_draft(uuid,uuid,bigint,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_property_draft(uuid,uuid,bigint,jsonb) TO authenticated;
COMMIT;
