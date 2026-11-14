-- Staff creation tracking table and RPCs for retry reconciliation
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_staff_creation_ops (
  operation_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('verification_officer', 'customer_support')),
  full_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE public.admin_staff_creation_ops ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_staff_creation_ops FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_staff_creation_ops TO service_role;

CREATE OR REPLACE FUNCTION public.admin_get_staff_creation_by_operation(
  p_operation_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_op public.admin_staff_creation_ops%ROWTYPE;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_operation_id IS NULL THEN
    RAISE EXCEPTION 'operation id required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_op FROM public.admin_staff_creation_ops WHERE operation_id = p_operation_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'user_id', v_op.user_id,
    'role', v_op.role,
    'full_name', v_op.full_name,
    'email', v_op.email,
    'created_at', v_op.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_staff_creation_by_operation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_staff_creation_by_operation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_track_staff_creation(
  p_operation_id uuid, p_user_id uuid, p_role text, p_full_name text, p_email text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_operation_id IS NULL OR p_user_id IS NULL OR p_role IS NULL OR p_role NOT IN ('verification_officer', 'customer_support') THEN
    RAISE EXCEPTION 'invalid parameters' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.admin_staff_creation_ops (operation_id, user_id, role, full_name, email)
  VALUES (p_operation_id, p_user_id, p_role, p_full_name, p_email)
  ON CONFLICT (operation_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    created_at = EXCLUDED.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_track_staff_creation(uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_track_staff_creation(uuid,uuid,text,text,text) TO authenticated;