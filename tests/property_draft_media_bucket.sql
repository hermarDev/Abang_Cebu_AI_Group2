\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'property-draft-media' AND public = false AND file_size_limit = 10485760 AND allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','application/pdf']) THEN
    RAISE EXCEPTION 'private draft media bucket missing or incompatible';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'draft_media_deny_clients' AND permissive = 'RESTRICTIVE' AND cmd = 'ALL') THEN
    RAISE EXCEPTION 'restrictive draft media policy missing';
  END IF;
END $$;
INSERT INTO storage.objects (id, bucket_id, name) VALUES
 ('a0000000-0000-4000-8000-000000000001', 'property-draft-media', 'test-private'),
 ('a0000000-0000-4000-8000-000000000002', 'property-images', 'test-other');
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NOT has_table_privilege(current_user, 'storage.objects', 'INSERT') THEN
    RAISE EXCEPTION 'test requires authenticated INSERT privilege to exercise RLS';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE id = 'a0000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'authenticated role can read private draft media';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE id = 'a0000000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'unrelated bucket unexpectedly blocked';
  END IF;
  UPDATE storage.objects SET name = 'changed' WHERE id = 'a0000000-0000-4000-8000-000000000001';
  IF FOUND THEN RAISE EXCEPTION 'authenticated role can update private draft media'; END IF;
  DELETE FROM storage.objects WHERE id = 'a0000000-0000-4000-8000-000000000001';
  IF FOUND THEN RAISE EXCEPTION 'authenticated role can delete private draft media'; END IF;
  BEGIN
    INSERT INTO storage.objects (id, bucket_id, name) VALUES ('a0000000-0000-4000-8000-000000000003', 'property-draft-media', 'test-insert');
    RAISE EXCEPTION 'authenticated role can insert private draft media';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
