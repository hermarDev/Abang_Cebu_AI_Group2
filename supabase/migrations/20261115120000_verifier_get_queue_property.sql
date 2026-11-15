-- Return one active queue item without scanning the paginated queue.
CREATE OR REPLACE FUNCTION public.verifier_get_queue_property(p_property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_actor
      AND p.role::text IN ('verification_officer', 'admin')
      AND NOT p.is_suspended
  ) THEN
    RAISE EXCEPTION 'active verifier or admin required' USING ERRCODE = '42501';
  END IF;

  SELECT pg_catalog.jsonb_build_object(
    'id', p.id,
    'title', CASE WHEN p.status = 'approved' THEN COALESCE(NULLIF(s.snapshot_payload->'property'->>'title', ''), NULLIF(s.snapshot_payload->'property'->>'name', ''), p.title) ELSE p.title END,
    'description', CASE WHEN p.status = 'approved' THEN COALESCE(NULLIF(s.snapshot_payload->'property'->>'description', ''), p.description) ELSE p.description END,
    'propertyType', CASE WHEN p.status = 'approved' THEN COALESCE(NULLIF(s.snapshot_payload->'property'->>'property_type', ''), NULLIF(s.snapshot_payload->'property'->>'propertyType', ''), p.property_type) ELSE p.property_type END,
    'publishedTitle', p.title,
    'publishedDescription', p.description,
    'publishedPropertyType', p.property_type,
    'isPendingRevision', (p.status = 'approved' AND s.review_status = 'pending'),
    'proposedUnit', CASE WHEN p.status = 'approved' THEN s.snapshot_payload->'unit' ELSE NULL END,
    'proposedUnits', CASE WHEN p.status = 'approved' THEN s.snapshot_payload->'units' ELSE NULL END,
    'displaySource', CASE WHEN p.status = 'approved' THEN 'pending_revision_snapshot' ELSE 'live_submission' END,
    'streetAddress', p.street_address,
    'barangay', p.barangay,
    'city', p.city,
    'latitude', p.latitude,
    'longitude', p.longitude,
    'landlordId', p.landlord_id,
    'landlordName', owner.full_name,
    'landlordPhone', owner.phone_number,
    'submissionDraftId', s.draft_id,
    'submissionExpectedRevision', s.expected_revision,
    'submissionOperationId', s.operation_id,
    'submissionCreatedAt', s.created_at,
    'reviewStatus', s.review_status,
    'fieldVerificationStatus', s.field_verification_status,
    'fieldVerifiedBy', s.field_verified_by,
    'fieldVerifiedAt', s.field_verified_at,
    'fieldVerificationMethod', s.field_verification_method,
    'fieldVerificationNotes', s.field_verification_notes,
    'fieldVerificationProof', s.field_verification_proof,
    'fieldVerificationProxyName', s.field_verification_proxy_name,
    'fieldVerificationProxyRelationship', s.field_verification_proxy_relationship
  ) INTO v_result
  FROM public.properties p
  JOIN public.profiles owner ON owner.id = p.landlord_id
  JOIN LATERAL (
    SELECT s.* FROM public.property_submissions s
    WHERE s.property_id = p.id AND s.superseded_by IS NULL AND s.review_status = 'pending'
    ORDER BY s.created_at DESC LIMIT 1
  ) s ON true
  WHERE p.id = p_property_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.verifier_get_queue_property(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verifier_get_queue_property(uuid) TO authenticated;
