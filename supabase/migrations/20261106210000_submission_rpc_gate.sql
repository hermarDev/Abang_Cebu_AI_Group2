-- Keep direct submission unavailable until the complete workflow is validated.
BEGIN;
REVOKE ALL ON FUNCTION public.submit_property_from_draft(uuid,uuid,bigint) FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
