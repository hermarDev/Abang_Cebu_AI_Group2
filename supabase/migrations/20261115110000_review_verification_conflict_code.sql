CREATE OR REPLACE FUNCTION public.require_verified_property_review()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.decision = 'approved' AND NOT EXISTS (
    SELECT 1 FROM public.property_submissions s
    WHERE s.owner_id = NEW.submission_owner_id AND s.operation_id = NEW.submission_operation_id
      AND s.property_id = NEW.property_id AND s.superseded_by IS NULL AND s.field_verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'field verification required before admin approval' USING ERRCODE = 'PT409';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.require_verified_property_review() FROM PUBLIC, anon, authenticated;
