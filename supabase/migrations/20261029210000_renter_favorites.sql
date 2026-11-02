BEGIN;

DROP POLICY IF EXISTS finder_favorite_read ON public.favorites;
DROP POLICY IF EXISTS finder_favorite_delete ON public.favorites;
DROP POLICY IF EXISTS finder_favorite_insert ON public.favorites;

CREATE POLICY finder_favorite_read ON public.favorites FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.get_current_user_role() = 'renter');
CREATE POLICY finder_favorite_delete ON public.favorites FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.get_current_user_role() = 'renter');
CREATE POLICY finder_favorite_insert ON public.favorites FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.get_current_user_role() = 'renter'
    AND EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_id
        AND l.status = 'published'
        AND l.is_available
    )
  );

COMMIT;