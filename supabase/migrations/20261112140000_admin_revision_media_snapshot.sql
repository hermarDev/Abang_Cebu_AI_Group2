-- Only legacy submissions without a payload may read mutable draft media.
CREATE OR REPLACE FUNCTION public.admin_list_properties(p_status text DEFAULT NULL, p_search text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_search text := lower(NULLIF(btrim(p_search), ''));
  v_result jsonb;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'approved', 'rejected', 'archived', 'all') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(t.j ORDER BY t.updated_at DESC, t.created_at DESC, t.id ASC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT p.updated_at, p.created_at, p.id, pg_catalog.jsonb_build_object(
      'id', p.id, 'title', p.title, 'description', p.description, 'propertyType', p.property_type,
      'rentalType', u.rental_type, 'monthlyRent', u.monthly_rent, 'maxOccupants', u.max_occupants,
      'floorAreaSqm', u.floor_area_sqm, 'isAvailable', COALESCE(u.is_available, false),
      'streetAddress', p.street_address, 'barangay', p.barangay, 'city', p.city, 'postalCode', p.postal_code,
      'latitude', p.latitude, 'longitude', p.longitude, 'status', p.status, 'moderationNote', p.moderation_note,
      'landlordId', p.landlord_id, 'landlordName', owner.full_name, 'landlordSuspended', owner.is_suspended,
      'submissionDraftId', s.draft_id, 'submissionExpectedRevision', s.expected_revision,
      'hasPendingRevision', (p.status = 'approved' AND s.review_status = 'pending'),
      'permitApplicability', s.snapshot_payload->'property'->>'permit_applicability',
      'permitNumber', s.snapshot_payload->'property'->>'permit_number',
      'permitLgu', s.snapshot_payload->'property'->>'permit_lgu',
      'permitExpiresOn', s.snapshot_payload->'property'->>'permit_expires_on',
      'permitNotRequiredConfirmed', (s.snapshot_payload->'property'->>'permit_not_required_confirmed' = 'true'),
      'permitExemptionReason', s.snapshot_payload->'property'->>'permit_exemption_reason',
      'documentCategories', s.snapshot_payload->'property'->>'document_categories',
      'documentApplicabilityDecision', s.document_applicability_decision,
      'photoPaths', pg_catalog.to_jsonb(CASE WHEN s.snapshot_payload IS NULL THEN
        ARRAY(
          SELECT m.object_path FROM public.property_draft_media m
          WHERE m.draft_id = s.draft_id AND m.confirmed AND m.released_at IS NULL AND m.kind = 'photo'
          ORDER BY m.created_at)
        ELSE ARRAY(
          SELECT e.elem->>'object_path'
          FROM pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(s.snapshot_media) = 'array' THEN s.snapshot_media ELSE '[]'::jsonb END)
            WITH ORDINALITY AS e(elem, ord)
          WHERE e.elem->>'kind' = 'photo' AND e.elem->>'object_path' IS NOT NULL ORDER BY e.ord)
        END),
      'permitPaths', pg_catalog.to_jsonb(CASE WHEN s.snapshot_payload IS NULL THEN
        ARRAY(
          SELECT m.object_path FROM public.property_draft_media m
          WHERE m.draft_id = s.draft_id AND m.confirmed AND m.released_at IS NULL AND m.kind = 'permit'
          ORDER BY m.created_at)
        ELSE ARRAY(
          SELECT e.elem->>'object_path'
          FROM pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(s.snapshot_media) = 'array' THEN s.snapshot_media ELSE '[]'::jsonb END)
            WITH ORDINALITY AS e(elem, ord)
          WHERE e.elem->>'kind' = 'permit' AND e.elem->>'object_path' IS NOT NULL ORDER BY e.ord)
        END),
      'createdAt', p.created_at, 'updatedAt', p.updated_at) AS j
    FROM public.properties p
    LEFT JOIN public.profiles owner ON owner.id = p.landlord_id
    LEFT JOIN LATERAL (
      SELECT u.* FROM public.rental_units u WHERE u.property_id = p.id ORDER BY u.created_at ASC, u.id ASC LIMIT 1
    ) u ON true
    LEFT JOIN LATERAL (
      SELECT s.* FROM public.property_submissions s WHERE s.property_id = p.id AND s.superseded_by IS NULL
      ORDER BY s.created_at DESC LIMIT 1
    ) s ON true
    WHERE (p_status IS NULL OR p_status = 'all' OR p.status = p_status OR (p_status = 'pending' AND p.status = 'approved' AND s.review_status = 'pending'))
      AND (v_search IS NULL OR pg_catalog.strpos(lower(p.title || ' ' || p.street_address || ' ' || p.barangay || ' ' || p.city || ' ' || COALESCE(owner.full_name, '')), v_search) > 0)
    ORDER BY p.updated_at DESC, p.created_at DESC, p.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100) OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) t;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_properties(text,text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_properties(text,text,integer,integer) TO authenticated;
