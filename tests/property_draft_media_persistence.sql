\set ON_ERROR_STOP on
BEGIN;
-- Fixture depends on 20261104130000_property_draft_save.sql and the private bucket migration.
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('aaaaaaaa-0000-4000-8000-000000000001', '{"role":"landlord"}'),
 ('aaaaaaaa-0000-4000-8000-000000000002', '{"role":"landlord"}');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000001',true);
DO $$ DECLARE a uuid; b uuid; r jsonb; op uuid; i integer; BEGIN
 a := public.save_property_draft('bbbbbbbb-0000-4000-8000-000000000001','{"property":{},"unit":{}}'::jsonb);
 r := public.prepare_property_draft_media(a,'cccccccc-0000-4000-8000-000000000001','photo','image/jpeg',7,repeat('a',64),'aaaaaaaa-0000-4000-8000-000000000001/' || a || '/cccccccc-0000-4000-8000-000000000001/' || repeat('a',64) || '.jpg', 'photo.jpg');
 IF (r->>'resumed') <> 'false' THEN RAISE EXCEPTION 'initial prepare must not be resumed'; END IF;
 r := public.prepare_property_draft_media(a,'cccccccc-0000-4000-8000-000000000001','photo','image/jpeg',7,repeat('a',64),'aaaaaaaa-0000-4000-8000-000000000001/' || a || '/cccccccc-0000-4000-8000-000000000001/' || repeat('a',64) || '.jpg', 'photo.jpg');
 IF (r->>'resumed') <> 'true' THEN RAISE EXCEPTION 'retry replay failed'; END IF;
 IF r->'confirmed' IS DISTINCT FROM 'false'::jsonb THEN RAISE EXCEPTION 'unconfirmed retry must report confirmed false'; END IF;
 BEGIN
   PERFORM public.prepare_property_draft_media(a,'cccccccc-0000-4000-8000-000000000001','photo','image/jpeg',7,repeat('a',64),'aaaaaaaa-0000-4000-8000-000000000001/' || a || '/cccccccc-0000-4000-8000-000000000001/' || repeat('a',64) || '.jpg', 'other.jpg');
   RAISE EXCEPTION 'changed filename accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 PERFORM set_config('test.owner_a_draft', a::text, true);
 b := public.save_property_draft('bbbbbbbb-0000-4000-8000-000000000002','{"property":{},"unit":{}}'::jsonb);
 FOR i IN 2..6 LOOP
   op := ('cccccccc-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
   PERFORM public.prepare_property_draft_media(a, op, 'photo', 'image/jpeg', 7, repeat('a',64), 'aaaaaaaa-0000-4000-8000-000000000001/' || a || '/' || op || '/' || repeat('a',64) || '.jpg', 'photo.jpg');
 END LOOP;
 op := 'cccccccc-0000-4000-8000-000000000007';
 BEGIN
   PERFORM public.prepare_property_draft_media(a, op, 'photo', 'image/jpeg', 7, repeat('a',64), 'aaaaaaaa-0000-4000-8000-000000000001/' || a || '/' || op || '/' || repeat('a',64) || '.jpg', 'photo.jpg');
   RAISE EXCEPTION 'seventh photo accepted';
 EXCEPTION WHEN program_limit_exceeded THEN NULL; END;
 PERFORM public.prepare_property_draft_media(b, op, 'photo', 'image/jpeg', 7, repeat('a',64), 'aaaaaaaa-0000-4000-8000-000000000001/' || b || '/' || op || '/' || repeat('a',64) || '.jpg', 'photo.jpg');
 op := 'dddddddd-0000-4000-8000-000000000001';
 PERFORM public.prepare_property_draft_media(a, op, 'permit', 'application/pdf', 7, repeat('b',64), 'aaaaaaaa-0000-4000-8000-000000000001/' || a || '/' || op || '/' || repeat('b',64) || '.pdf', 'permit.pdf');
 PERFORM public.prepare_property_draft_media(b, op, 'permit', 'application/pdf', 7, repeat('b',64), 'aaaaaaaa-0000-4000-8000-000000000001/' || b || '/' || op || '/' || repeat('b',64) || '.pdf', 'permit.pdf');
 op := 'dddddddd-0000-4000-8000-000000000002';
 BEGIN
   PERFORM public.prepare_property_draft_media(a, op, 'permit', 'application/pdf', 7, repeat('b',64), 'aaaaaaaa-0000-4000-8000-000000000001/' || a || '/' || op || '/' || repeat('b',64) || '.pdf', 'permit.pdf');
   RAISE EXCEPTION 'second permit accepted';
 EXCEPTION WHEN program_limit_exceeded THEN NULL; END;
 BEGIN PERFORM public.prepare_property_draft_media(a,'cccccccc-0000-4000-8000-000000000001','permit','application/pdf',7,repeat('a',64),'aaaaaaaa-0000-4000-8000-000000000001/' || a || '/cccccccc-0000-4000-8000-000000000001/' || repeat('a',64) || '.pdf', 'permit.pdf'); RAISE EXCEPTION 'changed intent accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
RESET ROLE;
UPDATE public.property_draft_media SET confirmed = true WHERE draft_id = current_setting('test.owner_a_draft')::uuid AND operation_id = 'cccccccc-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000001',true);
DO $$ DECLARE a uuid; BEGIN
  BEGIN PERFORM public.confirm_property_draft_media(a,'cccccccc-0000-4000-8000-000000000001',repeat('a',64),'aaaaaaaa-0000-4000-8000-000000000001/' || a || '/cccccccc-0000-4000-8000-000000000001/' || repeat('a',64) || '.jpg'); RAISE EXCEPTION 'direct authenticated confirm accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.property_draft_media WHERE draft_id = current_setting('test.owner_a_draft')::uuid) <> 1 THEN RAISE EXCEPTION 'owner must see confirmed media only'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000002',true);
DO $$ DECLARE a uuid; BEGIN
 IF (SELECT count(*) FROM public.property_draft_media WHERE draft_id = current_setting('test.owner_a_draft')::uuid) <> 0 THEN RAISE EXCEPTION 'cross-owner media visible'; END IF;
 a := current_setting('test.owner_a_draft')::uuid;
 BEGIN PERFORM public.prepare_property_draft_media(a,'dddddddd-0000-4000-8000-000000000001','photo','image/jpeg',7,repeat('a',64),'aaaaaaaa-0000-4000-8000-000000000002/' || a || '/dddddddd-0000-4000-8000-000000000001/' || repeat('a',64) || '.jpg', 'photo.jpg'); RAISE EXCEPTION 'cross-owner media accepted'; EXCEPTION WHEN insufficient_privilege THEN IF SQLERRM <> 'draft unavailable' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
UPDATE public.profiles SET is_suspended = true WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.property_draft_media WHERE draft_id = current_setting('test.owner_a_draft')::uuid) <> 0 THEN RAISE EXCEPTION 'suspended owner media visible'; END IF;
END $$;
ROLLBACK;
