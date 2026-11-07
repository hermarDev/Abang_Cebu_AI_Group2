-- Confirm is server-only: call it through the service role with the verified owner id.
BEGIN;
CREATE OR REPLACE FUNCTION public.confirm_property_draft_media(
  p_owner_id uuid, p_draft_id uuid, p_operation_id uuid, p_sha256 text, p_object_path text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_media public.property_draft_media%ROWTYPE;
BEGIN
  IF p_owner_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_owner_id AND p.role = 'landlord' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active landlord required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_media FROM public.property_draft_media m
    WHERE m.draft_id = p_draft_id AND m.operation_id = p_operation_id
      AND EXISTS (SELECT 1 FROM public.property_drafts d WHERE d.id = m.draft_id AND d.owner_id = p_owner_id);
  IF NOT FOUND OR v_media.content_sha256 IS DISTINCT FROM p_sha256 OR v_media.object_path IS DISTINCT FROM p_object_path THEN
    RAISE EXCEPTION 'media operation conflicts' USING ERRCODE = '23505';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'property-draft-media' AND name = v_media.object_path) THEN
    RAISE EXCEPTION 'uploaded object missing' USING ERRCODE = '22023';
  END IF;
  UPDATE public.property_draft_media SET confirmed = true WHERE draft_id = p_draft_id AND operation_id = p_operation_id;
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_property_draft_media(uuid,uuid,uuid,text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.confirm_property_draft_media(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
