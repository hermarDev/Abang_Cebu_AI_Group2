\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('aaaaaaaa-0000-4000-8000-000000000001','{"role":"landlord"}'),
 ('aaaaaaaa-0000-4000-8000-000000000002','{"role":"admin"}'),
 ('aaaaaaaa-0000-4000-8000-000000000003','{"role":"admin"}'),
 ('aaaaaaaa-0000-4000-8000-000000000004','{"role":"renter"}');
UPDATE public.profiles SET role='landlord', is_suspended=false WHERE id='aaaaaaaa-0000-4000-8000-000000000001';
UPDATE public.profiles SET role='admin', is_suspended=false WHERE id='aaaaaaaa-0000-4000-8000-000000000002';
UPDATE public.profiles SET role='admin', is_suspended=true WHERE id='aaaaaaaa-0000-4000-8000-000000000003';
UPDATE public.profiles SET role='renter', is_suspended=false WHERE id='aaaaaaaa-0000-4000-8000-000000000004';
INSERT INTO public.property_drafts(id, owner_id, operation_id, payload, original_payload) VALUES ('bbbbbbbb-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001','cccccccc-0000-4000-8000-000000000001','{"property":{},"unit":{}}','{"property":{},"unit":{}}');
INSERT INTO public.properties(id, landlord_id, title, description, property_type, street_address, barangay, city, coordinates) VALUES ('dddddddd-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001','Property','Description','house','Street','Barangay','City',extensions.ST_SetSRID(extensions.ST_MakePoint(123,10),4326));
INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media) VALUES ('aaaaaaaa-0000-4000-8000-000000000001','eeeeeeee-0000-4000-8000-000000000001','bbbbbbbb-0000-4000-8000-000000000001',1,'dddddddd-0000-4000-8000-000000000001','{"property":{"title":"Evidence"}}','[]');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000002',true);
DO $$ BEGIN IF (SELECT count(*) FROM public.property_submissions WHERE snapshot_payload->'property'->>'title'='Evidence') <> 1 THEN RAISE EXCEPTION 'active admin cannot read submitted evidence'; END IF; END $$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000003',true);
DO $$ BEGIN IF (SELECT count(*) FROM public.property_submissions) <> 0 THEN RAISE EXCEPTION 'suspended admin can read submitted evidence'; END IF; END $$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000004',true);
DO $$ BEGIN IF (SELECT count(*) FROM public.property_submissions) <> 0 THEN RAISE EXCEPTION 'renter can read submitted evidence'; END IF; END $$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000001',true);
DO $$ BEGIN IF (SELECT count(*) FROM public.property_submissions) <> 1 THEN RAISE EXCEPTION 'owner cannot read submitted evidence'; END IF; END $$;
ROLLBACK;
