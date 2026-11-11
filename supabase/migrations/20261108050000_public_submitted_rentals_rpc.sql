BEGIN;

-- Public read model for submitted (pending/approved) landlord properties.
-- Never exposes landlord_id, moderation_note, or permit media.
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
    COALESCE(
      NULLIF(ARRAY(
        SELECT e.elem->>'object_path'
        FROM pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(s.snapshot_media) = 'array' THEN s.snapshot_media ELSE '[]'::jsonb END)
          WITH ORDINALITY AS e(elem, ord)
        WHERE e.elem->>'kind' = 'photo'
          AND e.elem->>'object_path' ~ '^[0-9a-f-]+/[0-9a-f-]+/[0-9a-f-]+/[0-9a-f]{64}\.(jpg|png|webp)$'
        ORDER BY e.ord
      ), '{}'::text[]),
      ARRAY(
        SELECT m.object_path FROM public.property_draft_media m
        WHERE m.draft_id = s.draft_id AND m.confirmed AND m.released_at IS NULL AND m.kind = 'photo'
          AND m.object_path ~ '^[0-9a-f-]+/[0-9a-f-]+/[0-9a-f-]+/[0-9a-f]{64}\.(jpg|png|webp)$'
        ORDER BY m.created_at
      )
    ),
    p.status, p.created_at
  FROM public.properties p
  JOIN LATERAL (
    SELECT u.* FROM public.rental_units u WHERE u.property_id = p.id AND u.is_available = true
    ORDER BY u.created_at ASC, u.id ASC LIMIT 1
  ) u ON true
  LEFT JOIN LATERAL (
    SELECT s.* FROM public.property_submissions s WHERE s.property_id = p.id AND s.superseded_by IS NULL
    ORDER BY s.created_at DESC LIMIT 1
  ) s ON true
  WHERE p.status IN ('pending', 'approved') AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
  ORDER BY p.created_at DESC, p.id ASC
  LIMIT 200
$$;

REVOKE ALL ON FUNCTION public.get_public_submitted_rentals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_submitted_rentals() TO anon, authenticated;

COMMIT;
