-- Preserve filenames without changing the existing media intent or confirmation contracts.
BEGIN;
-- Keep fail-closed until migration replay, concurrency, and privilege checks pass.
DO $$ BEGIN RAISE EXCEPTION 'Incomplete migration: security and retry review required'; END $$;

ALTER TABLE public.property_draft_media ADD COLUMN IF NOT EXISTS original_name text;
ALTER TABLE public.property_draft_media ADD CONSTRAINT property_draft_media_name_check CHECK (
  original_name IS NULL OR (
    pg_catalog.octet_length(original_name) BETWEEN 1 AND 255
    AND original_name !~ '[[:cntrl:]/\\]'
  )
);

-- Retain the seven-argument entry point for older clients and delegate its
-- owner, role, path, locking, quota, and replay checks to the original function.
CREATE OR REPLACE FUNCTION public.prepare_property_draft_media(
  p_draft_id uuid, p_operation_id uuid, p_kind text, p_content_type text,
  p_size_bytes bigint, p_sha256 text, p_object_path text, p_original_name text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_result jsonb;
  v_name text;
BEGIN
  IF p_original_name IS NULL OR pg_catalog.octet_length(p_original_name) NOT BETWEEN 1 AND 255
     OR p_original_name ~ '[[:cntrl:]/\\]' THEN
    RAISE EXCEPTION 'invalid filename' USING ERRCODE = '22023';
  END IF;
  v_result := public.prepare_property_draft_media(
    p_draft_id, p_operation_id, p_kind, p_content_type,
    p_size_bytes, p_sha256, p_object_path
  );
  SELECT original_name INTO v_name FROM public.property_draft_media
    WHERE draft_id = p_draft_id AND operation_id = p_operation_id;
  -- Existing operations cannot acquire a filename after the original intent.
  IF v_name IS NULL AND (v_result->>'resumed')::boolean THEN
    RAISE EXCEPTION 'existing media has no original filename' USING ERRCODE = '23505';
  END IF;
  IF v_name IS NOT NULL AND v_name IS DISTINCT FROM p_original_name THEN
    RAISE EXCEPTION 'operation already used for different filename' USING ERRCODE = '23505';
  END IF;
  IF v_name IS NULL THEN
    UPDATE public.property_draft_media SET original_name = p_original_name
      WHERE draft_id = p_draft_id AND operation_id = p_operation_id;
  END IF;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_property_draft_media(uuid,uuid,text,text,bigint,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_property_draft_media(uuid,uuid,text,text,bigint,text,text,text) TO authenticated;
COMMIT;
