\set ON_ERROR_STOP on
BEGIN;
-- Fixture inserts require the project's normal auth signup trigger and migrations.
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('af100000-0000-4000-8000-000000000001', '{"role":"landlord","full_name":"Owner"}'),
 ('af100000-0000-4000-8000-000000000002', '{"role":"admin","full_name":"Admin"}'),
 ('af100000-0000-4000-8000-000000000003', '{"role":"verification_officer","full_name":"Officer"}');
-- Public signup must not assign privileged roles.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.profiles WHERE id IN ('af100000-0000-4000-8000-000000000002','af100000-0000-4000-8000-000000000003') AND role::text <> 'renter') THEN
   RAISE EXCEPTION 'public signup assigned privileged role';
 END IF;
END $$;
UPDATE public.profiles SET role = 'admin' WHERE id = 'af100000-0000-4000-8000-000000000002';
UPDATE public.profiles SET role = 'verification_officer' WHERE id = 'af100000-0000-4000-8000-000000000003';
INSERT INTO public.property_drafts(id,owner_id,operation_id,payload,original_payload)
VALUES ('df100000-0000-4000-8000-000000000001','af100000-0000-4000-8000-000000000001',gen_random_uuid(),'{"property":{},"unit":{}}','{"property":{},"unit":{}}');
INSERT INTO public.properties(id,landlord_id,title,description,property_type,street_address,barangay,city,coordinates,status)
VALUES ('bf100000-0000-4000-8000-000000000001','af100000-0000-4000-8000-000000000001','Test property','Description','house','Street','Apas','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326),'pending');
INSERT INTO public.rental_units(property_id,rental_type,monthly_rent) VALUES ('bf100000-0000-4000-8000-000000000001','private_room',5000);
INSERT INTO public.property_submissions(owner_id,operation_id,draft_id,expected_revision,property_id,snapshot_payload,snapshot_media,review_status)
VALUES ('af100000-0000-4000-8000-000000000001','ef100000-0000-4000-8000-000000000001','df100000-0000-4000-8000-000000000001',1,'bf100000-0000-4000-8000-000000000001','{"property":{},"unit":{}}','[]','pending');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','af100000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
 BEGIN
  PERFORM public.review_property('bf100000-0000-4000-8000-000000000001',gen_random_uuid(),'approved',NULL,'df100000-0000-4000-8000-000000000001',1);
  RAISE EXCEPTION 'unverified approval was allowed';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','af100000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 BEGIN
  PERFORM public.verifier_submit_verification('bf100000-0000-4000-8000-000000000001',gen_random_uuid(),'df100000-0000-4000-8000-000000000001',1,'verified','site_visit','Valid notes');
  RAISE EXCEPTION 'landlord verified own submission';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','af100000-0000-4000-8000-000000000003',true);
SELECT public.verifier_submit_verification(
  'bf100000-0000-4000-8000-000000000001','cf100000-0000-4000-8000-000000000001','df100000-0000-4000-8000-000000000001',1,'verified','site_visit','Valid notes',
  '[{"kind":"photo","object_path":"11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"}]'::jsonb
);
SELECT public.verifier_submit_verification(
  'bf100000-0000-4000-8000-000000000001','cf100000-0000-4000-8000-000000000001','df100000-0000-4000-8000-000000000001',1,'verified','site_visit','Valid notes',
  '[{"kind":"photo","object_path":"11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"}]'::jsonb
);
SELECT set_config('request.jwt.claim.sub','af100000-0000-4000-8000-000000000002',true);
SELECT public.review_property('bf100000-0000-4000-8000-000000000001','cf100000-0000-4000-8000-000000000002','approved',NULL,'df100000-0000-4000-8000-000000000001',1);
SELECT public.review_property('bf100000-0000-4000-8000-000000000001','cf100000-0000-4000-8000-000000000002','approved',NULL,'df100000-0000-4000-8000-000000000001',1);
ROLLBACK;
