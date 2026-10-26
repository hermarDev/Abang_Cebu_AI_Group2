-- Approved narrow correction; retain Finder provisioning and self/admin reads.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND tgname = 'finder_auth_signup' AND tgenabled = 'O' AND tgfoid = 'public.finder_new_user()'::regprocedure) THEN
    RAISE EXCEPTION 'Expected enabled Finder signup trigger';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND tgname = 'on_auth_user_created' AND tgfoid IS DISTINCT FROM to_regprocedure('public.handle_new_user()')) THEN
    RAISE EXCEPTION 'Unexpected legacy signup trigger binding';
  END IF;
END $$;
-- Function ownership permits removal of its dependent trigger on managed auth.users.
-- Also accepts the already-corrected hosted state applied through SQL Editor.
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
COMMIT;
