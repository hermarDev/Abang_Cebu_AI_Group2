-- Preserve exact submission identity when replaying a review operation.
BEGIN;
CREATE OR REPLACE FUNCTION public.review_property(p_property_id uuid, p_operation_id uuid, p_decision text, p_note text, p_submission_draft_id uuid DEFAULT NULL, p_submission_expected_revision bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_previous public.property_reviews%ROWTYPE;
  v_status text;
  v_submission public.property_submissions%ROWTYPE;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_property_id IS NULL OR p_operation_id IS NULL OR p_decision NOT IN ('approved','rejected')
    OR (p_decision = 'rejected' AND (p_note IS NULL OR length(btrim(p_note)) = 0 OR length(p_note) > 1000))
    OR p_submission_draft_id IS NULL OR p_submission_expected_revision IS NULL OR p_submission_expected_revision < 1 THEN
    RAISE EXCEPTION 'invalid review' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('property-review:' || p_property_id::text, 0));
  SELECT * INTO v_previous FROM public.property_reviews WHERE admin_id = v_admin AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_previous.property_id IS DISTINCT FROM p_property_id OR v_previous.decision IS DISTINCT FROM p_decision OR v_previous.note IS DISTINCT FROM p_note THEN
      RAISE EXCEPTION 'operation already used for different review' USING ERRCODE = '23505';
    END IF;
    IF p_submission_draft_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.property_submissions s
      WHERE s.owner_id = v_previous.submission_owner_id
        AND s.operation_id = v_previous.submission_operation_id
        AND s.property_id = p_property_id
        AND s.draft_id = p_submission_draft_id
        AND s.expected_revision = p_submission_expected_revision
    ) THEN
      RAISE EXCEPTION 'operation already used for different submission revision' USING ERRCODE = '23505';
    END IF;
    RETURN pg_catalog.jsonb_build_object('status', v_previous.decision);
  END IF;
  SELECT * INTO v_submission FROM public.property_submissions
    WHERE property_id = p_property_id
      AND (p_submission_draft_id IS NULL OR draft_id = p_submission_draft_id)
      AND (p_submission_expected_revision IS NULL OR expected_revision = p_submission_expected_revision)
    ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission revision not found' USING ERRCODE = '22023'; END IF;
  UPDATE public.properties
    SET status = p_decision, moderation_note = CASE WHEN p_decision = 'rejected' THEN p_note ELSE NULL END,
        approved_by = CASE WHEN p_decision = 'approved' THEN v_admin ELSE NULL END,
        approved_at = CASE WHEN p_decision = 'approved' THEN pg_catalog.now() ELSE NULL END
    WHERE id = p_property_id AND status = 'pending'
    RETURNING status INTO v_status;
  IF v_status IS NULL THEN RAISE EXCEPTION 'property is not pending review' USING ERRCODE = '40001'; END IF;
  INSERT INTO public.property_reviews(admin_id, operation_id, property_id, decision, note, submission_owner_id, submission_operation_id)
  VALUES (v_admin, p_operation_id, p_property_id, p_decision, CASE WHEN p_decision = 'rejected' THEN p_note ELSE NULL END,
    v_submission.owner_id, v_submission.operation_id);
  RETURN pg_catalog.jsonb_build_object('status', v_status);
END;
$$;
REVOKE ALL ON FUNCTION public.review_property(uuid,uuid,text,text,uuid,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_property(uuid,uuid,text,text,uuid,bigint) TO authenticated;
COMMIT;
