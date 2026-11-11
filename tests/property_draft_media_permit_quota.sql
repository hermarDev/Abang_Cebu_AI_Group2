\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,raw_user_meta_data) VALUES ('aa510000-0000-4000-8000-000000000001','{"role":"landlord","full_name":"Permit quota fixture"}');
INSERT INTO public.property_drafts(id,owner_id,operation_id,payload,original_payload) VALUES ('bb510000-0000-4000-8000-000000000001','aa510000-0000-4000-8000-000000000001','cc510000-0000-4000-8000-000000000001','{"property":{},"unit":{}}','{"property":{},"unit":{}}');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aa510000-0000-4000-8000-000000000001',true);
DO $$ DECLARE d uuid := 'bb510000-0000-4000-8000-000000000001'; owner uuid := 'aa510000-0000-4000-8000-000000000001'; op uuid; p text; i integer; BEGIN
  FOR i IN 1..5 LOOP
    op := ('dd510000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid;
    p := owner::text || '/' || d::text || '/' || op::text || '/' || repeat('a',64) || '.webp';
    PERFORM public.prepare_property_draft_media(d,op,'permit','image/webp',7,repeat('a',64),p,'permit.webp');
  END LOOP;
  op := 'dd510000-0000-4000-8000-000000000006';
  p := owner::text || '/' || d::text || '/' || op::text || '/' || repeat('a',64) || '.webp';
  BEGIN
    PERFORM public.prepare_property_draft_media(d,op,'permit','image/webp',7,repeat('a',64),p,'permit.webp');
    RAISE EXCEPTION 'sixth permit was accepted';
  EXCEPTION WHEN program_limit_exceeded THEN NULL; END;
  IF public.release_property_draft_media(d,'dd510000-0000-4000-8000-000000000001') <> 'released' THEN RAISE EXCEPTION 'permit reservation was not released'; END IF;
  PERFORM public.prepare_property_draft_media(d,op,'permit','image/webp',7,repeat('a',64),p,'permit.webp');
END $$;
ROLLBACK;
