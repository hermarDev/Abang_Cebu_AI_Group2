\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('aaaaaaaa-0000-4000-8000-000000000001', '{"role":"landlord"}'),
 ('aaaaaaaa-0000-4000-8000-000000000002', '{"role":"landlord"}');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000001',true);
DO $$ DECLARE d uuid; op uuid := 'cccccccc-0000-4000-8000-000000000001'; p text; r jsonb; BEGIN
 d := public.save_property_draft('bbbbbbbb-0000-4000-8000-000000000001','{"property":{},"unit":{}}'::jsonb);
 p := 'aaaaaaaa-0000-4000-8000-000000000001/' || d || '/' || op || '/' || repeat('a',64) || '.pdf';
 r := public.prepare_property_draft_media(d,op,'permit','application/pdf',7,repeat('a',64),p,'permit.pdf');
 r := public.prepare_property_draft_media(d,op,'permit','application/pdf',7,repeat('a',64),p,'permit.pdf');
 IF r->>'resumed' <> 'true' THEN RAISE EXCEPTION 'retry did not resume'; END IF;
 BEGIN PERFORM public.prepare_property_draft_media(d,op,'permit','application/pdf',7,repeat('a',64),p,'changed.pdf'); RAISE EXCEPTION 'changed name accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN PERFORM public.prepare_property_draft_media(d,op,'permit','application/pdf',8,repeat('a',64),p,'permit.pdf'); RAISE EXCEPTION 'changed bytes accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 PERFORM set_config('test.path',p,true);
 PERFORM set_config('test.draft',d::text,true);
 IF public.release_property_draft_media(d,op) <> 'released' THEN RAISE EXCEPTION 'release failed'; END IF;
 IF public.release_property_draft_media(d,op) <> 'released' THEN RAISE EXCEPTION 'release retry failed'; END IF;
 BEGIN PERFORM public.prepare_property_draft_media(d,op,'permit','application/pdf',7,repeat('a',64),p,'permit.pdf'); RAISE EXCEPTION 'released operation reused'; EXCEPTION WHEN unique_violation THEN NULL; END;
 op := 'cccccccc-0000-4000-8000-000000000002';
 p := 'aaaaaaaa-0000-4000-8000-000000000001/' || d || '/' || op || '/' || repeat('b',64) || '.pdf';
 PERFORM public.prepare_property_draft_media(d,op,'permit','application/pdf',7,repeat('b',64),p,'replacement.pdf');
 PERFORM set_config('test.replacement_path',p,true);
 PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000002',true);
 BEGIN PERFORM public.prepare_property_draft_media(d,op,'permit','application/pdf',7,repeat('a',64),'aaaaaaaa-0000-4000-8000-000000000002/' || d || '/' || op || '/' || repeat('a',64) || '.pdf','permit.pdf'); RAISE EXCEPTION 'other owner accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000001',true);
END $$;
RESET ROLE;
INSERT INTO storage.objects(bucket_id, name) VALUES ('property-draft-media', current_setting('test.path')), ('property-draft-media', current_setting('test.replacement_path'));
DO $$ BEGIN
  BEGIN
    PERFORM public.confirm_property_draft_media('aaaaaaaa-0000-4000-8000-000000000001', current_setting('test.draft')::uuid, 'cccccccc-0000-4000-8000-000000000001', repeat('a',64), current_setting('test.path'));
    RAISE EXCEPTION 'released operation confirmed';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  PERFORM public.confirm_property_draft_media('aaaaaaaa-0000-4000-8000-000000000001', current_setting('test.draft')::uuid, 'cccccccc-0000-4000-8000-000000000002', repeat('b',64), current_setting('test.replacement_path'));
  PERFORM public.confirm_property_draft_media('aaaaaaaa-0000-4000-8000-000000000001', current_setting('test.draft')::uuid, 'cccccccc-0000-4000-8000-000000000002', repeat('b',64), current_setting('test.replacement_path'));
  IF NOT EXISTS (SELECT 1 FROM public.property_draft_media WHERE draft_id = current_setting('test.draft')::uuid AND operation_id = 'cccccccc-0000-4000-8000-000000000002' AND confirmed) THEN RAISE EXCEPTION 'confirmation lost'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 IF public.release_property_draft_media(current_setting('test.draft')::uuid,'cccccccc-0000-4000-8000-000000000002') <> 'confirmed' THEN RAISE EXCEPTION 'confirmed operation released'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM storage.objects WHERE bucket_id='property-draft-media' AND name IN (current_setting('test.path'), current_setting('test.replacement_path'))) <> 2 THEN RAISE EXCEPTION 'storage bytes were removed'; END IF;
END $$;
ROLLBACK;
