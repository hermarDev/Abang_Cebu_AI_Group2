\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('aabb0000-0000-4000-8000-000000000001', '{"role":"landlord","full_name":"Tenant Policy Owner"}'),
 ('aabb0000-0000-4000-8000-000000000002', '{"role":"renter","full_name":"Tenant Policy Renter"}'),
 ('aabb0000-0000-4000-8000-000000000003', '{"role":"landlord","full_name":"Tenant Policy Suspended"}');
UPDATE public.profiles SET is_suspended = true WHERE id = 'aabb0000-0000-4000-8000-000000000003';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aabb0000-0000-4000-8000-000000000001',true);
DO $$
DECLARE
  v_policy text;
  v_payload jsonb;
  v_draft uuid;
  v_revision bigint := 1;
  v_index integer := 0;
BEGIN
  v_payload := '{"property":{},"unit":{}}'::jsonb;
  v_draft := public.save_property_draft('aabb0000-0000-4000-8001-000000000001', v_payload);
  FOR v_policy IN SELECT unnest(ARRAY['any','female_only','male_only','mixed']) LOOP
    v_index := v_index + 1;
    v_payload := jsonb_set(v_payload, '{unit,tenant_policy}', to_jsonb(v_policy));
    PERFORM public.save_property_draft(('aabb0000-0000-4000-8002-' || lpad(v_index::text, 12, '0'))::uuid, v_payload);
    v_revision := public.update_property_draft(v_draft, ('aabb0000-0000-4000-8003-' || lpad(v_index::text, 12, '0'))::uuid, v_revision, v_payload);
    IF (SELECT payload->'unit'->>'tenant_policy' FROM public.property_drafts WHERE id = v_draft) IS DISTINCT FROM v_policy THEN
      RAISE EXCEPTION 'tenant policy was not retained: %', v_policy;
    END IF;
  END LOOP;
  FOR v_payload IN SELECT value FROM jsonb_array_elements('[{"property":{},"unit":{"tenant_policy":"unknown"}},{"property":{},"unit":{"tenant_policy":null}},{"property":{},"unit":{"tenant_policy":true}},{"property":{},"unit":{"tenant_policy":1}},{"property":{},"unit":{"tenant_policy":{}}},{"property":{},"unit":{"unknown":"x"}}]'::jsonb) LOOP
    BEGIN
      PERFORM public.save_property_draft('aabb0000-0000-4000-8004-000000000001', v_payload);
      RAISE EXCEPTION 'invalid tenant policy create accepted: %', v_payload;
    EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
    BEGIN
      PERFORM public.update_property_draft(v_draft, 'aabb0000-0000-4000-8004-000000000002', v_revision, v_payload);
      RAISE EXCEPTION 'invalid tenant policy update accepted: %', v_payload;
    EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  END LOOP;
END $$;
SELECT set_config('request.jwt.claim.sub','aabb0000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
  BEGIN
    PERFORM public.save_property_draft('aabb0000-0000-4000-8005-000000000001', '{"property":{},"unit":{"tenant_policy":"any"}}');
    RAISE EXCEPTION 'renter accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','aabb0000-0000-4000-8000-000000000003',true);
DO $$ BEGIN
  BEGIN
    PERFORM public.save_property_draft('aabb0000-0000-4000-8005-000000000002', '{"property":{},"unit":{"tenant_policy":"any"}}');
    RAISE EXCEPTION 'suspended landlord accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
-- Resubmitting newer revisions of one draft updates its pending/rejected listing in place.
RESET ROLE;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('aabb0000-0000-4000-8000-000000000004', '{"role":"landlord","full_name":"Tenant Policy Admin"}');
UPDATE public.profiles SET role = 'admin', is_suspended = false WHERE id = 'aabb0000-0000-4000-8000-000000000004';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aabb0000-0000-4000-8000-000000000001',true);
DO $$
DECLARE
  v_landlord text := 'aabb0000-0000-4000-8000-000000000001';
  v_admin text := 'aabb0000-0000-4000-8000-000000000004';
  op1 uuid := 'aabb0000-0000-4000-8006-000000000001';
  op2 uuid := 'aabb0000-0000-4000-8006-000000000002';
  op3 uuid := 'aabb0000-0000-4000-8006-000000000003';
  op4 uuid := 'aabb0000-0000-4000-8006-000000000004';
  v_payload jsonb;
  v_draft uuid;
  v_property uuid;
  v_unit uuid;
  r jsonb;
BEGIN
  v_payload := jsonb_build_object(
    'property', jsonb_build_object('title','Policy Home','description','A valid description for fixture.','property_type','house','street_address','Street 1','barangay','Mabolo','city','Cebu City','latitude',10.3,'longitude',123.9,'permit_applicability','not_required','permit_not_required_confirmed','true'),
    'unit', jsonb_build_object('rental_type','private_room','monthly_rent','5000','max_occupants','2','tenant_policy','any'));
  v_draft := public.save_property_draft('aabb0000-0000-4000-8007-000000000001', v_payload);

  -- 1. Initial submission creates one pending property and unit.
  r := public.submit_property_from_draft(op1, v_draft, 1);
  v_property := (r->>'property_id')::uuid;
  IF (SELECT status FROM public.properties WHERE id = v_property) IS DISTINCT FROM 'pending'
    OR (SELECT count(*) FROM public.rental_units WHERE property_id = v_property) <> 1 THEN
    RAISE EXCEPTION 'initial submission did not create pending property and unit';
  END IF;
  SELECT id INTO v_unit FROM public.rental_units WHERE property_id = v_property;

  -- 2. Revision 2 updates the pending property and unit in place.
  v_payload := jsonb_set(jsonb_set(jsonb_set(jsonb_set(v_payload, '{property,title}', '"Policy Home v2"'),
    '{property,street_address}', '"Street 2"'), '{unit,monthly_rent}', '"6000"'), '{unit,tenant_policy}', '"female_only"');
  PERFORM public.update_property_draft(v_draft, 'aabb0000-0000-4000-8008-000000000002', 1, v_payload);
  r := public.submit_property_from_draft(op2, v_draft, 2);
  IF (r->>'property_id')::uuid IS DISTINCT FROM v_property
    OR (SELECT count(*) FROM public.properties WHERE landlord_id = v_landlord::uuid) <> 1
    OR (SELECT count(*) FROM public.rental_units WHERE property_id = v_property) <> 1
    OR NOT EXISTS (SELECT 1 FROM public.properties WHERE id = v_property AND title = 'Policy Home v2' AND street_address = 'Street 2' AND status = 'pending')
    OR NOT EXISTS (SELECT 1 FROM public.rental_units WHERE id = v_unit AND monthly_rent = 6000) THEN
    RAISE EXCEPTION 'revision 2 did not update pending property in place';
  END IF;
  IF (SELECT superseded_by FROM public.property_submissions WHERE operation_id = op1) IS DISTINCT FROM op2
    OR (SELECT superseded_by FROM public.property_submissions WHERE operation_id = op2) IS NOT NULL
    OR (SELECT snapshot_payload->'unit'->>'tenant_policy' FROM public.property_submissions WHERE operation_id = op2) IS DISTINCT FROM 'female_only' THEN
    RAISE EXCEPTION 'revision 1 submission not superseded by revision 2';
  END IF;

  -- 3. Rejected property is reset to pending by revision 3.
  PERFORM set_config('request.jwt.claim.sub', v_admin, true);
  PERFORM public.review_property(v_property, 'aabb0000-0000-4000-8009-000000000001', 'rejected', 'Fix the address', v_draft, 2);
  PERFORM set_config('request.jwt.claim.sub', v_landlord, true);
  v_payload := jsonb_set(jsonb_set(jsonb_set(v_payload, '{property,title}', '"Policy Home v3"'),
    '{unit,monthly_rent}', '"6500"'), '{unit,tenant_policy}', '"mixed"');
  PERFORM public.update_property_draft(v_draft, 'aabb0000-0000-4000-8008-000000000003', 2, v_payload);
  r := public.submit_property_from_draft(op3, v_draft, 3);
  SET LOCAL ROLE postgres; -- moderation_note is not readable by authenticated
  IF (r->>'property_id')::uuid IS DISTINCT FROM v_property
    OR (SELECT count(*) FROM public.properties WHERE landlord_id = v_landlord::uuid) <> 1
    OR NOT EXISTS (SELECT 1 FROM public.properties WHERE id = v_property AND title = 'Policy Home v3' AND status = 'pending' AND moderation_note IS NULL)
    OR NOT EXISTS (SELECT 1 FROM public.rental_units WHERE id = v_unit AND monthly_rent = 6500)
    OR (SELECT superseded_by FROM public.property_submissions WHERE operation_id = op2) IS DISTINCT FROM op3 THEN
    RAISE EXCEPTION 'revision 3 did not reset rejected property in place';
  END IF;
  SET LOCAL ROLE authenticated;

  -- 4. Approved property is never overwritten.
  PERFORM set_config('request.jwt.claim.sub', v_admin, true);
  PERFORM public.review_property(v_property, 'aabb0000-0000-4000-8009-000000000002', 'approved', NULL, v_draft, 3);
  PERFORM set_config('request.jwt.claim.sub', v_landlord, true);
  v_payload := jsonb_set(v_payload, '{property,title}', '"Policy Home v4"');
  PERFORM public.update_property_draft(v_draft, 'aabb0000-0000-4000-8008-000000000004', 3, v_payload);
  BEGIN
    PERFORM public.submit_property_from_draft(op4, v_draft, 4);
    RAISE EXCEPTION 'approved property overwritten';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE id = v_property AND title = 'Policy Home v3' AND status = 'approved')
    OR EXISTS (SELECT 1 FROM public.property_submissions WHERE operation_id = op4) THEN
    RAISE EXCEPTION 'approved property changed by rejected resubmission';
  END IF;
END $$;
-- Public submitted-rentals RPC: pending/approved only, photos only (never permits), no private columns.
RESET ROLE;
DO $$
DECLARE
  v_owner uuid := 'aabb0000-0000-4000-8000-000000000001';
  v_draft uuid; v_pending uuid; v_rejected uuid; v_archived uuid; v_prop uuid;
  v_photo text; v_permit text; v_row record; v_role text;
BEGIN
  SELECT d.id, s.property_id INTO v_draft, v_prop FROM public.property_drafts d
    JOIN public.property_submissions s ON s.draft_id = d.id AND s.superseded_by IS NULL
    WHERE d.owner_id = v_owner LIMIT 1;
  v_photo := v_owner || '/' || v_draft || '/aabb0000-0000-4000-8010-000000000001/' || repeat('c',64) || '.jpg';
  v_permit := v_owner || '/' || v_draft || '/aabb0000-0000-4000-8010-000000000002/' || repeat('d',64) || '.pdf';
  INSERT INTO public.property_draft_media(draft_id, operation_id, kind, content_type, size_bytes, content_sha256, object_path, confirmed) VALUES
    (v_draft, 'aabb0000-0000-4000-8010-000000000001', 'photo', 'image/jpeg', 7, repeat('c',64), v_photo, true),
    (v_draft, 'aabb0000-0000-4000-8010-000000000002', 'permit', 'application/pdf', 7, repeat('d',64), v_permit, true);
  -- Snapshot media is empty for this fixture, so the confirmed draft-media fallback applies.
  UPDATE public.property_submissions SET snapshot_media = '[]'::jsonb WHERE property_id = v_prop AND superseded_by IS NULL;

  INSERT INTO public.properties(landlord_id, title, description, property_type, street_address, barangay, city, coordinates, status) VALUES
    (v_owner, 'Rejected Home', 'x', 'house', 'S', 'B', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9, 10.3), 4326), 'rejected'),
    (v_owner, 'Archived Home', 'x', 'house', 'S', 'B', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9, 10.3), 4326), 'archived');
  INSERT INTO public.rental_units(property_id, rental_type, monthly_rent, max_occupants)
    SELECT id, 'private_room', 1000, 1 FROM public.properties WHERE title IN ('Rejected Home', 'Archived Home');

  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    EXECUTE format('SET LOCAL ROLE %I', v_role);
    IF v_role = 'authenticated' THEN PERFORM set_config('request.jwt.claim.sub', 'aabb0000-0000-4000-8000-000000000002', true); END IF;
    SELECT * INTO v_row FROM public.get_public_submitted_rentals() WHERE id = v_prop;
    IF NOT FOUND OR v_row.title IS DISTINCT FROM 'Policy Home v3' OR v_row.moderation_status IS DISTINCT FROM 'approved'
      OR v_row.tenant_policy IS DISTINCT FROM 'mixed' OR NOT (v_photo = ANY(v_row.photo_paths))
      OR v_permit = ANY(v_row.photo_paths) OR pg_catalog.array_length(v_row.photo_paths, 1) <> 1 THEN
      RAISE EXCEPTION '% public rental row wrong: %', v_role, to_jsonb(v_row);
    END IF;
    IF EXISTS (SELECT 1 FROM public.get_public_submitted_rentals() WHERE title IN ('Rejected Home', 'Archived Home')) THEN
      RAISE EXCEPTION '% saw rejected/archived property', v_role;
    END IF;
    IF to_jsonb(v_row)::text ~ 'landlord_id|moderation_note|owner_id' THEN RAISE EXCEPTION '% leaked private column', v_role; END IF;
    RESET ROLE;
  END LOOP;

  -- Renter favorites: allow saving submitted pending/approved properties, block rejected/archived.
  SELECT id INTO v_rejected FROM public.properties WHERE title = 'Rejected Home' LIMIT 1;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', 'aabb0000-0000-4000-8000-000000000002', true);
  INSERT INTO public.favorites(user_id, listing_id) VALUES ('aabb0000-0000-4000-8000-000000000002', v_prop);
  IF NOT EXISTS (SELECT 1 FROM public.favorites WHERE user_id = 'aabb0000-0000-4000-8000-000000000002' AND listing_id = v_prop) THEN
    RAISE EXCEPTION 'renter could not favorite approved submitted property';
  END IF;
  BEGIN
    INSERT INTO public.favorites(user_id, listing_id) VALUES ('aabb0000-0000-4000-8000-000000000002', v_rejected);
    RAISE EXCEPTION 'renter unexpectedly favorited rejected property';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  DELETE FROM public.favorites WHERE user_id = 'aabb0000-0000-4000-8000-000000000002' AND listing_id = v_prop;
  RESET ROLE;
END $$;
ROLLBACK;
