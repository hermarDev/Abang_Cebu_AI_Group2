BEGIN;

-- Keep permit evidence and its review separate from public listing fields and account KYC.
CREATE TABLE public.listing_permit_reviews (
  listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  applicability text NOT NULL CHECK (applicability IN ('required', 'not_required', 'unknown')),
  document_path text,
  permit_number text CHECK (permit_number IS NULL OR length(btrim(permit_number)) BETWEEN 1 AND 100),
  issuing_lgu text CHECK (issuing_lgu IS NULL OR length(btrim(issuing_lgu)) BETWEEN 1 AND 200),
  expires_on date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (document_path IS NULL OR document_path = owner_id::text || '/' || listing_id::text || '/business-permit'),
  CHECK (
    (applicability = 'required' AND document_path IS NOT NULL AND permit_number IS NOT NULL AND issuing_lgu IS NOT NULL AND expires_on IS NOT NULL)
    OR (applicability = 'not_required' AND document_path IS NULL AND permit_number IS NULL AND issuing_lgu IS NULL AND expires_on IS NULL)
    OR (applicability = 'unknown' AND document_path IS NULL AND permit_number IS NULL AND issuing_lgu IS NULL AND expires_on IS NULL)
  ),
  CHECK (
    (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND rejection_reason IS NULL)
    OR (status = 'approved' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND rejection_reason IS NULL)
    OR (status = 'rejected' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL
      AND rejection_reason IS NOT NULL AND length(btrim(rejection_reason)) BETWEEN 10 AND 500)
  )
);
CREATE INDEX listing_permit_review_queue ON public.listing_permit_reviews(status, created_at);
CREATE TRIGGER listing_permit_reviews_updated BEFORE UPDATE ON public.listing_permit_reviews
  FOR EACH ROW EXECUTE FUNCTION public.finder_updated_at();

ALTER TABLE public.listing_permit_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.listing_permit_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.listing_permit_reviews TO authenticated;
GRANT UPDATE (applicability, document_path, permit_number, issuing_lgu, expires_on, status, reviewed_by, reviewed_at, rejection_reason)
  ON public.listing_permit_reviews TO authenticated;

CREATE POLICY listing_permit_owner_read ON public.listing_permit_reviews FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY listing_permit_admin_read ON public.listing_permit_reviews FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY listing_permit_owner_insert ON public.listing_permit_reviews FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid() AND public.get_current_user_role() = 'landlord'
    AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND rejection_reason IS NULL
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.owner_id = auth.uid()
      AND l.status = 'draft' AND l.submitted_at IS NULL AND l.reviewed_at IS NULL)
  );
CREATE POLICY listing_permit_owner_resubmit ON public.listing_permit_reviews FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid() AND public.get_current_user_role() = 'landlord'
    AND (status = 'rejected' OR (status = 'pending' AND applicability = 'unknown')
      OR (status = 'approved' AND applicability = 'required' AND expires_on < (now() AT TIME ZONE 'Asia/Manila')::date))
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.owner_id = auth.uid()
      AND ((l.status = 'draft' AND l.submitted_at IS NOT NULL AND l.reviewed_at IS NULL)
        OR (l.status = 'published' AND l.submitted_at IS NOT NULL AND l.reviewed_at IS NOT NULL)))
  )
  WITH CHECK (
    owner_id = auth.uid() AND public.get_current_user_role() = 'landlord'
    AND applicability IN ('required', 'not_required') AND status = 'pending'
    AND reviewed_by IS NULL AND reviewed_at IS NULL AND rejection_reason IS NULL
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.owner_id = auth.uid()
      AND ((l.status = 'draft' AND l.submitted_at IS NOT NULL AND l.reviewed_at IS NULL)
        OR (l.status = 'published' AND l.submitted_at IS NOT NULL AND l.reviewed_at IS NOT NULL)))
  );

-- Older submissions are marked unknown so their owners confirm applicability before approval.
INSERT INTO public.listing_permit_reviews (listing_id, owner_id, applicability, status)
SELECT id, owner_id, 'unknown', 'pending'
FROM public.listings
WHERE status = 'draft' AND submitted_at IS NOT NULL AND reviewed_at IS NULL
ON CONFLICT (listing_id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('listing-permits', 'listing-permits', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY listing_permit_files_owner_admin_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'listing-permits' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()
  ));
CREATE POLICY listing_permit_files_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-permits' AND public.get_current_user_role() = 'landlord'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND name !~ '(^|/)\.\.?(/|$)'
    AND EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id::text = (storage.foldername(name))[2] AND l.owner_id = auth.uid()
        AND (
          (l.status = 'draft' AND l.submitted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.listing_permit_reviews p WHERE p.listing_id = l.id))
          OR (l.submitted_at IS NOT NULL AND (
            (l.status = 'draft' AND l.reviewed_at IS NULL)
            OR (l.status = 'published' AND l.reviewed_at IS NOT NULL)
          ) AND EXISTS (
            SELECT 1 FROM public.listing_permit_reviews p WHERE p.listing_id = l.id
              AND (p.status = 'rejected' OR (p.status = 'pending' AND p.applicability = 'unknown')
                OR (p.status = 'approved' AND p.applicability = 'required' AND p.expires_on < (now() AT TIME ZONE 'Asia/Manila')::date))
          ))
        )
    )
  );
CREATE POLICY listing_permit_files_replace_rejected ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'listing-permits' AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (SELECT 1 FROM public.listing_permit_reviews p JOIN public.listings l ON l.id = p.listing_id
      WHERE p.document_path = name AND p.owner_id = auth.uid()
        AND (p.status = 'rejected' OR (p.status = 'approved' AND p.applicability = 'required' AND p.expires_on < (now() AT TIME ZONE 'Asia/Manila')::date))
        AND ((l.status = 'draft' AND l.submitted_at IS NOT NULL AND l.reviewed_at IS NULL)
          OR (l.status = 'published' AND l.submitted_at IS NOT NULL AND l.reviewed_at IS NOT NULL)))
  )
  WITH CHECK (
    bucket_id = 'listing-permits' AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (SELECT 1 FROM public.listing_permit_reviews p JOIN public.listings l ON l.id = p.listing_id
      WHERE p.document_path = name AND p.owner_id = auth.uid()
        AND (p.status = 'rejected' OR (p.status = 'approved' AND p.applicability = 'required' AND p.expires_on < (now() AT TIME ZONE 'Asia/Manila')::date))
        AND ((l.status = 'draft' AND l.submitted_at IS NOT NULL AND l.reviewed_at IS NULL)
          OR (l.status = 'published' AND l.submitted_at IS NOT NULL AND l.reviewed_at IS NOT NULL)))
  );
CREATE POLICY listing_permit_files_remove_unreviewed ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'listing-permits' AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.get_current_user_role() = 'landlord'
    AND NOT EXISTS (SELECT 1 FROM public.listing_permit_reviews p WHERE p.document_path = name
      AND p.status <> 'rejected' AND NOT (p.status = 'approved' AND p.applicability = 'required' AND p.expires_on < (now() AT TIME ZONE 'Asia/Manila')::date))
  );

CREATE OR REPLACE FUNCTION public.submit_landlord_listing(listing_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE affected integer;
BEGIN
  IF public.get_current_user_role() IS DISTINCT FROM 'landlord'::public.user_role THEN
    RAISE EXCEPTION 'Only an active landlord can submit a property' USING ERRCODE = '42501';
  END IF;
  UPDATE public.listings l SET submitted_at = now()
  WHERE l.id = listing_id AND l.owner_id = auth.uid() AND l.status = 'draft'
    AND l.submitted_at IS NULL AND l.reviewed_at IS NULL
    AND EXISTS (SELECT 1 FROM public.listing_permit_reviews p WHERE p.listing_id = l.id
      AND p.owner_id = auth.uid() AND p.status = 'pending' AND p.applicability IN ('required', 'not_required'));
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.listing_permit_public_access(listing_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.listing_permit_reviews p WHERE p.listing_id = $1)
    OR EXISTS (
      SELECT 1 FROM public.listing_permit_reviews p
      WHERE p.listing_id = $1 AND p.status = 'approved'
        AND (p.applicability = 'not_required'
          OR (p.applicability = 'required' AND p.expires_on >= (now() AT TIME ZONE 'Asia/Manila')::date
            AND EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'listing-permits' AND o.name = p.document_path)))
    );
$$;
REVOKE ALL ON FUNCTION public.listing_permit_public_access(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.listing_permit_public_access(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS finder_listing_public ON public.listings;
CREATE POLICY finder_listing_public ON public.listings FOR SELECT TO anon, authenticated
  USING (is_available AND status = 'published' AND public.listing_permit_public_access(id));

CREATE OR REPLACE FUNCTION public.review_landlord_listing_permit(listing_id uuid, decision text, reason text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE affected integer; clean_reason text := nullif(btrim(reason), '');
BEGIN
  IF public.get_current_user_role() IS DISTINCT FROM 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Only an active admin can review a business permit' USING ERRCODE = '42501';
  END IF;
  IF decision IS NULL OR decision NOT IN ('approve', 'reject') THEN RAISE EXCEPTION 'Unknown permit review decision' USING ERRCODE = '22023'; END IF;
  IF decision = 'reject' AND (clean_reason IS NULL OR length(clean_reason) NOT BETWEEN 10 AND 500) THEN
    RAISE EXCEPTION 'A permit review note between 10 and 500 characters is required' USING ERRCODE = '22023';
  END IF;
  UPDATE public.listing_permit_reviews p
  SET status = CASE WHEN decision = 'approve' THEN 'approved' ELSE 'rejected' END,
      reviewed_by = auth.uid(), reviewed_at = now(),
      rejection_reason = CASE WHEN decision = 'reject' THEN clean_reason ELSE NULL END
  FROM public.listings l
  WHERE p.listing_id = $1 AND l.id = p.listing_id AND l.submitted_at IS NOT NULL
    AND ((l.status = 'draft' AND l.reviewed_at IS NULL) OR (l.status = 'published' AND l.reviewed_at IS NOT NULL))
    AND p.status = 'pending' AND p.applicability IN ('required', 'not_required')
    AND (decision <> 'approve' OR p.applicability <> 'required'
      OR (p.document_path IS NOT NULL AND p.expires_on >= (now() AT TIME ZONE 'Asia/Manila')::date
        AND EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'listing-permits' AND o.name = p.document_path)));
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
  IF decision IS NULL OR decision NOT IN ('approve', 'reject') THEN RAISE EXCEPTION 'Unknown property review decision' USING ERRCODE = '22023'; END IF;
  IF decision = 'reject' AND (clean_reason IS NULL OR length(clean_reason) NOT BETWEEN 10 AND 500) THEN
    RAISE EXCEPTION 'A review note between 10 and 500 characters is required' USING ERRCODE = '22023';
  END IF;
  IF decision = 'approve' AND NOT EXISTS (
    SELECT 1 FROM public.listing_permit_reviews p WHERE p.listing_id = $1 AND p.status = 'approved'
      AND (p.applicability = 'not_required'
        OR (p.applicability = 'required' AND p.expires_on >= (now() AT TIME ZONE 'Asia/Manila')::date
          AND EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'listing-permits' AND o.name = p.document_path)))
  ) THEN
    RAISE EXCEPTION 'Approve the permit document or confirm that a permit is not required before publishing' USING ERRCODE = '22023';
  END IF;
  UPDATE public.listings SET status = CASE WHEN decision = 'approve' THEN 'published' ELSE 'draft' END,
      published_at = CASE WHEN decision = 'approve' THEN now() ELSE NULL END,
      reviewed_by = auth.uid(), reviewed_at = now(),
      rejection_reason = CASE WHEN decision = 'reject' THEN clean_reason ELSE NULL END
  WHERE id = $1 AND status = 'draft' AND submitted_at IS NOT NULL AND reviewed_at IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_landlord_listing(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_landlord_listing(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_landlord_listing_permit(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_landlord_listing(uuid), public.review_landlord_listing(uuid, text, text),
  public.review_landlord_listing_permit(uuid, text, text) TO authenticated;

COMMIT;
