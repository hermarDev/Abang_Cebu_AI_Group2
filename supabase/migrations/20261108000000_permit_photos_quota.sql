-- Permit WebP and up to five active permit media reservations per draft.
BEGIN;
CREATE OR REPLACE FUNCTION public.prepare_property_draft_media(
  p_draft_id uuid, p_operation_id uuid, p_kind text, p_content_type text,
  p_size_bytes bigint, p_sha256 text, p_object_path text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_existing public.property_draft_media%ROWTYPE;
BEGIN
  IF v_owner IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_owner AND p.role = 'landlord' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active landlord required' USING ERRCODE = '42501';
  END IF;
  IF p_draft_id IS NULL OR p_operation_id IS NULL OR p_kind NOT IN ('photo','permit')
    OR p_content_type NOT IN ('image/jpeg','image/png','image/webp','application/pdf')
    OR p_size_bytes IS NULL OR p_size_bytes <= 0 OR p_size_bytes > 10485760
    OR p_sha256 IS NULL OR pg_catalog.octet_length(p_sha256) <> 64 OR p_sha256 !~ '^[0-9a-f]+$'
    OR p_object_path IS NULL OR p_object_path <> (v_owner::text || '/' || p_draft_id::text || '/' || p_operation_id::text || '/' || p_sha256 || '.' || CASE p_content_type WHEN 'application/pdf' THEN 'pdf' WHEN 'image/png' THEN 'png' WHEN 'image/webp' THEN 'webp' ELSE 'jpg' END)
    OR (p_kind = 'photo' AND p_content_type = 'application/pdf') THEN
    RAISE EXCEPTION 'invalid media request' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.property_drafts WHERE id = p_draft_id AND owner_id = v_owner) THEN
    RAISE EXCEPTION 'draft unavailable' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('property-draft-media:' || p_draft_id::text, 0));
  SELECT * INTO v_existing FROM public.property_draft_media WHERE draft_id = p_draft_id AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_existing.released_at IS NOT NULL THEN
      RAISE EXCEPTION 'operation already released' USING ERRCODE = '23505';
    END IF;
    IF v_existing.kind IS DISTINCT FROM p_kind OR v_existing.content_type IS DISTINCT FROM p_content_type
      OR v_existing.size_bytes IS DISTINCT FROM p_size_bytes OR v_existing.content_sha256 IS DISTINCT FROM p_sha256
      OR v_existing.object_path IS DISTINCT FROM p_object_path THEN
      RAISE EXCEPTION 'operation already used for different media' USING ERRCODE = '23505';
    END IF;
    RETURN pg_catalog.jsonb_build_object('objectPath', v_existing.object_path, 'sha256', v_existing.content_sha256, 'resumed', true, 'confirmed', v_existing.confirmed);
  END IF;
  IF (SELECT count(*) FROM public.property_draft_media m WHERE m.draft_id = p_draft_id AND m.kind = 'photo' AND m.released_at IS NULL) >= 6 AND p_kind = 'photo' THEN
    RAISE EXCEPTION 'photo limit reached' USING ERRCODE = '54000';
  END IF;
  IF p_kind = 'permit' AND (SELECT count(*) FROM public.property_draft_media m WHERE m.draft_id = p_draft_id AND m.kind = 'permit' AND m.released_at IS NULL) >= 5 THEN
    RAISE EXCEPTION 'permit limit reached' USING ERRCODE = '54000';
  END IF;
  INSERT INTO public.property_draft_media(draft_id, operation_id, kind, content_type, size_bytes, content_sha256, object_path)
  VALUES (p_draft_id, p_operation_id, p_kind, p_content_type, p_size_bytes, p_sha256, p_object_path);
  RETURN pg_catalog.jsonb_build_object('objectPath', p_object_path, 'sha256', p_sha256, 'resumed', false);
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_property_draft_media(uuid,uuid,text,text,bigint,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_property_draft_media(uuid,uuid,text,text,bigint,text,text) TO authenticated;
COMMIT;
