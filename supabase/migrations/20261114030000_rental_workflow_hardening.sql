-- Forward migration: rental workflow hardening (multi-unit persistence, verifier proof/revision, agreement idempotency & suspension guards)
BEGIN;

-- 1. Operation idempotency table for rental agreement consent
CREATE TABLE IF NOT EXISTS public.rental_agreement_ops (
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.rental_conversations(id) ON DELETE CASCADE,
  agree boolean NOT NULL,
  requested_unit_id uuid,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (actor_id, operation_id)
);

ALTER TABLE public.rental_agreement_ops ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rental_agreement_ops FROM PUBLIC, anon, authenticated;

-- 2. Draft functions allowing and validating optional top-level `units` array
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
    OR (p_payload - 'property' - 'unit' - 'amenities' - 'units') <> '{}'::jsonb
    OR (p_payload ? 'amenities' AND (pg_catalog.jsonb_typeof(p_payload->'amenities') <> 'array'
      OR p_payload->'amenities' <@ '["wifi","aircon","cooking","laundry","water_included","electricity_included","motorcycle_parking","car_parking"]'::jsonb IS NOT TRUE))
    OR (p_payload ? 'units' AND (
      pg_catalog.jsonb_typeof(p_payload->'units') <> 'array'
      OR pg_catalog.jsonb_array_length(p_payload->'units') > 50
      OR EXISTS (
        SELECT 1 FROM pg_catalog.jsonb_array_elements(p_payload->'units') u
        WHERE pg_catalog.jsonb_typeof(u.value) <> 'object'
          OR (u.value - ARRAY['unit_number','monthly_rent','max_occupants','rental_type']) <> '{}'::jsonb
          OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(u.value) ue WHERE pg_catalog.jsonb_typeof(ue.value) NOT IN ('string','number','null'))
          OR (u.value ? 'unit_number' AND pg_catalog.length(COALESCE(u.value->>'unit_number','')) > 80)
          OR (u.value ? 'rental_type' AND COALESCE(u.value->>'rental_type','') NOT IN ('','entire_place','private_room','shared_room','bedspace'))
      )
    ))
    OR ((p_payload->'property') - ARRAY['title','description','property_type','street_address','barangay','city','postal_code','latitude','longitude','location_id','location_name','location_detail','permit_applicability','permit_number','permit_lgu','permit_expires_on','permit_not_required_confirmed','permit_exemption_reason','document_categories']) <> '{}'::jsonb
    OR ((p_payload->'unit') - ARRAY['rental_type','monthly_rent','security_deposit','advance_rent','bedrooms','bathrooms','floor_area_sqm','max_occupants','furnished_status','available_from','minimum_lease_months','bathroom_type','tenant_policy']) <> '{}'::jsonb
    OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_payload->'property') e
      WHERE e.key IN ('location_id','location_name','location_detail','permit_applicability','permit_number','permit_lgu','permit_expires_on','permit_not_required_confirmed','permit_exemption_reason','document_categories')
      AND (pg_catalog.jsonb_typeof(e.value) NOT IN ('string','null') OR pg_catalog.length(e.value #>> '{}') > CASE e.key WHEN 'location_id' THEN 200 WHEN 'location_name' THEN 180 WHEN 'location_detail' THEN 240 WHEN 'permit_number' THEN 100 WHEN 'permit_lgu' THEN 200 WHEN 'permit_exemption_reason' THEN 1000 WHEN 'document_categories' THEN 1000 ELSE 20 END))
    OR (p_payload->'property'->>'permit_applicability' IS NOT NULL AND p_payload->'property'->>'permit_applicability' NOT IN ('','required','not_required'))
    OR (p_payload->'property'->>'permit_not_required_confirmed' IS NOT NULL AND p_payload->'property'->>'permit_not_required_confirmed' NOT IN ('','true','false'))
    OR (p_payload->'unit'->>'bathroom_type' IS NOT NULL AND (pg_catalog.jsonb_typeof(p_payload->'unit'->'bathroom_type') <> 'string' OR p_payload->'unit'->>'bathroom_type' NOT IN ('','private','shared')))
    OR ((p_payload->'unit' ? 'tenant_policy') AND (pg_catalog.jsonb_typeof(p_payload->'unit'->'tenant_policy') <> 'string' OR p_payload->'unit'->>'tenant_policy' NOT IN ('any','female_only','male_only','mixed')))
    OR (p_payload->'unit'->>'furnished_status' IS NOT NULL AND (pg_catalog.jsonb_typeof(p_payload->'unit'->'furnished_status') <> 'string' OR p_payload->'unit'->>'furnished_status' NOT IN ('','unfurnished','semi_furnished','furnished','fully_furnished')))
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
    OR (p_payload - 'property' - 'unit' - 'amenities' - 'units') <> '{}'::jsonb
    OR (p_payload ? 'amenities' AND (pg_catalog.jsonb_typeof(p_payload->'amenities') <> 'array'
      OR p_payload->'amenities' <@ '["wifi","aircon","cooking","laundry","water_included","electricity_included","motorcycle_parking","car_parking"]'::jsonb IS NOT TRUE))
    OR (p_payload ? 'units' AND (
      pg_catalog.jsonb_typeof(p_payload->'units') <> 'array'
      OR pg_catalog.jsonb_array_length(p_payload->'units') > 50
      OR EXISTS (
        SELECT 1 FROM pg_catalog.jsonb_array_elements(p_payload->'units') u
        WHERE pg_catalog.jsonb_typeof(u.value) <> 'object'
          OR (u.value - ARRAY['unit_number','monthly_rent','max_occupants','rental_type']) <> '{}'::jsonb
          OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(u.value) ue WHERE pg_catalog.jsonb_typeof(ue.value) NOT IN ('string','number','null'))
          OR (u.value ? 'unit_number' AND pg_catalog.length(COALESCE(u.value->>'unit_number','')) > 80)
          OR (u.value ? 'rental_type' AND COALESCE(u.value->>'rental_type','') NOT IN ('','entire_place','private_room','shared_room','bedspace'))
      )
    ))
    OR ((p_payload->'property') - ARRAY['title','description','property_type','street_address','barangay','city','postal_code','latitude','longitude','location_id','location_name','location_detail','permit_applicability','permit_number','permit_lgu','permit_expires_on','permit_not_required_confirmed','permit_exemption_reason','document_categories']) <> '{}'::jsonb
    OR ((p_payload->'unit') - ARRAY['rental_type','monthly_rent','security_deposit','advance_rent','bedrooms','bathrooms','floor_area_sqm','max_occupants','furnished_status','available_from','minimum_lease_months','bathroom_type','tenant_policy']) <> '{}'::jsonb
    OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_payload->'property') e
      WHERE e.key IN ('location_id','location_name','location_detail','permit_applicability','permit_number','permit_lgu','permit_expires_on','permit_not_required_confirmed','permit_exemption_reason','document_categories')
      AND (pg_catalog.jsonb_typeof(e.value) NOT IN ('string','null') OR pg_catalog.length(e.value #>> '{}') > CASE e.key WHEN 'location_id' THEN 200 WHEN 'location_name' THEN 180 WHEN 'location_detail' THEN 240 WHEN 'permit_number' THEN 100 WHEN 'permit_lgu' THEN 200 WHEN 'permit_exemption_reason' THEN 1000 WHEN 'document_categories' THEN 1000 ELSE 20 END))
    OR (p_payload->'property'->>'permit_applicability' IS NOT NULL AND p_payload->'property'->>'permit_applicability' NOT IN ('','required','not_required'))
    OR (p_payload->'property'->>'permit_not_required_confirmed' IS NOT NULL AND p_payload->'property'->>'permit_not_required_confirmed' NOT IN ('','true','false'))
    OR (p_payload->'unit'->>'bathroom_type' IS NOT NULL AND (pg_catalog.jsonb_typeof(p_payload->'unit'->'bathroom_type') <> 'string' OR p_payload->'unit'->>'bathroom_type' NOT IN ('','private','shared')))
    OR ((p_payload->'unit' ? 'tenant_policy') AND (pg_catalog.jsonb_typeof(p_payload->'unit'->'tenant_policy') <> 'string' OR p_payload->'unit'->>'tenant_policy' NOT IN ('any','female_only','male_only','mixed')))
    OR (p_payload->'unit'->>'furnished_status' IS NOT NULL AND (pg_catalog.jsonb_typeof(p_payload->'unit'->'furnished_status') <> 'string' OR p_payload->'unit'->>'furnished_status' NOT IN ('','unfurnished','semi_furnished','furnished','fully_furnished')))
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

-- 3. Multi-unit persistence in submit_property_from_draft and review_property
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
        DELETE FROM public.rental_units WHERE property_id = v_property;
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
              END
          WHERE id = (SELECT u.id FROM public.rental_units u WHERE u.property_id = v_property ORDER BY u.created_at ASC, u.id ASC LIMIT 1);
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
  v_units jsonb;
  v_unit_elem jsonb;
  v_existing_unit_id uuid;
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

    v_units := v_submission.snapshot_payload->'units';
    IF v_units IS NOT NULL AND pg_catalog.jsonb_typeof(v_units) = 'array' AND pg_catalog.jsonb_array_length(v_units) > 0 THEN
      FOR v_unit_elem IN SELECT elem FROM pg_catalog.jsonb_array_elements(v_units) WITH ORDINALITY AS u(elem, ord) ORDER BY u.ord LOOP
        SELECT u.id INTO v_existing_unit_id FROM public.rental_units u
          WHERE u.property_id = p_property_id AND u.unit_number = btrim(v_unit_elem->>'unit_number')
          ORDER BY u.created_at ASC LIMIT 1;
        IF v_existing_unit_id IS NOT NULL THEN
          UPDATE public.rental_units
            SET rental_type = COALESCE(NULLIF(v_unit_elem->>'rental_type',''), rental_type),
                monthly_rent = CASE WHEN (v_unit_elem->>'monthly_rent') IS NOT NULL AND (v_unit_elem->>'monthly_rent') <> '' THEN (v_unit_elem->>'monthly_rent')::numeric ELSE monthly_rent END,
                max_occupants = CASE WHEN (v_unit_elem->>'max_occupants') IS NOT NULL AND (v_unit_elem->>'max_occupants') <> '' THEN GREATEST(1, (v_unit_elem->>'max_occupants')::integer) ELSE max_occupants END
            WHERE id = v_existing_unit_id;
        ELSE
          INSERT INTO public.rental_units(property_id, unit_number, rental_type, monthly_rent, max_occupants)
          VALUES (
            p_property_id,
            btrim(v_unit_elem->>'unit_number'),
            COALESCE(NULLIF(v_unit_elem->>'rental_type',''), COALESCE(v_submission.snapshot_payload->'unit'->>'rental_type', 'private_room')),
            (v_unit_elem->>'monthly_rent')::numeric,
            GREATEST(1, COALESCE(NULLIF(v_unit_elem->>'max_occupants','')::integer, 1))
          );
        END IF;
      END LOOP;
    ELSE
      UPDATE public.rental_units
        SET rental_type = COALESCE(v_submission.snapshot_payload->'unit'->>'rental_type', rental_type),
            monthly_rent = CASE WHEN (v_submission.snapshot_payload->'unit'->>'monthly_rent') IS NOT NULL AND (v_submission.snapshot_payload->'unit'->>'monthly_rent') <> '' THEN (v_submission.snapshot_payload->'unit'->>'monthly_rent')::numeric ELSE monthly_rent END,
            max_occupants = CASE WHEN (v_submission.snapshot_payload->'unit'->>'max_occupants') IS NOT NULL AND (v_submission.snapshot_payload->'unit'->>'max_occupants') <> '' THEN GREATEST(1, (v_submission.snapshot_payload->'unit'->>'max_occupants')::integer) ELSE max_occupants END,
            floor_area_sqm = CASE WHEN (v_submission.snapshot_payload->'unit'->>'floor_area_sqm') IS NOT NULL AND (v_submission.snapshot_payload->'unit'->>'floor_area_sqm') <> '' THEN (v_submission.snapshot_payload->'unit'->>'floor_area_sqm')::numeric ELSE floor_area_sqm END,
            bedrooms = CASE WHEN (v_submission.snapshot_payload->'unit'->>'bedrooms') IS NOT NULL AND (v_submission.snapshot_payload->'unit'->>'bedrooms') <> '' THEN (v_submission.snapshot_payload->'unit'->>'bedrooms')::integer ELSE bedrooms END,
            bathrooms = CASE WHEN (v_submission.snapshot_payload->'unit'->>'bathrooms') IS NOT NULL AND (v_submission.snapshot_payload->'unit'->>'bathrooms') <> '' THEN (v_submission.snapshot_payload->'unit'->>'bathrooms')::numeric ELSE bathrooms END,
            furnished_status = CASE
              WHEN (v_submission.snapshot_payload->'unit'->>'furnished_status') = 'furnished' THEN 'fully_furnished'
              WHEN (v_submission.snapshot_payload->'unit'->>'furnished_status') IN ('unfurnished', 'semi_furnished', 'fully_furnished') THEN (v_submission.snapshot_payload->'unit'->>'furnished_status')
              ELSE furnished_status
            END
        WHERE id = (SELECT u.id FROM public.rental_units u WHERE u.property_id = p_property_id ORDER BY u.created_at ASC, u.id ASC LIMIT 1);
    END IF;

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

-- 4. Require existing storage.objects record in field-verification-media bound to p_property_id
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
  v_proof_elem jsonb;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND p.role::text IN ('verification_officer','admin') AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active verifier or admin required' USING ERRCODE = '42501';
  END IF;
  IF p_property_id IS NULL OR p_operation_id IS NULL OR p_submission_draft_id IS NULL OR p_submission_expected_revision IS NULL OR p_submission_expected_revision < 1
     OR p_status IS NULL OR p_status NOT IN ('verified','flagged') OR p_method IS NULL OR p_method NOT IN ('site_visit','video_call','proxy_meeting')
     OR length(pg_catalog.btrim(COALESCE(p_notes,''))) NOT BETWEEN 5 AND 2000
     OR pg_catalog.jsonb_typeof(v_proof) <> 'array' OR pg_catalog.octet_length(v_proof::text) > 32768
     OR (p_method = 'proxy_meeting' AND (NULLIF(pg_catalog.btrim(p_proxy_name),'') IS NULL OR NULLIF(pg_catalog.btrim(p_proxy_relationship),'') IS NULL)) THEN
    RAISE EXCEPTION 'invalid verification' USING ERRCODE = '22023';
  END IF;

  IF p_status = 'verified' AND pg_catalog.jsonb_array_length(v_proof) < 1 THEN
    RAISE EXCEPTION 'verification requires at least one proof item' USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.jsonb_array_length(v_proof) > 0 THEN
    FOR v_proof_elem IN SELECT * FROM pg_catalog.jsonb_array_elements(v_proof) LOOP
      IF pg_catalog.jsonb_typeof(v_proof_elem) <> 'object'
         OR v_proof_elem->>'kind' IS NULL OR v_proof_elem->>'kind' NOT IN ('photo','document','meeting_minutes')
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
      OR v_existing.proof IS DISTINCT FROM v_proof OR v_existing.proxy_name IS DISTINCT FROM p_proxy_name
      OR v_existing.proxy_relationship IS DISTINCT FROM p_proxy_relationship THEN
      RAISE EXCEPTION 'operation already used for different verification' USING ERRCODE = '23505';
    END IF;
    RETURN pg_catalog.jsonb_build_object('propertyId',p_property_id,'status',v_existing.status,'replayed',true);
  END IF;

  SELECT * INTO v_submission FROM public.property_submissions s
    WHERE s.property_id = p_property_id AND s.draft_id = p_submission_draft_id AND s.expected_revision = p_submission_expected_revision
      AND s.superseded_by IS NULL AND s.review_status = 'pending'
    ORDER BY s.created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission revision changed or unavailable' USING ERRCODE = '40001'; END IF;

  UPDATE public.property_submissions SET field_verification_status = p_status, field_verified_by = v_actor,
    field_verified_at = pg_catalog.now(), field_verification_method = p_method, field_verification_notes = pg_catalog.btrim(p_notes),
    field_verification_proof = v_proof, field_verification_proxy_name = p_proxy_name, field_verification_proxy_relationship = p_proxy_relationship
    WHERE owner_id = v_submission.owner_id AND operation_id = v_submission.operation_id;

  INSERT INTO public.property_field_verifications(officer_id,operation_id,submission_owner_id,submission_operation_id,property_id,draft_id,expected_revision,status,method,notes,proof,proxy_name,proxy_relationship)
    VALUES(v_actor,p_operation_id,v_submission.owner_id,v_submission.operation_id,p_property_id,p_submission_draft_id,p_submission_expected_revision,p_status,p_method,pg_catalog.btrim(p_notes),v_proof,p_proxy_name,p_proxy_relationship);

  INSERT INTO public.admin_audit_logs(admin_id, operation_id, target_type, target_id, action_type, previous_state, new_state, reason)
    VALUES (v_actor, p_operation_id, 'property', p_property_id,
      CASE WHEN p_status = 'verified' THEN 'property_field_verified' ELSE 'property_field_flagged' END,
      pg_catalog.jsonb_build_object('field_verification_status', v_submission.field_verification_status),
      pg_catalog.jsonb_build_object('field_verification_status', p_status, 'method', p_method, 'draft_id', p_submission_draft_id, 'revision', p_submission_expected_revision),
      CASE WHEN p_status = 'verified' THEN 'Field verification completed' ELSE 'Field verification flagged issues' END);

  RETURN pg_catalog.jsonb_build_object('propertyId',p_property_id,'status',p_status,'replayed',false);
END;
$$;

-- 5. Expose pending revision snapshot fields in verifier_list_queue
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
    WHERE (p_status IS NULL OR p_status = 'all' OR s.field_verification_status = p_status)
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

-- 6. Active profile enforcement on unit availability and idempotent property-bound rental agreement consent
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

  -- Look for active agreement in this conversation
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
        WHERE property_id = v_property_id AND is_available = true
        ORDER BY created_at ASC LIMIT 1;
      IF v_unit_id IS NULL THEN
        RAISE EXCEPTION 'no available units for this property' USING ERRCODE = '40001';
      END IF;
    END IF;

    -- Lock selected unit and ensure it belongs to the conversation's property and is available
    SELECT * INTO v_unit FROM public.rental_units
      WHERE id = v_unit_id AND property_id = v_property_id AND is_available = true
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

COMMIT;
