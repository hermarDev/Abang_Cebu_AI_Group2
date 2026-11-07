-- Keep internal notes private; owner feedback comes from the reviewed rejection.
BEGIN;
DROP POLICY IF EXISTS property_reviews_owner_read ON public.property_reviews;
CREATE POLICY property_reviews_owner_read ON public.property_reviews
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.property_submissions s
    WHERE s.owner_id = auth.uid()
      AND s.owner_id = property_reviews.submission_owner_id
      AND s.operation_id = property_reviews.submission_operation_id
  ));
DROP POLICY IF EXISTS property_reviews_active_owner_restriction ON public.property_reviews;
CREATE POLICY property_reviews_active_owner_restriction ON public.property_reviews
  AS RESTRICTIVE FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND NOT p.is_suspended
      AND (p.role = 'admin' OR (p.role = 'landlord' AND property_reviews.submission_owner_id = auth.uid())))
  );
REVOKE SELECT ON public.properties FROM authenticated;
REVOKE SELECT (moderation_note) ON public.properties FROM authenticated;
GRANT SELECT (id, landlord_id, title, description, property_type, street_address, barangay, city, postal_code,
  latitude, longitude, status, approved_by, approved_at, created_at, updated_at) ON public.properties TO authenticated;

-- Backfill legacy reviews that have NULL submission bindings from the property's latest submission
UPDATE public.property_reviews r
SET submission_owner_id = s.owner_id,
    submission_operation_id = s.operation_id
FROM (
  SELECT DISTINCT ON (property_id) property_id, owner_id, operation_id
  FROM public.property_submissions
  ORDER BY property_id, created_at DESC
) s
WHERE r.property_id = s.property_id
  AND (r.submission_owner_id IS NULL OR r.submission_operation_id IS NULL);


CREATE OR REPLACE FUNCTION public.landlord_property_status(p_operation_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_sub public.property_submissions%ROWTYPE;
  v_review public.property_reviews%ROWTYPE;
  v_status text;
BEGIN
  IF v_owner IS NULL THEN RAISE EXCEPTION 'authenticated user required' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_owner AND p.role = 'landlord' AND NOT p.is_suspended) THEN RETURN '{}'::jsonb; END IF;
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO v_sub FROM public.property_submissions WHERE owner_id = v_owner AND operation_id = p_operation_id;
    IF NOT FOUND THEN RETURN '{}'::jsonb; END IF;
  ELSE
    SELECT * INTO v_sub FROM public.property_submissions WHERE owner_id = v_owner ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND THEN RETURN '{}'::jsonb; END IF;
  END IF;
  SELECT status INTO v_status FROM public.properties WHERE id = v_sub.property_id;
  SELECT * INTO v_review FROM public.property_reviews
    WHERE submission_owner_id = v_sub.owner_id AND submission_operation_id = v_sub.operation_id
    ORDER BY created_at DESC LIMIT 1;
  RETURN pg_catalog.jsonb_build_object(
    'propertyId', v_sub.property_id,
    'operationId', v_sub.operation_id,
    'draftId', v_sub.draft_id,
    'revision', v_sub.expected_revision,
    'status', COALESCE(v_status, 'pending'),
    'moderationNote', CASE WHEN v_status = 'rejected' AND v_review.decision = 'rejected' THEN v_review.note ELSE NULL END,
    'reviewDecision', v_review.decision,
    'superseded', v_sub.superseded_by IS NOT NULL
  );
END;
$$;
REVOKE ALL ON FUNCTION public.landlord_property_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.landlord_property_status(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.landlord_rejection_feedback()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('propertyId', p.id, 'reason', r.note)), '[]'::jsonb)
  FROM public.properties p
  JOIN LATERAL (
    SELECT s.owner_id, s.operation_id FROM public.property_submissions s
    WHERE s.property_id = p.id AND s.owner_id = auth.uid() AND s.superseded_by IS NULL
    ORDER BY s.created_at DESC LIMIT 1
  ) s ON true
  JOIN LATERAL (
    SELECT review.decision, review.note FROM public.property_reviews review
    WHERE review.submission_owner_id = s.owner_id AND review.submission_operation_id = s.operation_id
    ORDER BY review.created_at DESC LIMIT 1
  ) r ON true
  WHERE p.landlord_id = auth.uid() AND p.status = 'rejected' AND r.decision = 'rejected'
    AND EXISTS (SELECT 1 FROM public.profiles profile WHERE profile.id = auth.uid() AND profile.role = 'landlord' AND NOT profile.is_suspended);
$$;
REVOKE ALL ON FUNCTION public.landlord_rejection_feedback() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.landlord_rejection_feedback() TO authenticated;
COMMIT;
