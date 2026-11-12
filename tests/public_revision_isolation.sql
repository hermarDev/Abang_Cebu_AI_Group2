\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('a9100000-0000-4000-8000-000000000001', '{"role":"admin","full_name":"Snapshot Admin"}'),
 ('a9100000-0000-4000-8000-000000000002', '{"role":"landlord","full_name":"Snapshot Owner"}');
UPDATE public.profiles SET role = 'admin' WHERE id = 'a9100000-0000-4000-8000-000000000001';
INSERT INTO public.profiles(id, role, full_name) VALUES
 ('a9100000-0000-4000-8000-000000000001','admin','Snapshot Admin'),
 ('a9100000-0000-4000-8000-000000000002','landlord','Snapshot Owner');
INSERT INTO public.property_drafts(id, owner_id, operation_id, payload, original_payload)
SELECT ('d9100000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
 'a9100000-0000-4000-8000-000000000002', gen_random_uuid(), '{"property":{},"unit":{}}', '{"property":{},"unit":{}}'
FROM generate_series(1,5) n;
INSERT INTO public.properties(id, landlord_id, title, description, property_type, street_address, barangay, city, latitude, longitude, status)
SELECT ('b9100000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
 'a9100000-0000-4000-8000-000000000002', 'Snapshot regression ' || n, 'Description', 'house', 'Street', 'Apas', 'Cebu City',
 10.3, 123.9, 'pending'
FROM generate_series(1,5) n;
INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media, review_status)
SELECT 'a9100000-0000-4000-8000-000000000002', gen_random_uuid(),
 ('d9100000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid, 1,
 ('b9100000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
 CASE WHEN n = 1 THEN NULL ELSE '{"property":{},"unit":{}}'::jsonb END,
 CASE n WHEN 1 THEN NULL WHEN 2 THEN '[]'::jsonb
 WHEN 3 THEN '[{"kind":"photo","object_path":"submitted/second.jpg"},{"kind":"permit","object_path":"submitted/permit.pdf"},{"kind":"photo","object_path":"submitted/first.jpg"}]'::jsonb
 WHEN 4 THEN '[{"kind":"permit","object_path":"submitted/permit.pdf"}]'::jsonb
 ELSE '[{"kind":"photo","object_path":"submitted/only.jpg"}]'::jsonb END, 'pending'
FROM generate_series(1,5) n;
-- Mutable draft uploads exist for every case, including each intentionally absent kind.
INSERT INTO public.property_draft_media(draft_id, operation_id, kind, content_type, size_bytes, content_sha256, object_path, confirmed)
SELECT ('d9100000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid, gen_random_uuid(), kind,
 'image/jpeg', 1, repeat('a',64), 'later/' || kind, true
FROM generate_series(1,5) n CROSS JOIN unnest(ARRAY['photo','permit']) kind;
INSERT INTO public.rental_units(property_id, rental_type, monthly_rent, is_available)
SELECT id, 'private_room', 5000, true FROM public.properties WHERE title LIKE 'Snapshot regression%';
UPDATE public.property_submissions SET created_at = now() - interval '1 day';
UPDATE public.property_draft_media SET object_path = 'a/b/c/' || repeat('a',64) || '.jpg';
UPDATE public.property_submissions SET snapshot_media = '[{"kind":"photo","object_path":"a/b/c/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"}]',
 snapshot_payload = '{"property":{},"unit":{"bathroom_type":"private"},"amenities":["accepted"]}'
 WHERE property_id = 'b9100000-0000-4000-8000-000000000003';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a9100000-0000-4000-8000-000000000001', true);
SELECT public.review_property('b9100000-0000-4000-8000-000000000003', gen_random_uuid(), 'approved', NULL, 'd9100000-0000-4000-8000-000000000003', 1);
RESET ROLE;
UPDATE public.property_submissions SET superseded_by = 'e9100000-0000-4000-8000-000000000003' WHERE property_id = 'b9100000-0000-4000-8000-000000000003';
INSERT INTO public.property_submissions(owner_id,operation_id,draft_id,expected_revision,property_id,snapshot_payload,snapshot_media,review_status)
VALUES ('a9100000-0000-4000-8000-000000000002','e9100000-0000-4000-8000-000000000003','d9100000-0000-4000-8000-000000000003',2,'b9100000-0000-4000-8000-000000000003',
'{"property":{},"unit":{"bathroom_type":"shared"},"amenities":["unreviewed"]}','[]','pending');
-- Unknown legacy approval: status alone is not evidence.
UPDATE public.properties SET status = 'approved' WHERE id = 'b9100000-0000-4000-8000-000000000001';
SET LOCAL ROLE anon;
DO $$
DECLARE x record;
BEGIN
 SELECT * INTO STRICT x FROM public.get_public_submitted_rentals() WHERE id = 'b9100000-0000-4000-8000-000000000003';
 IF x.amenities <> '["accepted"]'::jsonb OR x.bathroom_type <> 'private' OR cardinality(x.photo_paths) <> 1 THEN RAISE EXCEPTION 'pending B leaked over A'; END IF;
 SELECT * INTO STRICT x FROM public.get_public_submitted_rentals() WHERE id = 'b9100000-0000-4000-8000-000000000001';
 IF cardinality(x.photo_paths) <> 0 OR x.amenities <> '[]'::jsonb THEN RAISE EXCEPTION 'unknown approval leaked'; END IF;
 SELECT * INTO STRICT x FROM public.get_public_submitted_rentals() WHERE id = 'b9100000-0000-4000-8000-000000000002';
 IF cardinality(x.photo_paths) <> 0 OR x.moderation_status <> 'pending' THEN RAISE EXCEPTION 'initial pending empty snapshot failed'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT public.review_property('b9100000-0000-4000-8000-000000000003', gen_random_uuid(), 'rejected', 'Reject B', 'd9100000-0000-4000-8000-000000000003', 2);
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF (SELECT amenities FROM public.get_public_submitted_rentals() WHERE id = 'b9100000-0000-4000-8000-000000000003') <> '["accepted"]'::jsonb THEN RAISE EXCEPTION 'rejected B leaked'; END IF;
END $$;
RESET ROLE;
UPDATE public.property_submissions SET review_status = 'pending' WHERE operation_id = 'e9100000-0000-4000-8000-000000000003';
SET LOCAL ROLE authenticated;
SELECT public.review_property('b9100000-0000-4000-8000-000000000003', gen_random_uuid(), 'approved', NULL, 'd9100000-0000-4000-8000-000000000003', 2);
SET LOCAL ROLE anon;
DO $$ DECLARE x record; BEGIN
 SELECT * INTO STRICT x FROM public.get_public_submitted_rentals() WHERE id = 'b9100000-0000-4000-8000-000000000003';
 IF x.amenities <> '["unreviewed"]'::jsonb OR cardinality(x.photo_paths) <> 0 THEN RAISE EXCEPTION 'approved B not selected/empty fallback'; END IF;
 RAISE NOTICE 'PASS: direct anon initial pending, unknown legacy, accepted A, pending/rejected B, approved B and empty media';
END $$;
ROLLBACK;
