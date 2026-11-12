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
  WITH latest_approved_submission AS (
    SELECT s.property_id, s.draft_id, s.expected_revision, s.snapshot_payload, s.snapshot_media,
           r.created_at AS review_created_at
    FROM public.property_submissions s
    JOIN public.property_reviews r
      ON r.property_id = s.property_id
     AND r.submission_owner_id = s.owner_id
     AND r.submission_operation_id = s.operation_id
     AND r.decision = 'approved'
    JOIN public.admin_audit_logs a
      ON a.admin_id = r.admin_id
     AND a.operation_id = r.operation_id
     AND a.target_type = 'property'
     AND a.target_id = r.property_id
     AND a.action_type = 'property_approved'
     AND a.new_state->>'status' = 'approved'
     AND a.new_state->>'draft_id' = s.draft_id::text
     AND a.new_state->>'revision' = s.expected_revision::text
    WHERE r.created_at >= s.created_at
      AND a.created_at >= s.created_at
  ),
  ranked_submissions AS (
    SELECT p.id, p.title, p.description, u.monthly_rent AS price, p.property_type, u.rental_type,
           p.latitude::double precision, p.longitude::double precision,
           p.street_address AS address, p.barangay, p.city,
           u.max_occupants, u.floor_area_sqm,
           NULLIF(l.snapshot_payload->'unit'->>'bathroom_type', '') AS bathroom_type,
           NULLIF(l.snapshot_payload->'unit'->>'tenant_policy', '') AS tenant_policy,
           CASE WHEN pg_catalog.jsonb_typeof(l.snapshot_payload->'amenities') = 'array'
                THEN l.snapshot_payload->'amenities' ELSE '[]'::jsonb END AS amenities,
           CASE WHEN l.snapshot_payload IS NOT NULL THEN ARRAY(
               SELECT dedup.object_path
               FROM (
                 SELECT DISTINCT ON (COALESCE(e.elem->>'content_sha256', e.elem->>'object_path'))
                       e.elem->>'object_path' AS object_path, e.ord
                 FROM pg_catalog.jsonb_array_elements(
                        CASE WHEN pg_catalog.jsonb_typeof(l.snapshot_media) = 'array'
                             THEN l.snapshot_media ELSE '[]'::jsonb END
                      ) WITH ORDINALITY AS e(elem, ord)
                 WHERE e.elem->>'kind' = 'photo'
                   AND e.elem->>'object_path' ~ '^[0-9a-f-]+/[0-9a-f-]+/[0-9a-f-]+/[0-9a-f]{64}\.(jpg|png|webp)$'
                 ORDER BY COALESCE(e.elem->>'content_sha256', e.elem->>'object_path'), e.ord
               ) dedup
               ORDER BY dedup.ord
             )
             WHEN p.status = 'pending' AND l.snapshot_payload IS NULL THEN ARRAY(
               SELECT dedup.object_path
               FROM (
                 SELECT DISTINCT ON (COALESCE(m.content_sha256, m.object_path))
                       m.object_path, m.created_at
                 FROM public.property_draft_media m
                 WHERE m.draft_id = l.draft_id
                   AND m.confirmed AND m.released_at IS NULL AND m.kind = 'photo'
                   AND m.object_path ~ '^[0-9a-f-]+/[0-9a-f-]+/[0-9a-f-]+/[0-9a-f]{64}\.(jpg|png|webp)$'
                 ORDER BY COALESCE(m.content_sha256, m.object_path), m.created_at
               ) dedup
               ORDER BY dedup.created_at
             )
             ELSE '{}'::text[] END AS photo_paths,
           p.status AS moderation_status, p.created_at,
           ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY l.review_created_at DESC NULLS LAST) AS rn
    FROM public.properties p
    JOIN LATERAL (
      SELECT u.* FROM public.rental_units u
      WHERE u.property_id = p.id AND u.is_available = true
      ORDER BY u.created_at ASC, u.id ASC LIMIT 1
    ) u ON true
    LEFT JOIN LATERAL (
      SELECT s.* FROM public.property_submissions s
      WHERE s.property_id = p.id
        AND ((p.status = 'pending' AND s.superseded_by IS NULL)
             OR (p.status = 'approved' AND EXISTS (
               SELECT 1 FROM latest_approved_submission las
               WHERE las.property_id = s.property_id
                 AND las.draft_id = s.draft_id
                 AND las.expected_revision = s.expected_revision
             )))
      ORDER BY s.created_at DESC LIMIT 1
    ) s ON true
    LEFT JOIN latest_approved_submission l
      ON l.property_id = p.id
     AND l.draft_id = s.draft_id
     AND l.expected_revision = s.expected_revision
    WHERE p.status IN ('approved', 'pending')
      AND p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.profiles owner
                  WHERE owner.id = p.landlord_id AND NOT owner.is_suspended)
  )
  SELECT id, title, description, price, property_type, rental_type,
         latitude, longitude, address, barangay, city,
         max_occupants, floor_area_sqm,
         bathroom_type, tenant_policy, amenities,
         photo_paths, moderation_status, created_at
  FROM ranked_submissions
  WHERE rn = 1
  ORDER BY created_at DESC, id ASC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.get_public_submitted_rentals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_submitted_rentals() TO anon, authenticated;

COMMIT;