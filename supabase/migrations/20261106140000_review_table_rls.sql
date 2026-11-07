-- Lock down review-side tables: no direct table access for authenticated users.
-- All reads/writes go through SECURITY DEFINER functions with explicit owner/admin checks.
BEGIN;
REVOKE ALL ON public.property_submissions FROM authenticated, anon;
REVOKE ALL ON public.property_reviews FROM authenticated, anon;
REVOKE ALL ON public.property_draft_updates FROM authenticated, anon;

CREATE POLICY property_submissions_owner_read ON public.property_submissions
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY property_reviews_owner_read ON public.property_reviews
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.property_submissions s WHERE s.owner_id = auth.uid() AND s.operation_id = property_reviews.submission_operation_id));
CREATE POLICY property_reviews_admin_read ON public.property_reviews
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND NOT p.is_suspended));

GRANT SELECT ON public.property_submissions TO authenticated;
GRANT SELECT ON public.property_reviews TO authenticated;
COMMIT;
