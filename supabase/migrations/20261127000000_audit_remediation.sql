-- Audit remediation migration:
-- 1. Consolidate signup trigger onto on_auth_user_created / public.handle_new_user()
-- 2. Drop overly broad public profile SELECT policy and reconcile UPDATE policies
-- 4. Allow staff roles (verification_officer, customer_support) in admin_list_accounts
-- 9. Add grouped notification tab counts RPC

-- ---------------------------------------------------------------------------
-- 1. Single signup provisioner on auth.users
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS finder_auth_signup ON auth.users;
DROP FUNCTION IF EXISTS public.finder_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  assigned_role public.user_role;
  extracted_name text;
  sanitized_phone text;
BEGIN
  assigned_role := CASE
    WHEN lower(COALESCE(NEW.raw_user_meta_data->>'role', '')) = 'landlord'
      THEN 'landlord'::public.user_role
    ELSE 'renter'::public.user_role
  END;

  extracted_name := left(
    COALESCE(
      NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''),
      NULLIF(btrim(split_part(COALESCE(NEW.email, ''), '@', 1)), ''),
      'AbangCebu User'
    ),
    200
  );

  sanitized_phone := CASE
    WHEN NEW.raw_user_meta_data->>'phone_number' ~ '^\+?[0-9]{10,15}$'
      THEN NEW.raw_user_meta_data->>'phone_number'
    ELSE NULL
  END;

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
    sanitized_phone,
    NULLIF(btrim(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'bio'), ''),
    FALSE,
    now(),
    now()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error executing public.handle_new_user() for auth user ID %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Profile RLS: remove broad SELECT policy and reconcile UPDATE policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- ---------------------------------------------------------------------------
-- 4. Allow staff roles in admin_list_accounts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_accounts(
  p_role text DEFAULT NULL,
  p_suspended boolean DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_search text := lower(NULLIF(btrim(p_search), ''));
  v_reports jsonb := '{}'::jsonb;
  v_result jsonb;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('renter', 'landlord', 'admin', 'verification_officer', 'customer_support') THEN
    RAISE EXCEPTION 'invalid role' USING ERRCODE = '22023';
  END IF;
  IF pg_catalog.to_regclass('public.abuse_reports') IS NOT NULL THEN
    EXECUTE 'SELECT COALESCE(jsonb_object_agg(target_user_id::text, c), ''{}''::jsonb) FROM (SELECT target_user_id, count(*)::int AS c FROM public.abuse_reports WHERE status IN (''open'', ''in_review'') AND target_user_id IS NOT NULL GROUP BY 1) r' INTO v_reports;
  END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(t.j ORDER BY t.created_at DESC, t.id ASC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT pr.created_at, pr.id, pg_catalog.jsonb_build_object(
      'id', pr.id, 'fullName', pr.full_name, 'role', pr.role, 'isSuspended', pr.is_suspended,
      'phoneNumber', pr.phone_number, 'createdAt', pr.created_at, 'updatedAt', pr.updated_at,
      'propertyCount', (SELECT count(*)::int FROM public.properties p WHERE p.landlord_id = pr.id),
      'livePropertyCount', (SELECT count(*)::int FROM public.properties p WHERE p.landlord_id = pr.id AND p.status = 'approved'),
      'openReportCount', COALESCE((v_reports->>(pr.id::text))::int, 0)) AS j
    FROM public.profiles pr
    WHERE (p_role IS NULL OR pr.role::text = p_role)
      AND (p_suspended IS NULL OR pr.is_suspended = p_suspended)
      AND (v_search IS NULL OR pg_catalog.strpos(lower(pr.full_name || ' ' || COALESCE(pr.phone_number, '')), v_search) > 0)
    ORDER BY pr.created_at DESC, pr.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100) OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) t;
  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. Grouped notification tab counts RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_notification_tab_counts()
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT pg_catalog.jsonb_build_object(
    'all', count(*)::int,
    'unread', count(*) FILTER (WHERE NOT is_read)::int,
    'messages', count(*) FILTER (WHERE type IN ('message', 'inquiry'))::int,
    'listings', count(*) FILTER (WHERE type IN ('listing_update', 'listing_review', 'listing_pending'))::int,
    'system', count(*) FILTER (WHERE type IN ('report', 'security', 'support'))::int
  )
  FROM public.notifications
  WHERE recipient_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_notification_tab_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_notification_tab_counts() TO authenticated, service_role;
