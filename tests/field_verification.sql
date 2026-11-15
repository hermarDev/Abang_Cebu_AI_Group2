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
DO $$
DECLARE v_item jsonb;
BEGIN
 v_item := public.verifier_get_queue_property('bf100000-0000-4000-8000-000000000001');
 IF v_item IS NULL OR v_item->>'id' <> 'bf100000-0000-4000-8000-000000000001' OR v_item->>'title' <> 'Test property' OR v_item->>'propertyType' <> 'house'
   OR NOT (v_item ?& ARRAY['latitude','longitude','landlordId','landlordName','submissionDraftId','submissionExpectedRevision','submissionOperationId','submissionCreatedAt','fieldVerificationStatus','fieldVerificationProof']) THEN
   RAISE EXCEPTION 'authorized FVO property lookup returned incomplete or wrong item';
 END IF;
 IF public.verifier_get_queue_property('bf100000-0000-4000-8000-000000000099') IS NOT NULL THEN
   RAISE EXCEPTION 'missing property lookup returned a result';
 END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','af100000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 BEGIN
  PERFORM public.verifier_get_queue_property('bf100000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'landlord used verifier property lookup';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','af100000-0000-4000-8000-000000000003',true);
-- Seed storage.objects row in bucket field-verification-media with property ID bf100000-0000-4000-8000-000000000001 as segment 2 of object_path
INSERT INTO storage.objects (bucket_id, name, owner, owner_id)
VALUES (
  'field-verification-media',
  'af100000-0000-4000-8000-000000000003/bf100000-0000-4000-8000-000000000001/33333333-3333-4333-8333-333333333333/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg',
  'af100000-0000-4000-8000-000000000003',
  'af100000-0000-4000-8000-000000000003'
)
ON CONFLICT DO NOTHING;
SELECT public.verifier_submit_verification(
  'bf100000-0000-4000-8000-000000000001','cf100000-0000-4000-8000-000000000001','df100000-0000-4000-8000-000000000001',1,'verified','site_visit','Valid notes',
  '[{"kind":"proof","object_path":"af100000-0000-4000-8000-000000000003/bf100000-0000-4000-8000-000000000001/33333333-3333-4333-8333-333333333333/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"}]'::jsonb,
  'Caregiver','Property manager'
);
SELECT public.verifier_submit_verification(
  'bf100000-0000-4000-8000-000000000001','cf100000-0000-4000-8000-000000000001','df100000-0000-4000-8000-000000000001',1,'verified','site_visit','Valid notes',
  '[{"kind":"proof","object_path":"af100000-0000-4000-8000-000000000003/bf100000-0000-4000-8000-000000000001/33333333-3333-4333-8333-333333333333/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"}]'::jsonb,
  'Caregiver','Property manager'
);
DO $$ BEGIN
 BEGIN
  PERFORM public.verifier_submit_verification('bf100000-0000-4000-8000-000000000001','cf100000-0000-4000-8000-000000000009','df100000-0000-4000-8000-000000000001',1,'verified','video_call','Valid notes','[]'::jsonb);
  RAISE EXCEPTION 'legacy method write was allowed on new contract';
 EXCEPTION WHEN invalid_text_representation OR invalid_parameter_value THEN NULL;
 WHEN others THEN
   IF SQLERRM LIKE '%invalid verification%' OR SQLSTATE = '22023' THEN NULL; ELSE RAISE; END IF;
 END;
END $$;
DO $$ BEGIN
 BEGIN
  PERFORM public.verifier_submit_verification('bf100000-0000-4000-8000-000000000001','cf100000-0000-4000-8000-000000000010','df100000-0000-4000-8000-000000000001',1,'verified','site_visit','Valid notes',
    '[{"kind":"photo","object_path":"af100000-0000-4000-8000-000000000003/bf100000-0000-4000-8000-000000000001/33333333-3333-4333-8333-333333333333/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"}]'::jsonb);
  RAISE EXCEPTION 'legacy proof kind was allowed on new contract';
 EXCEPTION WHEN others THEN IF SQLSTATE = '22023' THEN NULL; ELSE RAISE; END IF;
 END;
END $$;
SELECT set_config('request.jwt.claim.sub','af100000-0000-4000-8000-000000000002',true);
SELECT public.review_property('bf100000-0000-4000-8000-000000000001','cf100000-0000-4000-8000-000000000002','approved',NULL,'df100000-0000-4000-8000-000000000001',1);
SELECT public.review_property('bf100000-0000-4000-8000-000000000001','cf100000-0000-4000-8000-000000000002','approved',NULL,'df100000-0000-4000-8000-000000000001',1);
ROLLBACK;