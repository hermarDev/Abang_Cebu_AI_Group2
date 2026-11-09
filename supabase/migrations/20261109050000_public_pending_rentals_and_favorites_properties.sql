-- Migration: 20261109050000_public_pending_rentals_and_favorites_properties.sql
-- 1. Expose both approved and pending submitted properties in get_public_submitted_rentals()
-- 2. Clean favorites when a property is deleted
-- 3. Allow renters to favorite submitted properties via finder_favorite_insert RLS policy

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
    COALESCE(
      NULLIF(ARRAY(
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
      ), '{}'::text[]),
      ARRAY(
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
  WHERE p.status IN ('approved', 'pending') AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.profiles owner WHERE owner.id = p.landlord_id AND NOT owner.is_suspended)
  ORDER BY p.created_at DESC, p.id ASC
  LIMIT 200
$$;

REVOKE ALL ON FUNCTION public.get_public_submitted_rentals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_submitted_rentals() TO anon, authenticated;

-- 2. Clean favorites when a property is deleted
CREATE OR REPLACE FUNCTION public.clean_favorites_on_property_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.favorites WHERE listing_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_clean_favorites_on_property_delete ON public.properties;
CREATE TRIGGER trg_clean_favorites_on_property_delete
AFTER DELETE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.clean_favorites_on_property_delete();

-- 3. Update finder_favorite_insert policy to allow saving either published listings or submitted properties
DROP POLICY IF EXISTS finder_favorite_insert ON public.favorites;
CREATE POLICY finder_favorite_insert ON public.favorites FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.get_current_user_role() = 'renter'
    AND (
      EXISTS (
        SELECT 1
        FROM public.listings l
        WHERE l.id = listing_id
          AND l.status = 'published'
          AND l.is_available
      )
      OR EXISTS (
        SELECT 1
        FROM public.get_public_submitted_rentals() r
        WHERE r.id = listing_id
      )
    )
  );

COMMIT;
