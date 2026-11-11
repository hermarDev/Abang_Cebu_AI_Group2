-- Phase 3: Property classifications, documents, revisions, and location locking.
BEGIN;

-- 1. Extend property_submissions with review status and document decisions
ALTER TABLE public.property_submissions
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS document_applicability_decision text CHECK (document_applicability_decision IS NULL OR document_applicability_decision IN ('documents_verified', 'exemption_accepted', 'documents_required')),
  ADD COLUMN IF NOT EXISTS rejection_note text;

UPDATE public.property_submissions s
  SET review_status = CASE p.status WHEN 'approved' THEN 'approved' WHEN 'rejected' THEN 'rejected' ELSE 'pending' END
  FROM public.properties p
  WHERE p.id = s.property_id;

-- 2. Extend admin_audit_logs action_type to allow property_location_corrected
ALTER TABLE public.admin_audit_logs
  DROP CONSTRAINT IF EXISTS admin_audit_logs_action_type_check;

ALTER TABLE public.admin_audit_logs
  ADD CONSTRAINT admin_audit_logs_action_type_check CHECK (action_type IN (
    'property_approved', 'property_rejected', 'property_unpublished', 'property_restored',
    'account_suspended', 'account_reinstated', 'report_resolved', 'report_dismissed', 'report_evidence_viewed',
    'property_location_corrected'
  ));

-- 3. Update save_property_draft and update_property_draft to allow permit_exemption_reason, document_categories, and furnished_status
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
    OR (p_payload - 'property' - 'unit' - 'amenities') <> '{}'::jsonb
    OR (p_payload ? 'amenities' AND (pg_catalog.jsonb_typeof(p_payload->'amenities') <> 'array'
      OR p_payload->'amenities' <@ '["wifi","aircon","cooking","laundry","water_included","electricity_included","motorcycle_parking","car_parking"]'::jsonb IS NOT TRUE))
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

-- 4. Update submit_property_from_draft: conditional specs, approved revision location lock, live listing preservation
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
      INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media, review_status)
      VALUES (v_owner, p_operation_id, p_draft_id, p_expected_revision, v_property, v_draft.payload, COALESCE(v_media, '[]'::jsonb), 'pending');
      UPDATE public.property_submissions SET superseded_by = p_operation_id
        WHERE owner_id = v_owner AND property_id = v_property AND operation_id <> p_operation_id AND superseded_by IS NULL;
    ELSIF v_existing_prop.status = 'approved' THEN
      -- Location is admin-owned once approved; pin the snapshot to the live values.
      v_draft.payload := pg_catalog.jsonb_set(v_draft.payload, '{property}', v_p || pg_catalog.jsonb_build_object(
        'street_address', v_existing_prop.street_address, 'barangay', v_existing_prop.barangay, 'city', v_existing_prop.city,
        'latitude', v_existing_prop.latitude, 'longitude', v_existing_prop.longitude));
      v_property := v_active_sub.property_id;
      -- Live listing remains visible to renters on the map while revision awaits Admin review
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
    INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media, review_status)
    VALUES (v_owner, p_operation_id, p_draft_id, p_expected_revision, v_property, v_draft.payload, COALESCE(v_media, '[]'::jsonb), 'pending');
  END IF;
  RETURN pg_catalog.jsonb_build_object('property_id', v_property, 'status', 'pending');
END;
$$;
REVOKE ALL ON FUNCTION public.submit_property_from_draft(uuid,uuid,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_property_from_draft(uuid,uuid,bigint) TO authenticated;

-- 5. Update review_property: support revisions for approved properties, document applicability decision
DROP FUNCTION IF EXISTS public.review_property(uuid,uuid,text,text,uuid,bigint);

CREATE OR REPLACE FUNCTION public.trg_notify_on_property_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_owner uuid;
  v_prop_title text;
  v_title text;
  v_body text;
BEGIN
  SELECT landlord_id, title INTO v_owner, v_prop_title FROM public.properties WHERE id = NEW.property_id;
  IF NOT FOUND OR v_owner IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.decision = 'approved' THEN
    v_title := 'Listing approved';
    v_body := 'Your property "' || COALESCE(v_prop_title, 'Listing') || '" has been approved and is now live.';
  ELSE
    v_title := 'Listing review update';
    v_body := 'Your property "' || COALESCE(v_prop_title, 'Listing') || '" requires changes: ' || COALESCE(NEW.note, 'Please see review notes.');
    IF length(v_body) > 180 THEN
      v_body := pg_catalog.substr(v_body, 1, 177) || '...';
    END IF;
  END IF;

  INSERT INTO public.notifications (recipient_id, actor_id, type, title, body, link, entity_type, entity_id)
  VALUES (v_owner, NEW.admin_id, 'listing_review', v_title, v_body, '/landlord/dashboard', 'property', NEW.property_id);

  RETURN NEW;
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
REVOKE ALL ON FUNCTION public.review_property(uuid,uuid,text,text,uuid,bigint,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_property(uuid,uuid,text,text,uuid,bigint,text) TO authenticated;

-- 6. Update admin_list_properties: include approved properties with pending revision, extra metadata
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
      'permitApplicability', s.snapshot_payload->'property'->>'permit_applicability',
      'permitNumber', s.snapshot_payload->'property'->>'permit_number',
      'permitLgu', s.snapshot_payload->'property'->>'permit_lgu',
      'permitExpiresOn', s.snapshot_payload->'property'->>'permit_expires_on',
      'permitNotRequiredConfirmed', (s.snapshot_payload->'property'->>'permit_not_required_confirmed' = 'true'),
      'permitExemptionReason', s.snapshot_payload->'property'->>'permit_exemption_reason',
      'documentCategories', s.snapshot_payload->'property'->>'document_categories',
      'documentApplicabilityDecision', s.document_applicability_decision,
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
    WHERE (p_status IS NULL OR p_status = 'all' OR p.status = p_status OR (p_status = 'pending' AND p.status = 'approved' AND s.review_status = 'pending'))
      AND (v_search IS NULL OR pg_catalog.strpos(lower(p.title || ' ' || p.street_address || ' ' || p.barangay || ' ' || p.city || ' ' || COALESCE(owner.full_name, '')), v_search) > 0)
    ORDER BY p.updated_at DESC, p.created_at DESC, p.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100) OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) t;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_properties(text,text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_properties(text,text,integer,integer) TO authenticated;

-- 7. Add admin_update_property_location
CREATE OR REPLACE FUNCTION public.admin_update_property_location(
  p_property_id uuid,
  p_operation_id uuid,
  p_street_address text,
  p_barangay text,
  p_city text,
  p_latitude numeric,
  p_longitude numeric,
  p_reason text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_audit public.admin_audit_logs%ROWTYPE;
  v_prop public.properties%ROWTYPE;
  v_result jsonb;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_property_id IS NULL OR p_operation_id IS NULL
    OR p_street_address IS NULL OR length(btrim(p_street_address)) = 0 OR length(p_street_address) > 1000
    OR p_barangay IS NULL OR length(btrim(p_barangay)) = 0 OR length(p_barangay) > 200
    OR p_city IS NULL OR length(btrim(p_city)) = 0 OR length(p_city) > 200
    OR p_latitude IS NULL OR p_latitude < -90 OR p_latitude > 90
    OR p_longitude IS NULL OR p_longitude < -180 OR p_longitude > 180
    OR length(btrim(COALESCE(p_reason, ''))) NOT BETWEEN 5 AND 1000 THEN
    RAISE EXCEPTION 'invalid location update' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('property-review:' || p_property_id::text, 0));
  SELECT * INTO v_audit FROM public.admin_audit_logs WHERE admin_id = v_admin AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_audit.target_id IS DISTINCT FROM p_property_id OR v_audit.action_type IS DISTINCT FROM 'property_location_corrected' THEN
      RAISE EXCEPTION 'operation already used for different change' USING ERRCODE = '23505';
    END IF;
    RETURN v_audit.new_state;
  END IF;
  SELECT * INTO v_prop FROM public.properties WHERE id = p_property_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'property not found' USING ERRCODE = '22023'; END IF;

  UPDATE public.properties
  SET street_address = btrim(p_street_address),
      barangay = btrim(p_barangay),
      city = btrim(p_city),
      coordinates = extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326),
      updated_at = pg_catalog.now()
  WHERE id = p_property_id;

  v_result := pg_catalog.jsonb_build_object(
    'propertyId', p_property_id,
    'streetAddress', btrim(p_street_address),
    'barangay', btrim(p_barangay),
    'city', btrim(p_city),
    'latitude', p_latitude,
    'longitude', p_longitude,
    'status', v_prop.status
  );

  INSERT INTO public.admin_audit_logs(operation_id, admin_id, action_type, target_type, target_id, previous_state, new_state, reason)
  VALUES (
    p_operation_id,
    v_admin,
    'property_location_corrected',
    'property',
    p_property_id,
    pg_catalog.jsonb_build_object(
      'streetAddress', v_prop.street_address,
      'barangay', v_prop.barangay,
      'city', v_prop.city,
      'latitude', v_prop.latitude,
      'longitude', v_prop.longitude
    ),
    v_result,
    btrim(p_reason)
  );

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_property_location(uuid,uuid,text,text,text,numeric,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_property_location(uuid,uuid,text,text,text,numeric,numeric,text) TO authenticated;

COMMIT;
