\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
  IF to_regprocedure('public.save_property_draft(uuid,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'retry-safe property draft RPC is required';
  END IF;
END $$;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('aaaaaaaa-0000-0000-0000-000000000001', '{"role":"landlord","full_name":"Draft Owner"}'),
 ('aaaaaaaa-0000-0000-0000-000000000002', '{"role":"landlord","full_name":"Another Owner"}'),
 ('aaaaaaaa-0000-0000-0000-000000000003', '{"role":"renter","full_name":"Renter"}'),
 ('aaaaaaaa-0000-0000-0000-000000000004', '{"role":"landlord","full_name":"Suspended"}');
UPDATE public.profiles SET is_suspended=true WHERE id='aaaaaaaa-0000-0000-0000-000000000004';
DO $$ BEGIN
 IF to_regprocedure('public.update_property_draft(uuid,uuid,bigint,jsonb)') IS NULL THEN
   RAISE EXCEPTION 'revision-checked draft update RPC is required';
 END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000001',true);
CREATE TEMP TABLE fixture_ids (draft_id uuid);
GRANT SELECT, INSERT ON fixture_ids TO authenticated;
DO $$ DECLARE p jsonb; BEGIN
 p := jsonb_build_object('property',jsonb_build_object('title',repeat('x',32768 - octet_length('{"property": {"title": ""}, "unit": {}}'))),'unit','{}'::jsonb);
 IF octet_length(p::text) <> 32768 THEN RAISE EXCEPTION 'invalid test fixture size'; END IF;
 PERFORM public.save_property_draft('bbbbbbbb-0000-0000-0000-000000000006',p);
 p := jsonb_set(p,'{property,title}',to_jsonb((p->'property'->>'title') || 'x'));
 BEGIN
  PERFORM public.save_property_draft('bbbbbbbb-0000-0000-0000-000000000007',p);
  RAISE EXCEPTION 'oversized payload accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
DO $$ BEGIN
 PERFORM public.save_property_draft('bbbbbbbb-0000-0000-0000-000000000005','{"property":{},"unit":{},"amenities":["wifi"]}');
END $$;
DO $$ DECLARE bad jsonb; BEGIN
 FOR bad IN SELECT * FROM jsonb_array_elements('[{"property":{},"unit":{},"extra":1},{"property":{"bogus":1},"unit":{}},{"property":{},"unit":{"bogus":1}},{"property":{"title":{}},"unit":{}},{"property":{},"unit":{},"amenities":["invalid"]},{"property":{}},{"unit":{}}]'::jsonb) LOOP
  BEGIN
   PERFORM public.save_property_draft('bbbbbbbb-0000-4000-8000-000000000009', bad);
   RAISE EXCEPTION 'invalid create payload accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
   PERFORM public.update_property_draft('bbbbbbbb-0000-4000-8000-000000000010', 'bbbbbbbb-0000-4000-8000-000000000011', 1, bad);
   RAISE EXCEPTION 'invalid update payload accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 END LOOP;
END $$;
DO $$ DECLARE a uuid; b uuid; rev bigint; BEGIN
 a:=public.save_property_draft('bbbbbbbb-0000-0000-0000-000000000001','{"property":{"title":"First"},"unit":{"monthly_rent":5000}}');
 INSERT INTO fixture_ids VALUES (a);
 b:=public.save_property_draft('bbbbbbbb-0000-0000-0000-000000000001','{"unit":{"monthly_rent":5000},"property":{"title":"First"}}');
 IF a IS NULL OR a <> b THEN RAISE EXCEPTION 'identical retries must return same draft'; END IF;
 BEGIN
  PERFORM public.save_property_draft('bbbbbbbb-0000-0000-0000-000000000001','{"property":{"title":"Changed"},"unit":{"monthly_rent":5000}}');
  RAISE EXCEPTION 'changed payload must conflict';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 rev:=public.update_property_draft(a,'cccccccc-0000-0000-0000-000000000001',1,'{"property":{"title":"Second"},"unit":{}}');
 IF rev <> 2 OR public.update_property_draft(a,'cccccccc-0000-0000-0000-000000000001',1,'{"property":{"title":"Second"},"unit":{}}') <> 2 THEN RAISE EXCEPTION 'update retry must return prior revision'; END IF;
 BEGIN
  PERFORM public.update_property_draft(a,'cccccccc-0000-0000-0000-000000000001',1,'{"property":{"title":"Other"},"unit":{}}');
  RAISE EXCEPTION 'operation reuse accepted different content';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
  PERFORM public.update_property_draft(a,'cccccccc-0000-0000-0000-000000000002',1,'{"property":{"title":"Stale"},"unit":{}}');
  RAISE EXCEPTION 'stale revision accepted';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
 IF a IS DISTINCT FROM public.save_property_draft('bbbbbbbb-0000-0000-0000-000000000001','{"property":{"title":"First"},"unit":{"monthly_rent":5000}}') THEN RAISE EXCEPTION 'original create retry failed after update'; END IF;
 IF (SELECT payload->'property'->>'title' FROM public.property_drafts WHERE id=a) <> 'Second' THEN RAISE EXCEPTION 'stale update changed draft'; END IF;
 IF (SELECT count(*) FROM public.property_drafts) <> 3 THEN RAISE EXCEPTION 'must retain the three distinct owner drafts'; END IF;
END $$;
-- Caps must preserve exact replay, even after the owner reaches the limit.
DO $$ DECLARE i integer; id uuid; op uuid; rev bigint; BEGIN
 FOR i IN 1..47 LOOP
  op := ('dddddddd-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
  id := public.save_property_draft(op, '{"property":{},"unit":{}}');
 END LOOP;
 IF id IS DISTINCT FROM public.save_property_draft(op, '{"property":{},"unit":{}}') THEN RAISE EXCEPTION 'replay at cap failed'; END IF;
 BEGIN
  PERFORM public.save_property_draft('eeeeeeee-0000-4000-8000-000000000001', '{"property":{},"unit":{}}');
  RAISE EXCEPTION 'draft cap not enforced';
 EXCEPTION WHEN program_limit_exceeded THEN NULL; END;
 FOR i IN 1..999 LOOP
  op := ('ffffffff-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
  rev := public.update_property_draft(id, op, i, '{"property":{},"unit":{}}');
 END LOOP;
 IF public.update_property_draft(id, op, 999, '{"property":{},"unit":{}}') <> rev THEN RAISE EXCEPTION 'update replay at cap failed'; END IF;
 BEGIN
  PERFORM public.update_property_draft(id, 'eeeeeeee-0000-4000-8000-000000000002', 1001, '{"property":{},"unit":{}}');
  RAISE EXCEPTION 'update history cap not enforced';
 EXCEPTION WHEN program_limit_exceeded THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000002',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.property_drafts) <> 0 THEN RAISE EXCEPTION 'other owners cannot read drafts'; END IF;
 BEGIN
  PERFORM public.update_property_draft((SELECT draft_id FROM fixture_ids),'cccccccc-0000-0000-0000-000000000010',1,'{"property":{},"unit":{}}');
  RAISE EXCEPTION 'other owner update accepted';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000003',true);
DO $$ BEGIN
 BEGIN
  PERFORM public.save_property_draft('bbbbbbbb-0000-0000-0000-000000000003','{"property":{},"unit":{}}');
  RAISE EXCEPTION 'renter accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-0000-0000-000000000004',true);
DO $$ BEGIN
 BEGIN
  PERFORM public.save_property_draft('bbbbbbbb-0000-0000-0000-000000000004','{"property":{},"unit":{}}');
  RAISE EXCEPTION 'suspended landlord accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
