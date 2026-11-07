-- Landlords need moderation_note to see why their submission was rejected (dashboard review section).
-- Owner-scoped SELECT only; RLS policy property_owner_read already restricts to the owner landlord.
BEGIN;
GRANT SELECT (moderation_note) ON public.properties TO authenticated;
COMMIT;
