BEGIN;

-- Keep the current persisted lifecycle values. Submission and moderation are tracked
-- separately so landlords cannot write a public status directly.
ALTER TABLE public.listings
  ADD COLUMN submitted_at timestamptz,
  ADD COLUMN reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN rejection_reason text,
  ADD CONSTRAINT finder_listing_review_reason_length
    CHECK (rejection_reason IS NULL OR length(btrim(rejection_reason)) BETWEEN 10 AND 500),
  ADD CONSTRAINT finder_listing_review_metadata
    CHECK ((reviewed_at IS NULL AND reviewed_by IS NULL AND rejection_reason IS NULL)
      OR (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL));

CREATE INDEX finder_listing_review_queue
  ON public.listings(submitted_at, created_at)
  WHERE submitted_at IS NOT NULL AND reviewed_at IS NULL AND status = 'draft';
CREATE INDEX finder_listings_public_recent ON public.listings(created_at DESC) WHERE status = 'published' AND is_available;

DROP POLICY IF EXISTS finder_listing_insert ON public.listings;
CREATE POLICY finder_listing_insert ON public.listings FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.get_current_user_role() = 'landlord'
    AND status = 'draft' AND published_at IS NULL AND submitted_at IS NULL
    AND reviewed_by IS NULL AND reviewed_at IS NULL AND rejection_reason IS NULL
    AND verification_status IS NULL AND direct_landlord IS NULL);

DROP POLICY IF EXISTS finder_listing_update ON public.listings;
CREATE POLICY finder_listing_update ON public.listings FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND public.get_current_user_role() = 'landlord' AND status = 'draft' AND submitted_at IS NULL)
  WITH CHECK (owner_id = auth.uid() AND public.get_current_user_role() = 'landlord' AND status = 'draft' AND published_at IS NULL);

DROP POLICY IF EXISTS finder_listing_delete ON public.listings;
CREATE POLICY finder_listing_delete ON public.listings FOR DELETE TO authenticated
  USING (owner_id = auth.uid() AND public.get_current_user_role() = 'landlord' AND status = 'draft' AND submitted_at IS NULL);

CREATE POLICY finder_listing_admin_read ON public.listings FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.submit_landlord_listing(listing_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE affected integer;
BEGIN
  IF public.get_current_user_role() IS DISTINCT FROM 'landlord'::public.user_role THEN
    RAISE EXCEPTION 'Only an active landlord can submit a property' USING ERRCODE = '42501';
  END IF;
  UPDATE public.listings SET submitted_at = now()
  WHERE id = listing_id AND owner_id = auth.uid() AND status = 'draft' AND submitted_at IS NULL AND reviewed_at IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_landlord_listing(listing_id uuid, decision text, reason text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE affected integer; clean_reason text := nullif(btrim(reason), '');
BEGIN
  IF public.get_current_user_role() IS DISTINCT FROM 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Only an active admin can review property submissions' USING ERRCODE = '42501';
  END IF;
  IF decision NOT IN ('approve', 'reject') THEN RAISE EXCEPTION 'Unknown property review decision' USING ERRCODE = '22023'; END IF;
  IF decision = 'reject' AND (clean_reason IS NULL OR length(clean_reason) NOT BETWEEN 10 AND 500) THEN
    RAISE EXCEPTION 'A review note between 10 and 500 characters is required' USING ERRCODE = '22023';
  END IF;
  UPDATE public.listings
  SET status = CASE WHEN decision = 'approve' THEN 'published' ELSE 'draft' END,
      published_at = CASE WHEN decision = 'approve' THEN now() ELSE NULL END,
      reviewed_by = auth.uid(), reviewed_at = now(),
      rejection_reason = CASE WHEN decision = 'reject' THEN clean_reason ELSE NULL END
  WHERE id = listing_id AND status = 'draft' AND submitted_at IS NOT NULL AND reviewed_at IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_landlord_listing(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_landlord_listing(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_landlord_listing(uuid), public.review_landlord_listing(uuid, text, text) TO authenticated;

COMMIT;
