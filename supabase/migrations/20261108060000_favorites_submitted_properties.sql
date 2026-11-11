BEGIN;

ALTER TABLE public.favorites
  DROP CONSTRAINT IF EXISTS favorites_listing_id_fkey;

CREATE OR REPLACE FUNCTION public.cleanup_favorites_on_rental_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = OLD.id)
     AND NOT EXISTS (SELECT 1 FROM public.properties WHERE id = OLD.id) THEN
    DELETE FROM public.favorites WHERE listing_id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_favorites_on_rental_delete() FROM PUBLIC;

DROP TRIGGER IF EXISTS favorites_cleanup_on_listing_delete ON public.listings;
CREATE TRIGGER favorites_cleanup_on_listing_delete
  AFTER DELETE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_favorites_on_rental_delete();

DROP TRIGGER IF EXISTS favorites_cleanup_on_property_delete ON public.properties;
CREATE TRIGGER favorites_cleanup_on_property_delete
  AFTER DELETE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_favorites_on_rental_delete();

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
        FROM public.get_public_submitted_rentals() s
        WHERE s.id = listing_id
      )
    )
  );

COMMIT;
