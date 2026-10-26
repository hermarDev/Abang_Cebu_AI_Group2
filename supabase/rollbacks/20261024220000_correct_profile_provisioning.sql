-- Emergency reversal only: restores known duplicate-signup and cross-account-read defects.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
    assigned_role public.user_role;
    raw_role text;
    extracted_name text;
BEGIN
    -- Extract requested role from raw_user_meta_data
    raw_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'renter'));

    -- Anti-Privilege Escalation Protection:
    -- Only 'renter' and 'landlord' can be registered during public onboarding.
    -- Any attempt to request 'admin' is strictly forced down to 'renter'.
    IF raw_role = 'landlord' THEN
        assigned_role := 'landlord'::public.user_role;
    ELSE
        assigned_role := 'renter'::public.user_role;
    END IF;

    -- Extract full name with robust fallbacks
    extracted_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        SPLIT_PART(NEW.email, '@', 1),
        'AbangCebu User'
    );

    INSERT INTO public.profiles (
        id,
        role,
        full_name,
        phone_number,
        avatar_url,
        bio,
        is_suspended,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        assigned_role,
        extracted_name,
        NULLIF(TRIM(NEW.raw_user_meta_data->>'phone_number'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'bio'), ''),
        FALSE,
        now(),
        now()
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Defensive logging: ensure unexpected trigger failures are surfaced
        RAISE LOG 'Error executing public.handle_new_user() for auth user ID %: %', NEW.id, SQLERRM;
        RAISE;
END;
$function$;
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT TO public USING (true);
COMMIT;
