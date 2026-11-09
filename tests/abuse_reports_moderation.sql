\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('a7000000-0000-4000-8000-000000000001', '{"role":"renter","full_name":"Renter One"}'),
 ('a7000000-0000-4000-8000-000000000002', '{"role":"renter","full_name":"Renter Two"}'),
 ('a7000000-0000-4000-8000-000000000003', '{"role":"landlord","full_name":"Landlord Three"}'),
 ('a7000000-0000-4000-8000-000000000004', '{"role":"admin","full_name":"Admin Four"}'),
 ('a7000000-0000-4000-8000-000000000005', '{"role":"landlord","full_name":"Landlord Five"}');
UPDATE public.profiles SET role = 'admin' WHERE id = 'a7000000-0000-4000-8000-000000000004';
UPDATE public.profiles SET role = 'landlord' WHERE id IN ('a7000000-0000-4000-8000-000000000003', 'a7000000-0000-4000-8000-000000000005');
UPDATE public.profiles SET role = 'renter' WHERE id IN ('a7000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000002');

INSERT INTO public.properties(id, landlord_id, title, description, property_type, street_address, barangay, city, coordinates, status) VALUES
 ('b7000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000003', 'Approved A', 'Description', 'house', 'Street', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326), 'approved'),
 ('b7000000-0000-4000-8000-000000000002', 'a7000000-0000-4000-8000-000000000003', 'Approved B', 'Description', 'house', 'Street', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326), 'approved');
INSERT INTO public.rental_units(property_id, rental_type, monthly_rent)
SELECT id, 'private_room', 5000 FROM public.properties WHERE id::text LIKE 'b7000000-0000-4000-8000-0000000000%';

-- Fixture (as table owner): one conversation with 8 messages alternating sender, plus an unrelated conversation.
INSERT INTO public.rental_conversations(id, listing_source, listing_id, renter_id, landlord_id) VALUES
 ('c7000000-0000-4000-8000-000000000001', 'property', 'b7000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000003'),
 ('c7000000-0000-4000-8000-000000000002', 'property', 'b7000000-0000-4000-8000-000000000002', 'a7000000-0000-4000-8000-000000000002', 'a7000000-0000-4000-8000-000000000003');
INSERT INTO public.rental_messages(id, conversation_id, sender_id, operation_id, body, created_at)
SELECT ('d7000000-0000-4000-8000-00000000000' || n)::uuid, 'c7000000-0000-4000-8000-000000000001',
  CASE WHEN n % 2 = 1 THEN 'a7000000-0000-4000-8000-000000000001'::uuid ELSE 'a7000000-0000-4000-8000-000000000003'::uuid END,
  ('e7000000-0000-4000-8000-00000000000' || n)::uuid, 'Message ' || n, now() + (n || ' seconds')::interval
FROM generate_series(1, 8) n;

SET LOCAL ROLE authenticated;

-- 0. Table privileges: no direct writes; renters cannot read others' reports; admin cannot read rental_messages.
SELECT set_config('request.jwt.claim.sub', 'a7000000-0000-4000-8000-000000000001', true);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.abuse_reports(operation_id, reporter_id, target_type, category, details)
    VALUES (gen_random_uuid(), 'a7000000-0000-4000-8000-000000000001', 'account', 'spam', 'forged direct insert');
    RAISE EXCEPTION 'direct insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- 1. Participant reports a message: bounded snapshot captured, counterpart blocked in the same call.
DO $$
DECLARE
  op uuid := 'f7000000-0000-4000-8000-000000000001'; r jsonb; r2 jsonb; n int; snap jsonb;
BEGIN
  r := public.submit_abuse_report(op, 'message', 'c7000000-0000-4000-8000-000000000001', 'd7000000-0000-4000-8000-000000000004',
    NULL, 'harassment', '  Threatening messages about the deposit  ', true);
  IF (r->>'replayed')::boolean OR r->>'status' <> 'open' OR NOT (r->>'blocked')::boolean THEN RAISE EXCEPTION 'bad submit result %', r; END IF;
  SELECT evidence_snapshot INTO snap FROM public.abuse_reports WHERE id = (r->>'reportId')::uuid;
  -- reported message (4) + up to 3 before (1-3) + up to 2 after (5-6): 6 messages, never all 8.
  IF jsonb_array_length(snap->'messages') <> 6 THEN RAISE EXCEPTION 'snapshot should be bounded to 6 messages: %', snap; END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(snap->'messages') m WHERE m->>'id' = 'd7000000-0000-4000-8000-000000000004' AND (m->>'reported')::boolean) THEN
    RAISE EXCEPTION 'reported message missing from snapshot %', snap;
  END IF;
  IF snap->>'targetUserId' <> 'a7000000-0000-4000-8000-000000000003' OR snap->>'conversationId' <> 'c7000000-0000-4000-8000-000000000001' THEN
    RAISE EXCEPTION 'bad snapshot metadata %', snap;
  END IF;
  SELECT count(*) INTO n FROM public.user_blocks WHERE blocker_id = 'a7000000-0000-4000-8000-000000000001' AND blocked_id = 'a7000000-0000-4000-8000-000000000003';
  IF n <> 1 THEN RAISE EXCEPTION 'counterpart not blocked'; END IF;

  -- Replay returns the same report; reuse with a different category is a conflict.
  r2 := public.submit_abuse_report(op, 'message', 'c7000000-0000-4000-8000-000000000001', 'd7000000-0000-4000-8000-000000000004',
    NULL, 'harassment', 'Threatening messages about the deposit', true);
  IF NOT (r2->>'replayed')::boolean OR r2->>'reportId' <> r->>'reportId' THEN RAISE EXCEPTION 'bad replay %', r2; END IF;
  BEGIN
    PERFORM public.submit_abuse_report(op, 'message', 'c7000000-0000-4000-8000-000000000001', 'd7000000-0000-4000-8000-000000000004',
      NULL, 'spam', 'Threatening messages about the deposit', false);
    RAISE EXCEPTION 'operation id reuse accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- Reporter can read own report row; invalid input is rejected.
  SELECT count(*) INTO n FROM public.abuse_reports;
  IF n <> 1 THEN RAISE EXCEPTION 'reporter should see exactly own report, saw %', n; END IF;
  BEGIN
    PERFORM public.submit_abuse_report(gen_random_uuid(), 'message', 'c7000000-0000-4000-8000-000000000001', 'd7000000-0000-4000-8000-000000000004', NULL, 'harassment', 'short', false);
    RAISE EXCEPTION 'short details accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.submit_abuse_report(gen_random_uuid(), 'bogus', NULL, NULL, NULL, 'harassment', 'Long enough details', false);
    RAISE EXCEPTION 'bad target type accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;

-- 2. Non-participant cannot report an unrelated conversation (even with a valid message id of another thread).
DO $$
BEGIN
  BEGIN
    PERFORM public.submit_abuse_report(gen_random_uuid(), 'conversation', 'c7000000-0000-4000-8000-000000000002', NULL, NULL, 'spam', 'Not my conversation at all', false);
    RAISE EXCEPTION 'non-participant report accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.submit_abuse_report(gen_random_uuid(), 'message', 'c7000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-0000000000ff', NULL, 'spam', 'Message from nowhere here', false);
    RAISE EXCEPTION 'foreign message id accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;

-- 2b. Listing report: snapshot summary; own listing rejected; other reporter can report too.
SELECT set_config('request.jwt.claim.sub', 'a7000000-0000-4000-8000-000000000002', true);
DO $$
DECLARE r jsonb; snap jsonb;
BEGIN
  r := public.submit_abuse_report('f7000000-0000-4000-8000-000000000002', 'listing', NULL, NULL, 'b7000000-0000-4000-8000-000000000001', 'inaccurate_listing', 'Photos do not match the place', false);
  SELECT evidence_snapshot INTO snap FROM public.abuse_reports WHERE id = (r->>'reportId')::uuid;
  IF snap->'listing'->>'title' <> 'Approved A' OR snap->'listing'->>'status' <> 'approved' THEN RAISE EXCEPTION 'bad listing snapshot %', snap; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', 'a7000000-0000-4000-8000-000000000003', true);
DO $$
BEGIN
  BEGIN
    PERFORM public.submit_abuse_report(gen_random_uuid(), 'listing', NULL, NULL, 'b7000000-0000-4000-8000-000000000001', 'spam', 'Reporting my own listing', false);
    RAISE EXCEPTION 'own listing report accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- 3. Admin: no direct message access; list omits evidence; detail is audited; non-admins denied.
SELECT set_config('request.jwt.claim.sub', 'a7000000-0000-4000-8000-000000000004', true);
DO $$
DECLARE
  list jsonb; rid uuid; d jsonb; d2 jsonb; n int; op uuid := 'f7000000-0000-4000-8000-0000000000a1';
BEGIN
  SELECT count(*) INTO n FROM public.rental_messages;
  IF n <> 0 THEN RAISE EXCEPTION 'admin can read rental_messages directly (%)', n; END IF;
  list := public.admin_list_abuse_reports('open');
  IF jsonb_array_length(list) <> 2 THEN RAISE EXCEPTION 'expected 2 open reports %', list; END IF;
  IF list::text LIKE '%evidenceSnapshot%' OR list::text LIKE '%Message 4%' THEN RAISE EXCEPTION 'list leaks evidence'; END IF;
  SELECT (e->>'id')::uuid INTO rid FROM jsonb_array_elements(list) e WHERE e->>'targetType' = 'message';
  SELECT count(*) INTO n FROM public.admin_audit_logs WHERE action_type = 'report_evidence_viewed';
  IF n <> 0 THEN RAISE EXCEPTION 'list wrote audit rows'; END IF;

  d := public.admin_get_abuse_report_detail(rid, op);
  IF jsonb_array_length(d->'evidenceSnapshot'->'messages') <> 6 THEN RAISE EXCEPTION 'detail missing evidence %', d; END IF;
  d2 := public.admin_get_abuse_report_detail(rid, op);
  SELECT count(*) INTO n FROM public.admin_audit_logs WHERE action_type = 'report_evidence_viewed' AND target_id = rid AND target_type = 'report';
  IF n <> 1 THEN RAISE EXCEPTION 'same operation id should audit once, got %', n; END IF;
  PERFORM public.admin_get_abuse_report_detail(rid, gen_random_uuid());
  SELECT count(*) INTO n FROM public.admin_audit_logs WHERE action_type = 'report_evidence_viewed' AND target_id = rid;
  IF n <> 2 THEN RAISE EXCEPTION 'each fresh inspection must be audited, got %', n; END IF;
  BEGIN
    PERFORM public.admin_get_abuse_report_detail(gen_random_uuid(), op);
    RAISE EXCEPTION 'unknown report accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    UPDATE public.admin_audit_logs SET reason = 'tamper';
    RAISE EXCEPTION 'audit update allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

DO $$
DECLARE u text; stmt text;
BEGIN
  FOREACH u IN ARRAY ARRAY['a7000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000003'] LOOP
    PERFORM set_config('request.jwt.claim.sub', u, true);
    FOREACH stmt IN ARRAY ARRAY[
      'SELECT public.admin_list_abuse_reports()',
      'SELECT public.admin_get_abuse_report_detail(gen_random_uuid(), gen_random_uuid())',
      $q$SELECT public.admin_resolve_abuse_report(gen_random_uuid(), gen_random_uuid(), 'dismissed', 'Not enough evidence', false, false)$q$
    ] LOOP
      BEGIN
        EXECUTE stmt;
        RAISE EXCEPTION 'non-admin % allowed: %', u, stmt;
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    END LOOP;
  END LOOP;
END $$;

-- 4. Resolve with suspension + listing unpublish: atomic report/profile/property update + audit row; replay is idempotent.
SELECT set_config('request.jwt.claim.sub', 'a7000000-0000-4000-8000-000000000004', true);
DO $$
DECLARE
  rid uuid; lid uuid; r jsonb; r2 jsonb; n int; op uuid := 'f7000000-0000-4000-8000-0000000000b1'; a public.admin_audit_logs%ROWTYPE;
BEGIN
  SELECT (e->>'id')::uuid INTO rid FROM jsonb_array_elements(public.admin_list_abuse_reports('open')) e WHERE e->>'targetType' = 'message';
  BEGIN
    PERFORM public.admin_resolve_abuse_report(rid, gen_random_uuid(), 'resolved', 'no', false, false);
    RAISE EXCEPTION 'short note accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.admin_resolve_abuse_report(rid, gen_random_uuid(), 'maybe', 'Valid note here', false, false);
    RAISE EXCEPTION 'bad decision accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;

  r := public.admin_resolve_abuse_report(rid, op, 'resolved', '  Confirmed harassment  ', true, true);
  IF r <> jsonb_build_object('reportId', rid, 'status', 'resolved', 'userSuspended', true, 'listingUnpublished', true) THEN RAISE EXCEPTION 'bad resolve result %', r; END IF;
  r2 := public.admin_resolve_abuse_report(rid, op, 'resolved', 'Confirmed harassment', true, true);
  IF r2 IS DISTINCT FROM r THEN RAISE EXCEPTION 'replay mismatch %', r2; END IF;
  SELECT count(*) INTO n FROM public.admin_audit_logs WHERE operation_id = op;
  IF n <> 1 THEN RAISE EXCEPTION 'replay duplicated audit row'; END IF;
  SELECT * INTO a FROM public.admin_audit_logs WHERE operation_id = op;
  IF a.action_type <> 'report_resolved' OR a.target_type <> 'report' OR a.reason <> 'Confirmed harassment' OR a.previous_state->>'status' <> 'open' THEN
    RAISE EXCEPTION 'bad resolve audit row %', to_jsonb(a);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(public.admin_list_abuse_reports('resolved')) e WHERE e->>'id' = rid::text AND (e->>'targetUserSuspended')::boolean) THEN RAISE EXCEPTION 'landlord not suspended'; END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(public.admin_list_properties('archived', NULL, 50, 0)) e WHERE e->>'id' = 'b7000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'listing not archived'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.abuse_reports WHERE id = rid AND status = 'resolved' AND resolution_note = 'Confirmed harassment'
                 AND resolved_by = 'a7000000-0000-4000-8000-000000000004' AND resolved_at IS NOT NULL) THEN
    RAISE EXCEPTION 'report row not resolved';
  END IF;
  -- Operation id cannot be reused for another decision/report; closed report cannot be re-resolved.
  BEGIN
    PERFORM public.admin_resolve_abuse_report(rid, op, 'dismissed', 'Different decision', false, false);
    RAISE EXCEPTION 'op reuse with different decision accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    PERFORM public.admin_resolve_abuse_report(rid, gen_random_uuid(), 'dismissed', 'Already closed', false, false);
    RAISE EXCEPTION 'closed report re-resolved';
  EXCEPTION WHEN serialization_failure THEN NULL; END;

  -- Dismiss never applies enforcement flags.
  SELECT (e->>'id')::uuid INTO lid FROM jsonb_array_elements(public.admin_list_abuse_reports('open')) e WHERE e->>'targetType' = 'listing';
  r := public.admin_resolve_abuse_report(lid, gen_random_uuid(), 'dismissed', 'Listing looks accurate', true, true);
  IF (r->>'userSuspended')::boolean OR (r->>'listingUnpublished')::boolean OR r->>'status' <> 'dismissed' THEN RAISE EXCEPTION 'dismiss applied enforcement %', r; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.admin_audit_logs WHERE target_id = lid AND action_type = 'report_dismissed') THEN RAISE EXCEPTION 'dismiss not audited'; END IF;
END $$;
ROLLBACK;
