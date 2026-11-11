-- Enable direct property submission for authenticated landlords.
BEGIN;
GRANT EXECUTE ON FUNCTION public.submit_property_from_draft(uuid,uuid,bigint) TO authenticated;
COMMIT;
