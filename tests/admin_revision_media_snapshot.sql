\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('a9100000-0000-4000-8000-000000000001', '{"role":"admin","full_name":"Snapshot Admin"}'),
 ('a9100000-0000-4000-8000-000000000002', '{"role":"landlord","full_name":"Snapshot Owner"}');
UPDATE public.profiles SET role = 'admin' WHERE id = 'a9100000-0000-4000-8000-000000000001';
INSERT INTO public.property_drafts(id, owner_id, operation_id, payload, original_payload)
SELECT ('d9100000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
 'a9100000-0000-4000-8000-000000000002', gen_random_uuid(), '{"property":{},"unit":{}}', '{"property":{},"unit":{}}'
FROM generate_series(1,5) n;
INSERT INTO public.properties(id, landlord_id, title, description, property_type, street_address, barangay, city, coordinates, status)
SELECT ('b9100000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
 'a9100000-0000-4000-8000-000000000002', 'Snapshot regression ' || n, 'Description', 'house', 'Street', 'Apas', 'Cebu City',
 extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326), 'approved'
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
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a9100000-0000-4000-8000-000000000001', true);
DO $$
DECLARE rows jsonb; item jsonb; n integer; photos jsonb; permits jsonb;
BEGIN
 rows := public.admin_list_properties('pending', 'Snapshot regression', 100, 0);
 IF jsonb_array_length(rows) <> 5 THEN RAISE EXCEPTION 'pending revision filter lost rows: %', rows; END IF;
 FOR n IN 1..5 LOOP
  SELECT e INTO STRICT item FROM jsonb_array_elements(rows) e
   WHERE e->>'id' = 'b9100000-0000-4000-8000-' || lpad(n::text,12,'0');
  photos := CASE n WHEN 1 THEN '["later/photo"]'::jsonb WHEN 3 THEN '["submitted/second.jpg","submitted/first.jpg"]'::jsonb
   WHEN 5 THEN '["submitted/only.jpg"]'::jsonb ELSE '[]'::jsonb END;
  permits := CASE n WHEN 1 THEN '["later/permit"]'::jsonb WHEN 3 THEN '["submitted/permit.pdf"]'::jsonb
   WHEN 4 THEN '["submitted/permit.pdf"]'::jsonb ELSE '[]'::jsonb END;
  IF item->'photoPaths' IS DISTINCT FROM photos OR item->'permitPaths' IS DISTINCT FROM permits THEN
   RAISE EXCEPTION 'case %: unexpected media %', n, item;
  END IF;
 END LOOP;
 RAISE NOTICE 'PASS: 10 media assertions across legacy, empty, snapshot and independently absent kinds';
END $$;
ROLLBACK;
