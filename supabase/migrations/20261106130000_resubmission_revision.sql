-- Resubmission: a rejected property can be corrected and resubmitted as a new draft revision.
-- Prior submission snapshots, reviews and objects are preserved; status comes from the latest review.
BEGIN;
ALTER TABLE public.property_submissions
  ADD COLUMN IF NOT EXISTS superseded_by uuid;

CREATE OR REPLACE FUNCTION public.resubmit_rejected_property(p_operation_id uuid, p_draft_id uuid, p_expected_revision bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_rejected public.properties%ROWTYPE;
  v_latest public.property_submissions%ROWTYPE;
  v_draft public.property_drafts%ROWTYPE;
  v_new uuid;
BEGIN
  IF v_owner IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_owner AND p.role = 'landlord' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active landlord required' USING ERRCODE = '42501';
  END IF;
  IF p_operation_id IS NULL OR p_draft_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision < 1 THEN
    RAISE EXCEPTION 'invalid resubmission' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('property-submission-owner:' || v_owner::text, 0));
  IF EXISTS (SELECT 1 FROM public.property_submissions WHERE owner_id = v_owner AND operation_id = p_operation_id) THEN
    RAISE EXCEPTION 'operation already used' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM public.property_submissions WHERE draft_id = p_draft_id AND expected_revision = p_expected_revision) THEN
    RAISE EXCEPTION 'this draft revision was already submitted' USING ERRCODE = '23505';
  END IF;
  SELECT * INTO v_rejected FROM public.properties WHERE landlord_id = v_owner AND status = 'rejected' ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'no rejected property to resubmit' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_draft FROM public.property_drafts WHERE id = p_draft_id AND owner_id = v_owner AND revision = p_expected_revision FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'draft changed or unavailable' USING ERRCODE = '40001'; END IF;
  INSERT INTO public.properties(landlord_id, title, description, property_type, street_address, barangay, city, coordinates)
  SELECT v_owner, v_p->>'title', v_p->>'description', v_p->>'property_type', v_p->>'street_address', v_p->>'barangay', v_p->>'city',
    extensions.ST_SetSRID(extensions.ST_MakePoint((v_p->>'longitude')::numeric, (v_p->>'latitude')::numeric), 4326)
  FROM public.property_drafts d, LATERAL (SELECT d.payload->'property' AS v_p) v
  WHERE d.id = p_draft_id
  RETURNING id INTO v_new;
  INSERT INTO public.rental_units(property_id, rental_type, monthly_rent, max_occupants)
  SELECT v_new, v_u->>'rental_type', (v_u->>'monthly_rent')::numeric, GREATEST(1, COALESCE(NULLIF(v_u->>'max_occupants','')::integer, 1))
  FROM public.property_drafts d, LATERAL (SELECT d.payload->'unit' AS v_u) v WHERE d.id = p_draft_id;
  INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media)
  SELECT v_owner, p_operation_id, p_draft_id, p_expected_revision, v_new, d.payload,
    COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('operation_id', m.operation_id, 'kind', m.kind, 'content_type', m.content_type, 'size_bytes', m.size_bytes, 'content_sha256', m.content_sha256, 'object_path', m.object_path) ORDER BY m.created_at) FROM public.property_draft_media m WHERE m.draft_id = p_draft_id AND m.confirmed), '[]'::jsonb)
  FROM public.property_drafts d WHERE d.id = p_draft_id;
  SELECT * INTO v_latest FROM public.property_submissions WHERE owner_id = v_owner AND operation_id = p_operation_id;
  UPDATE public.property_submissions s SET superseded_by = v_latest.operation_id
    FROM public.property_submissions latest
    WHERE s.owner_id = v_owner AND s.property_id = v_rejected.id AND s.operation_id = latest.operation_id
      AND s.operation_id <> v_latest.operation_id;
  UPDATE public.properties SET status = 'pending', moderation_note = NULL, approved_by = NULL, approved_at = NULL WHERE id = v_new;
  RETURN pg_catalog.jsonb_build_object('property_id', v_new, 'status', 'pending');
END;
$$;
REVOKE ALL ON FUNCTION public.resubmit_rejected_property(uuid,uuid,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resubmit_rejected_property(uuid,uuid,bigint) TO authenticated;

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
  SELECT * INTO v_prop FROM public.properties WHERE id = v_sub.property_id;
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
