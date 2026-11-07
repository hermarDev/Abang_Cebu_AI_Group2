\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,raw_user_meta_data) VALUES ('aa500000-0000-4000-8000-000000000001','{"role":"landlord","full_name":"Photo quota fixture"}');
INSERT INTO public.property_drafts(id,owner_id,operation_id,payload,original_payload) VALUES ('bb500000-0000-4000-8000-000000000001','aa500000-0000-4000-8000-000000000001','cc500000-0000-4000-8000-000000000001','{"property":{},"unit":{}}','{"property":{},"unit":{}}');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aa500000-0000-4000-8000-000000000001',true);
DO $$ DECLARE d uuid:='bb500000-0000-4000-8000-000000000001'; owner uuid:='aa500000-0000-4000-8000-000000000001'; op uuid; p text; i integer; BEGIN
  FOR i IN 1..6 LOOP
    op := ('dd500000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid;
    p := owner::text || '/' || d::text || '/' || op::text || '/' || repeat('a',64) || '.jpg';
    PERFORM public.prepare_property_draft_media(d,op,'photo','image/jpeg',7,repeat('a',64),p,'photo.jpg');
  END LOOP;
  op := 'dd500000-0000-4000-8000-000000000007';
  p := owner::text || '/' || d::text || '/' || op::text || '/' || repeat('a',64) || '.jpg';
  BEGIN
    PERFORM public.prepare_property_draft_media(d,op,'photo','image/jpeg',7,repeat('a',64),p,'photo.jpg');
    RAISE EXCEPTION 'seventh photo was accepted';
  EXCEPTION WHEN program_limit_exceeded THEN NULL; END;
  IF public.release_property_draft_media(d,'dd500000-0000-4000-8000-000000000001') <> 'released' THEN RAISE EXCEPTION 'photo reservation was not released'; END IF;
  PERFORM public.prepare_property_draft_media(d,op,'photo','image/jpeg',7,repeat('a',64),p,'photo.jpg');
END $$;
ROLLBACK;
