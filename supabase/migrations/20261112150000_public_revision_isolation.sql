-- Review bindings/status backfills alone cannot establish historical approval.
BEGIN;
CREATE OR REPLACE FUNCTION public.get_public_submitted_rentals()
RETURNS TABLE (
  id uuid, title text, description text, price numeric, property_type text, rental_type text,
  latitude double precision, longitude double precision, address text, barangay text, city text,
  max_occupants integer, floor_area_sqm numeric, bathroom_type text, tenant_policy text,
  amenities jsonb, photo_paths text[], moderation_status text, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p.id, p.title, p.description, u.monthly_rent, p.property_type, u.rental_type,
    p.latitude::double precision, p.longitude::double precision, p.street_address, p.barangay, p.city,
    u.max_occupants, u.floor_area_sqm,
    NULLIF(s.snapshot_payload->'unit'->>'bathroom_type', ''),
    NULLIF(s.snapshot_payload->'unit'->>'tenant_policy', ''),
    CASE WHEN pg_catalog.jsonb_typeof(s.snapshot_payload->'amenities') = 'array' THEN s.snapshot_payload->'amenities' ELSE '[]'::jsonb END,
    CASE WHEN s.snapshot_payload IS NOT NULL THEN ARRAY(
        SELECT dedup.object_path
        FROM (
          SELECT DISTINCT ON (COALESCE(e.elem->>'content_sha256', e.elem->>'object_path'))
            e.elem->>'object_path' AS object_path,
            e.ord
          FROM pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(s.snapshot_media) = 'array' THEN s.snapshot_media ELSE '[]'::jsonb END)
            WITH ORDINALITY AS e(elem, ord)
          WHERE e.elem->>'kind' = 'photo'
            AND e.elem->>'object_path' ~ '^[0-9a-f-]+/[0-9a-f-]+/[0-9a-f-]+/[0-9a-f]{64}\.(jpg|png|webp)$'
          ORDER BY COALESCE(e.elem->>'content_sha256', e.elem->>'object_path'), e.ord
        ) dedup
        ORDER BY dedup.ord
      ) WHEN p.status = 'pending' AND s.snapshot_payload IS NULL THEN ARRAY(
        SELECT dedup.object_path
        FROM (
          SELECT DISTINCT ON (COALESCE(m.content_sha256, m.object_path))
            m.object_path,
            m.created_at
          FROM public.property_draft_media m
          WHERE m.draft_id = s.draft_id AND m.confirmed AND m.released_at IS NULL AND m.kind = 'photo'
            AND m.object_path ~ '^[0-9a-f-]+/[0-9a-f-]+/[0-9a-f-]+/[0-9a-f]{64}\.(jpg|png|webp)$'
          ORDER BY COALESCE(m.content_sha256, m.object_path), m.created_at
        ) dedup
        ORDER BY dedup.created_at
      ) ELSE '{}'::text[] END,
    p.status, p.created_at
  FROM public.properties p
  JOIN LATERAL (
    SELECT u.* FROM public.rental_units u WHERE u.property_id = p.id AND u.is_available = true
    ORDER BY u.created_at ASC, u.id ASC LIMIT 1
  ) u ON true
  LEFT JOIN LATERAL (
    SELECT s.* FROM public.property_submissions s
    LEFT JOIN LATERAL (
      SELECT r.created_at, r.operation_id
      FROM public.property_reviews r
      JOIN public.admin_audit_logs a ON a.admin_id = r.admin_id AND a.operation_id = r.operation_id
        AND a.target_type = 'property' AND a.target_id = r.property_id
        AND a.action_type = 'property_approved'
        AND a.new_state->>'status' = 'approved'
        AND a.new_state->>'draft_id' = s.draft_id::text
        AND a.new_state->>'revision' = s.expected_revision::text
      WHERE r.property_id = s.property_id AND r.submission_owner_id = s.owner_id
        AND r.submission_operation_id = s.operation_id AND r.decision = 'approved'
        AND r.created_at >= s.created_at AND a.created_at >= s.created_at
      ORDER BY r.created_at DESC, r.operation_id DESC LIMIT 1
    ) accepted ON true
    WHERE s.property_id = p.id AND (
      (p.status = 'pending' AND s.superseded_by IS NULL)
      OR (p.status = 'approved' AND accepted.operation_id IS NOT NULL)
    )
    ORDER BY accepted.created_at DESC NULLS LAST, s.created_at DESC, s.operation_id DESC LIMIT 1
  ) s ON true
  WHERE p.status IN ('approved', 'pending') AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.profiles owner WHERE owner.id = p.landlord_id AND NOT owner.is_suspended)
  ORDER BY p.created_at DESC, p.id ASC
  LIMIT 200
$$;

REVOKE ALL ON FUNCTION public.get_public_submitted_rentals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_submitted_rentals() TO anon, authenticated;

COMMIT;
