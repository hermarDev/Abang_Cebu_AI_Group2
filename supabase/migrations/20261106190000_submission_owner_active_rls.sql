-- Match submission snapshot visibility to the active-landlord draft policy.
BEGIN;
DROP POLICY IF EXISTS property_submissions_owner_read ON public.property_submissions;
CREATE POLICY property_submissions_owner_read ON public.property_submissions
  FOR SELECT TO authenticated USING (
    owner_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'landlord' AND NOT p.is_suspended
    )
  );
COMMIT;
