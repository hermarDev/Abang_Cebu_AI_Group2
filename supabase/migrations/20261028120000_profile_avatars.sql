-- Private, per-user profile photos used in the account page and assistant chat.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-avatars', 'profile-avatars', FALSE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

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
