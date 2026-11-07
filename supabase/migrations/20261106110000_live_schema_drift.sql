-- Reconcile live schema drift found while running fixtures against the linked project.
-- The remote applied an earlier revision of 20261104130000 that lacked created_at/payload_sha256
-- and the normalized digest function; bring it to the current migration state.
BEGIN;
CREATE OR REPLACE FUNCTION public.property_draft_payload_digest(p_payload jsonb)
RETURNS bytea LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_set(pg_catalog.jsonb_set(p_payload, '{property}',
      COALESCE((SELECT pg_catalog.jsonb_object_agg(e.key, CASE WHEN pg_catalog.jsonb_typeof(e.value) = 'number'
        THEN pg_catalog.to_jsonb(pg_catalog.trim_scale((e.value #>> '{}')::numeric)) ELSE e.value END)
        FROM pg_catalog.jsonb_each(p_payload->'property') e), '{}'::jsonb)), '{unit}',
      COALESCE((SELECT pg_catalog.jsonb_object_agg(e.key, CASE WHEN pg_catalog.jsonb_typeof(e.value) = 'number'
        THEN pg_catalog.to_jsonb(pg_catalog.trim_scale((e.value #>> '{}')::numeric)) ELSE e.value END)
        FROM pg_catalog.jsonb_each(p_payload->'unit') e), '{}'::jsonb))::text, 'UTF8'));
$$;
REVOKE ALL ON FUNCTION public.property_draft_payload_digest(jsonb) FROM PUBLIC, anon, authenticated;
ALTER TABLE public.property_draft_updates
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp();
ALTER TABLE public.property_draft_updates
  ADD COLUMN IF NOT EXISTS payload_sha256 bytea;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'property_draft_updates' AND column_name = 'payload') THEN
    EXECUTE 'UPDATE public.property_draft_updates SET payload_sha256 = public.property_draft_payload_digest(payload) WHERE payload_sha256 IS NULL AND payload IS NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM public.property_draft_updates WHERE payload_sha256 IS NULL) THEN
    RAISE EXCEPTION 'cannot preserve draft update digest';
  END IF;
END $$;
ALTER TABLE public.property_draft_updates DROP COLUMN IF EXISTS payload;
ALTER TABLE public.property_draft_updates ALTER COLUMN payload_sha256 SET NOT NULL;
COMMIT;
