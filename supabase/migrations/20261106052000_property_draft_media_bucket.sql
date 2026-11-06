-- Private staging; access is reserved for the server, not direct client uploads.
BEGIN;
LOCK TABLE storage.buckets IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE storage.objects IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'draft_media_deny_clients') THEN
    RAISE EXCEPTION 'existing draft media policy requires review';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'property-draft-media' AND
    (name IS DISTINCT FROM 'property-draft-media' OR public IS DISTINCT FROM false OR
     file_size_limit IS DISTINCT FROM 10485760 OR
     allowed_mime_types IS DISTINCT FROM ARRAY['image/jpeg','image/png','image/webp','application/pdf'])) THEN
    RAISE EXCEPTION 'existing draft media bucket configuration is incompatible';
  END IF;
END $$;
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('property-draft-media', 'property-draft-media', false, 10485760,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY draft_media_deny_clients ON storage.objects AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (bucket_id <> 'property-draft-media')
  WITH CHECK (bucket_id <> 'property-draft-media');
COMMIT;
