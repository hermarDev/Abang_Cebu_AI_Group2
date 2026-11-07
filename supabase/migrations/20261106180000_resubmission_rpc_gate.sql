-- Resubmission must remain unavailable until it validates and binds the exact prior submission.
BEGIN;
REVOKE ALL ON FUNCTION public.resubmit_rejected_property(uuid,uuid,bigint) FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
