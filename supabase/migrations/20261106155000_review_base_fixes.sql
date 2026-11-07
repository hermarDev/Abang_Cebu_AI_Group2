-- Forward fixes for review objects already present on linked databases.
BEGIN;
CREATE POLICY property_submissions_admin_read ON public.property_submissions
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin' AND NOT p.is_suspended
  ));

CREATE OR REPLACE FUNCTION public.landlord_property_status(p_operation_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_sub public.property_submissions%ROWTYPE;
  v_review public.property_reviews%ROWTYPE;
  v_prop public.properties%ROWTYPE;
BEGIN
  IF v_owner IS NULL THEN RAISE EXCEPTION 'authenticated user required' USING ERRCODE = '42501'; END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO v_sub FROM public.property_submissions WHERE owner_id = v_owner AND operation_id = p_operation_id;
    IF NOT FOUND THEN RETURN '{}'::jsonb; END IF;
  ELSE
    SELECT * INTO v_sub FROM public.property_submissions WHERE owner_id = v_owner ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND THEN RETURN '{}'::jsonb; END IF;
  END IF;
  SELECT status, moderation_note INTO v_prop.status, v_prop.moderation_note FROM public.properties WHERE id = v_sub.property_id;
  SELECT * INTO v_review FROM public.property_reviews
    WHERE submission_owner_id = v_sub.owner_id AND submission_operation_id = v_sub.operation_id
    ORDER BY created_at DESC LIMIT 1;
  RETURN pg_catalog.jsonb_build_object(
    'propertyId', v_sub.property_id,
    'operationId', v_sub.operation_id,
    'draftId', v_sub.draft_id,
    'revision', v_sub.expected_revision,
    'status', COALESCE(v_prop.status, 'pending'),
    'moderationNote', v_prop.moderation_note,
    'reviewDecision', v_review.decision,
    'superseded', v_sub.superseded_by IS NOT NULL
  );
END;
$$;
REVOKE ALL ON FUNCTION public.landlord_property_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.landlord_property_status(uuid) TO authenticated;
COMMIT;
