\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('aaaaaaaa-0000-4000-8000-000000000001', '{"role":"landlord","full_name":"Draft Owner"}'),
 ('aaaaaaaa-0000-4000-8000-000000000002', '{"role":"landlord","full_name":"Other Owner"}');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000001',true);
CREATE TEMP TABLE draft_fixture(id uuid);
GRANT SELECT, INSERT ON draft_fixture TO authenticated;
DO $$ DECLARE a uuid; p jsonb := '{"property":{"title":"Room","location_id":"osm-1","location_name":"Cebu","location_detail":"Cebu City","permit_applicability":"required","permit_number":"ABC","permit_lgu":"Cebu City","permit_expires_on":"2027-01-01","permit_not_required_confirmed":"false"},"unit":{"bathroom_type":"private","monthly_rent":5000},"amenities":["wifi"]}'::jsonb; BEGIN
 a := public.save_property_draft('bbbbbbbb-0000-4000-8000-000000000001', p);
 INSERT INTO draft_fixture VALUES (a);
 IF a <> public.save_property_draft('bbbbbbbb-0000-4000-8000-000000000001', p) THEN RAISE EXCEPTION 'create replay failed'; END IF;
 IF public.update_property_draft(a,'cccccccc-0000-4000-8000-000000000001',1,p) <> 2 THEN RAISE EXCEPTION 'update failed'; END IF;
 IF public.update_property_draft(a,'cccccccc-0000-4000-8000-000000000001',1,p) <> 2 THEN RAISE EXCEPTION 'update replay failed'; END IF;
 IF (SELECT payload FROM public.property_drafts WHERE id=a) IS DISTINCT FROM p THEN RAISE EXCEPTION 'payload lost'; END IF;
END $$;
DO $$ DECLARE bad jsonb; BEGIN
 FOR bad IN SELECT value FROM jsonb_array_elements('[{"property":{"location_id":{}},"unit":{}},{"property":{"permit_applicability":"maybe"},"unit":{}},{"property":{"permit_not_required_confirmed":"maybe"},"unit":{}},{"property":{},"unit":{"bathroom_type":"bogus"}},{"property":{"location_name":true},"unit":{}},{"property":{"unsupported":"x"},"unit":{}}]'::jsonb) LOOP
  BEGIN PERFORM public.save_property_draft('bbbbbbbb-0000-4000-8000-000000000002',bad); RAISE EXCEPTION 'invalid create payload accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.update_property_draft((SELECT id FROM draft_fixture LIMIT 1),'cccccccc-0000-4000-8000-000000000003',2,bad); RAISE EXCEPTION 'invalid update payload accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 END LOOP;
END $$;
DO $$ DECLARE p jsonb; a uuid; BEGIN
 p := jsonb_build_object('property', jsonb_build_object('location_name', repeat('é', 180), 'location_detail', repeat('x', 240), 'permit_number', repeat('y', 100), 'permit_lgu', repeat('z', 200)), 'unit', jsonb_build_object('bathroom_type', 'shared'));
 a := public.save_property_draft('bbbbbbbb-0000-4000-8000-000000000003', p);
 IF a IS NULL THEN RAISE EXCEPTION 'maximum values not accepted'; END IF;
 FOR p IN SELECT value FROM jsonb_array_elements(jsonb_build_array(
   jsonb_build_object('property', jsonb_build_object('location_name', repeat('é', 181)), 'unit', '{}'::jsonb),
   jsonb_build_object('property', jsonb_build_object('location_detail', repeat('x', 241)), 'unit', '{}'::jsonb),
   jsonb_build_object('property', jsonb_build_object('permit_number', repeat('y', 101)), 'unit', '{}'::jsonb),
   jsonb_build_object('property', jsonb_build_object('permit_lgu', repeat('z', 201)), 'unit', '{}'::jsonb)
 )) LOOP
  BEGIN PERFORM public.save_property_draft('bbbbbbbb-0000-4000-8000-000000000004',p); RAISE EXCEPTION 'over-limit field accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 END LOOP;
END $$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000002',true);
DO $$ DECLARE id uuid; BEGIN
 SELECT draft_fixture.id INTO id FROM draft_fixture;
 BEGIN PERFORM public.update_property_draft(id,'cccccccc-0000-4000-8000-000000000002',2,'{"property":{},"unit":{}}'); RAISE EXCEPTION 'cross-owner update accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;
ROLLBACK;
