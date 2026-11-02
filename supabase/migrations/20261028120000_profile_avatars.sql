-- Private, per-user profile photos used in the account page and assistant chat.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE storage.buckets IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE storage.objects IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'profile-avatars' AND
    (name IS DISTINCT FROM 'profile-avatars' OR public IS DISTINCT FROM false OR
     file_size_limit IS DISTINCT FROM 2097152 OR
     allowed_mime_types IS DISTINCT FROM ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])) THEN
    RAISE EXCEPTION 'Existing avatar bucket configuration differs';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname IN ('profile_avatars_read_own', 'profile_avatars_insert_own', 'profile_avatars_update_own', 'profile_avatars_delete_own')) THEN
    RAISE EXCEPTION 'Existing avatar policy requires review';
  END IF;
END $$;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-avatars', 'profile-avatars', FALSE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

GRANT UPDATE (avatar_url) ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS profile_avatars_read_own ON storage.objects;
CREATE POLICY profile_avatars_read_own
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS profile_avatars_insert_own ON storage.objects;
CREATE POLICY profile_avatars_insert_own
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS profile_avatars_update_own ON storage.objects;
CREATE POLICY profile_avatars_update_own
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text))
WITH CHECK (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS profile_avatars_delete_own ON storage.objects;
CREATE POLICY profile_avatars_delete_own
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
COMMIT;
