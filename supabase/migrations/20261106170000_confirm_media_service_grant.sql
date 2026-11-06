-- Allow only the server's service role to confirm verified draft media.
BEGIN;
GRANT EXECUTE ON FUNCTION public.confirm_property_draft_media(uuid,uuid,uuid,text,text) TO service_role;
COMMIT;
