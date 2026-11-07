-- Admin decisions are immutable, idempotent, and bound to the exact pending property.
BEGIN;
CREATE TABLE IF NOT EXISTS public.property_reviews (
  admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  note text,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  PRIMARY KEY (admin_id, operation_id)
);
ALTER TABLE public.property_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_reviews FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.review_property(p_property_id uuid, p_operation_id uuid, p_decision text, p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_previous public.property_reviews%ROWTYPE;
  v_status text;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_property_id IS NULL OR p_operation_id IS NULL OR p_decision NOT IN ('approved','rejected')
    OR (p_decision = 'rejected' AND (p_note IS NULL OR length(btrim(p_note)) = 0 OR length(p_note) > 1000)) THEN
    RAISE EXCEPTION 'invalid review' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('property-review:' || p_property_id::text, 0));
  SELECT * INTO v_previous FROM public.property_reviews WHERE admin_id = v_admin AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_previous.property_id IS DISTINCT FROM p_property_id OR v_previous.decision IS DISTINCT FROM p_decision OR v_previous.note IS DISTINCT FROM p_note THEN
      RAISE EXCEPTION 'operation already used for different review' USING ERRCODE = '23505';
    END IF;
    RETURN pg_catalog.jsonb_build_object('status', v_previous.decision);
  END IF;
  UPDATE public.properties
    SET status = p_decision, moderation_note = CASE WHEN p_decision = 'rejected' THEN p_note ELSE NULL END,
        approved_by = CASE WHEN p_decision = 'approved' THEN v_admin ELSE NULL END,
        approved_at = CASE WHEN p_decision = 'approved' THEN pg_catalog.now() ELSE NULL END
    WHERE id = p_property_id AND status = 'pending'
    RETURNING status INTO v_status;
  IF v_status IS NULL THEN RAISE EXCEPTION 'property is not pending review' USING ERRCODE = '40001'; END IF;
  INSERT INTO public.property_reviews(admin_id, operation_id, property_id, decision, note)
  VALUES (v_admin, p_operation_id, p_property_id, p_decision, CASE WHEN p_decision = 'rejected' THEN p_note ELSE NULL END);
  RETURN pg_catalog.jsonb_build_object('status', v_status);
END;
$$;
REVOKE ALL ON FUNCTION public.review_property(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_property(uuid,uuid,text,text) TO authenticated;
COMMIT;
