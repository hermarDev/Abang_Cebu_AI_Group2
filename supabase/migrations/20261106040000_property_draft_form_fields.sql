-- Extend draft form values without changing save or retry semantics.
BEGIN;
CREATE OR REPLACE FUNCTION public.save_property_draft(p_operation_id uuid, p_payload jsonb)
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
    OR ((p_payload->'property') - ARRAY['title','description','property_type','street_address','barangay','city','postal_code','latitude','longitude','location_id','location_name','location_detail','permit_applicability','permit_number','permit_lgu','permit_expires_on','permit_not_required_confirmed']) <> '{}'::jsonb
    OR ((p_payload->'unit') - ARRAY['rental_type','monthly_rent','security_deposit','advance_rent','bedrooms','bathrooms','floor_area_sqm','max_occupants','furnished_status','available_from','minimum_lease_months','bathroom_type']) <> '{}'::jsonb
    OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_payload->'property') e
      WHERE e.key IN ('location_id','location_name','location_detail','permit_applicability','permit_number','permit_lgu','permit_expires_on','permit_not_required_confirmed')
      AND (pg_catalog.jsonb_typeof(e.value) NOT IN ('string','null') OR pg_catalog.length(e.value #>> '{}') > CASE e.key WHEN 'location_id' THEN 200 WHEN 'location_name' THEN 180 WHEN 'location_detail' THEN 240 WHEN 'permit_number' THEN 100 WHEN 'permit_lgu' THEN 200 ELSE 20 END))
    OR (p_payload->'property'->>'permit_applicability' IS NOT NULL AND p_payload->'property'->>'permit_applicability' NOT IN ('','required','not_required'))
    OR (p_payload->'property'->>'permit_not_required_confirmed' IS NOT NULL AND p_payload->'property'->>'permit_not_required_confirmed' NOT IN ('','true','false'))
    OR (p_payload->'unit'->>'bathroom_type' IS NOT NULL AND (pg_catalog.jsonb_typeof(p_payload->'unit'->'bathroom_type') <> 'string' OR p_payload->'unit'->>'bathroom_type' NOT IN ('','private','shared')))
    OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_payload->'property') e WHERE pg_catalog.jsonb_typeof(e.value) NOT IN ('string','number','null'))
    OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_payload->'unit') e WHERE pg_catalog.jsonb_typeof(e.value) NOT IN ('string','number','null')) THEN
    RAISE EXCEPTION 'invalid draft payload' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('property-draft-owner:' || v_owner::text, 0));
  SELECT id,original_payload INTO v_id,v_payload FROM public.property_drafts
    WHERE owner_id=v_owner AND operation_id=p_operation_id;
  IF v_id IS NOT NULL THEN
    IF v_payload IS DISTINCT FROM p_payload THEN
      RAISE EXCEPTION 'operation already used for different draft' USING ERRCODE = '23505';
    END IF;
    RETURN v_id;
  END IF;
  IF (SELECT count(*) FROM public.property_drafts WHERE owner_id = v_owner) >= 50 THEN
    RAISE EXCEPTION 'property draft limit reached' USING ERRCODE = '54000';
  END IF;
  INSERT INTO public.property_drafts(owner_id,operation_id,payload,original_payload)
    VALUES (v_owner,p_operation_id,p_payload,p_payload) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_property_draft(p_draft_id uuid, p_operation_id uuid, p_expected_revision bigint, p_payload jsonb)
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
    OR ((p_payload->'property') - ARRAY['title','description','property_type','street_address','barangay','city','postal_code','latitude','longitude','location_id','location_name','location_detail','permit_applicability','permit_number','permit_lgu','permit_expires_on','permit_not_required_confirmed']) <> '{}'::jsonb
    OR ((p_payload->'unit') - ARRAY['rental_type','monthly_rent','security_deposit','advance_rent','bedrooms','bathrooms','floor_area_sqm','max_occupants','furnished_status','available_from','minimum_lease_months','bathroom_type']) <> '{}'::jsonb
    OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_payload->'property') e
      WHERE e.key IN ('location_id','location_name','location_detail','permit_applicability','permit_number','permit_lgu','permit_expires_on','permit_not_required_confirmed')
      AND (pg_catalog.jsonb_typeof(e.value) NOT IN ('string','null') OR pg_catalog.length(e.value #>> '{}') > CASE e.key WHEN 'location_id' THEN 200 WHEN 'location_name' THEN 180 WHEN 'location_detail' THEN 240 WHEN 'permit_number' THEN 100 WHEN 'permit_lgu' THEN 200 ELSE 20 END))
    OR (p_payload->'property'->>'permit_applicability' IS NOT NULL AND p_payload->'property'->>'permit_applicability' NOT IN ('','required','not_required'))
    OR (p_payload->'property'->>'permit_not_required_confirmed' IS NOT NULL AND p_payload->'property'->>'permit_not_required_confirmed' NOT IN ('','true','false'))
    OR (p_payload->'unit'->>'bathroom_type' IS NOT NULL AND (pg_catalog.jsonb_typeof(p_payload->'unit'->'bathroom_type') <> 'string' OR p_payload->'unit'->>'bathroom_type' NOT IN ('','private','shared')))
    OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_payload->'property') e WHERE pg_catalog.jsonb_typeof(e.value) NOT IN ('string','number','null'))
    OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_payload->'unit') e WHERE pg_catalog.jsonb_typeof(e.value) NOT IN ('string','number','null')) THEN
    RAISE EXCEPTION 'invalid draft payload' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('property-draft-update-owner:' || v_owner::text, 0));
  DELETE FROM public.property_draft_updates
    WHERE owner_id = v_owner AND created_at < pg_catalog.clock_timestamp() - interval '30 days';
  SELECT * INTO v_previous FROM public.property_draft_updates WHERE owner_id = v_owner AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_previous.draft_id IS DISTINCT FROM p_draft_id OR v_previous.expected_revision IS DISTINCT FROM p_expected_revision OR v_previous.payload_sha256 IS DISTINCT FROM public.property_draft_payload_digest(p_payload) THEN
      RAISE EXCEPTION 'operation already used for different draft update' USING ERRCODE = '23505';
    END IF;
    RETURN v_previous.result_revision;
  END IF;
  IF (SELECT count(*) FROM public.property_draft_updates WHERE owner_id = v_owner) >= 1000 THEN
    RAISE EXCEPTION 'property draft update limit reached' USING ERRCODE = '54000';
  END IF;
  UPDATE public.property_drafts SET payload = p_payload, revision = revision + 1
    WHERE id = p_draft_id AND owner_id = v_owner AND revision = p_expected_revision AND revision < 9223372036854775807
    RETURNING revision INTO v_revision;
  IF v_revision IS NULL THEN
    RAISE EXCEPTION 'draft changed or unavailable' USING ERRCODE = '40001';
  END IF;
  INSERT INTO public.property_draft_updates(owner_id, operation_id, draft_id, expected_revision, payload_sha256, result_revision)
    VALUES (v_owner, p_operation_id, p_draft_id, p_expected_revision, public.property_draft_payload_digest(p_payload), v_revision);
  RETURN v_revision;
END;
$$;

COMMIT;
