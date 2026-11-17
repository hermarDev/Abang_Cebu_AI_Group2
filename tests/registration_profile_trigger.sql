\set ON_ERROR_STOP on
BEGIN;

-- Run after the legacy users-and-profiles migration. The complete suite must
-- define auth.users and public.profiles before this focused trigger check.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('c1000000-0000-4000-8000-000000000001', 'landlord-trigger@test.invalid', '{"role":"landlord","full_name":"Trigger Landlord"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000002', 'admin-trigger@test.invalid', '{"role":"admin","full_name":"Trigger Admin"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000003', 'fallback-trigger@test.invalid', '{}'::jsonb);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = 'c1000000-0000-4000-8000-000000000001'
      AND role = 'landlord'
      AND full_name = 'Trigger Landlord'
  ) THEN
    RAISE EXCEPTION 'landlord signup did not create the expected profile row';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = 'c1000000-0000-4000-8000-000000000002'
      AND role = 'renter'
      AND full_name = 'Trigger Admin'
  ) THEN
    RAISE EXCEPTION 'unallowlisted signup role was not forced to renter';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = 'c1000000-0000-4000-8000-000000000003'
      AND role = 'renter'
      AND full_name = 'fallback-trigger'
  ) THEN
    RAISE EXCEPTION 'profile name fallback was not derived from the email local part';
  END IF;
END $$;

ROLLBACK;
