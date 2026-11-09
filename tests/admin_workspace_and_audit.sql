\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('a3000000-0000-4000-8000-000000000001', '{"role":"admin","full_name":"Admin One"}'),
 ('a3000000-0000-4000-8000-000000000002', '{"role":"admin","full_name":"Admin Suspended"}'),
 ('a3000000-0000-4000-8000-000000000003', '{"role":"landlord","full_name":"Landlord Three"}'),
 ('a3000000-0000-4000-8000-000000000004', '{"role":"renter","full_name":"Renter Four"}'),
 ('a3000000-0000-4000-8000-000000000005', '{"role":"admin","full_name":"Admin Other"}'),
 ('a3000000-0000-4000-8000-000000000006', '{"role":"landlord","full_name":"Landlord Six"}');
UPDATE public.profiles SET role = 'admin' WHERE id IN ('a3000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000005');
UPDATE public.profiles SET is_suspended = true WHERE id = 'a3000000-0000-4000-8000-000000000002';
UPDATE public.profiles SET role = 'landlord' WHERE id = 'a3000000-0000-4000-8000-000000000003';
UPDATE public.profiles SET role = 'renter' WHERE id = 'a3000000-0000-4000-8000-000000000004';
UPDATE public.profiles SET role = 'landlord' WHERE id = 'a3000000-0000-4000-8000-000000000006';

INSERT INTO public.property_drafts(id, owner_id, operation_id, payload, original_payload) VALUES
 ('d3000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000003', 'd3000000-0000-4000-8000-0000000000a1', '{"property":{},"unit":{}}', '{"property":{},"unit":{}}'),
 ('d3000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000003', 'd3000000-0000-4000-8000-0000000000a2', '{"property":{},"unit":{}}', '{"property":{},"unit":{}}');
INSERT INTO public.properties(id, landlord_id, title, description, property_type, street_address, barangay, city, coordinates, status) VALUES
 ('b3000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000003', 'Pending A', 'Description', 'house', 'Street', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326), 'pending'),
 ('b3000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000003', 'Pending B', 'Description', 'house', 'Street', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326), 'pending'),
 ('b3000000-0000-4000-8000-000000000003', 'a3000000-0000-4000-8000-000000000003', 'Approved C', 'Description', 'house', 'Street', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326), 'approved'),
 ('b3000000-0000-4000-8000-000000000004', 'a3000000-0000-4000-8000-000000000003', 'Approved D', 'Description', 'house', 'Street', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326), 'approved');
INSERT INTO public.rental_units(property_id, rental_type, monthly_rent)
SELECT id, 'private_room', 5000 FROM public.properties WHERE id::text LIKE 'b3000000-0000-4000-8000-0000000000%';
INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media) VALUES
 ('a3000000-0000-4000-8000-000000000003', 'e3000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000001', 1, 'b3000000-0000-4000-8000-000000000001', '{"property":{},"unit":{}}',
  '[{"kind":"photo","object_path":"p/1.jpg"},{"kind":"permit","object_path":"p/permit.pdf"}]'),
 ('a3000000-0000-4000-8000-000000000003', 'e3000000-0000-4000-8000-000000000002', 'd3000000-0000-4000-8000-000000000002', 1, 'b3000000-0000-4000-8000-000000000002', '{"property":{},"unit":{}}', '[]');

-- Landlord Six: E has a superseded revision 1 and a live revision 2; F is a plain pending property.
INSERT INTO public.property_drafts(id, owner_id, operation_id, payload, original_payload, revision) VALUES
 ('d3000000-0000-4000-8000-000000000003', 'a3000000-0000-4000-8000-000000000006', 'd3000000-0000-4000-8000-0000000000a3', '{"property":{},"unit":{}}', '{"property":{},"unit":{}}', 2),
 ('d3000000-0000-4000-8000-000000000004', 'a3000000-0000-4000-8000-000000000006', 'd3000000-0000-4000-8000-0000000000a4', '{"property":{},"unit":{}}', '{"property":{},"unit":{}}', 1);
INSERT INTO public.properties(id, landlord_id, title, description, property_type, street_address, barangay, city, coordinates, status)
SELECT ('b3000000-0000-4000-8000-00000000000' || n)::uuid, 'a3000000-0000-4000-8000-000000000006', 'Pending ' || n, 'Description', 'house', 'Street', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326), 'pending'
FROM unnest(ARRAY[5,6]) n;
INSERT INTO public.rental_units(property_id, rental_type, monthly_rent) VALUES
 ('b3000000-0000-4000-8000-000000000005', 'private_room', 5000), ('b3000000-0000-4000-8000-000000000006', 'private_room', 5000);
INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media, superseded_by) VALUES
 ('a3000000-0000-4000-8000-000000000006', 'e3000000-0000-4000-8000-000000000003', 'd3000000-0000-4000-8000-000000000003', 1, 'b3000000-0000-4000-8000-000000000005', '{"property":{},"unit":{}}', '[]', 'e3000000-0000-4000-8000-000000000004'),
 ('a3000000-0000-4000-8000-000000000006', 'e3000000-0000-4000-8000-000000000004', 'd3000000-0000-4000-8000-000000000003', 2, 'b3000000-0000-4000-8000-000000000005', '{"property":{},"unit":{}}', '[]', NULL),
 ('a3000000-0000-4000-8000-000000000006', 'e3000000-0000-4000-8000-000000000005', 'd3000000-0000-4000-8000-000000000004', 1, 'b3000000-0000-4000-8000-000000000006', '{"property":{},"unit":{}}', '[]', NULL);

SET LOCAL ROLE authenticated;

-- 1. Non-admin and suspended admin are rejected by every admin RPC.
DO $$
DECLARE u text; stmt text; fn text;
BEGIN
  FOREACH u IN ARRAY ARRAY['a3000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000004'] LOOP
    PERFORM set_config('request.jwt.claim.sub', u, true);
    FOREACH stmt IN ARRAY ARRAY[
      'SELECT public.admin_dashboard_overview()',
      'SELECT public.admin_list_properties()',
      'SELECT public.admin_list_accounts()',
      'SELECT public.admin_list_audit_logs()',
      $q$SELECT public.admin_set_property_lifecycle('b3000000-0000-4000-8000-000000000003', gen_random_uuid(), 'unpublish', 'Fraudulent permit photo')$q$,
      $q$SELECT public.admin_set_account_suspension('a3000000-0000-4000-8000-000000000003', gen_random_uuid(), true, 'Repeated scam reports', true)$q$,
      $q$SELECT public.review_property('b3000000-0000-4000-8000-000000000001', gen_random_uuid(), 'approved', NULL, 'd3000000-0000-4000-8000-000000000001', 1)$q$
    ] LOOP
      BEGIN
        EXECUTE stmt;
        RAISE EXCEPTION 'non-active-admin % allowed: %', u, stmt;
      EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    END LOOP;
  END LOOP;
  -- Anonymous (no uid) is rejected too.
  PERFORM set_config('request.jwt.claim.sub', '', true);
  BEGIN
    PERFORM public.admin_dashboard_overview();
    RAISE EXCEPTION 'anonymous overview allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- 2. review_property writes immutable audit rows; replay does not duplicate.
SELECT set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000001', true);
DO $$
DECLARE n int; r record;
BEGIN
  PERFORM public.review_property('b3000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000001', 'rejected', ' Fix permit ', 'd3000000-0000-4000-8000-000000000001', 1);
  PERFORM public.review_property('b3000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000001', 'rejected', ' Fix permit ', 'd3000000-0000-4000-8000-000000000001', 1);
  PERFORM public.review_property('b3000000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000002', 'approved', NULL, 'd3000000-0000-4000-8000-000000000002', 1);
  SELECT count(*) INTO n FROM public.admin_audit_logs WHERE operation_id IN ('c3000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000002');
  IF n <> 2 THEN RAISE EXCEPTION 'expected 2 audit rows, got %', n; END IF;
  SELECT * INTO r FROM public.admin_audit_logs WHERE operation_id = 'c3000000-0000-4000-8000-000000000001';
  IF r.action_type <> 'property_rejected' OR r.reason <> 'Fix permit' OR r.admin_id <> 'a3000000-0000-4000-8000-000000000001'
    OR r.previous_state->>'status' <> 'pending' OR r.new_state->>'status' <> 'rejected'
    OR r.new_state->>'draft_id' <> 'd3000000-0000-4000-8000-000000000001' OR (r.new_state->>'revision')::int <> 1 THEN
    RAISE EXCEPTION 'bad rejection audit row %', to_jsonb(r);
  END IF;
  SELECT * INTO r FROM public.admin_audit_logs WHERE operation_id = 'c3000000-0000-4000-8000-000000000002';
  IF r.action_type <> 'property_approved' OR r.reason <> 'Approved pending submission' THEN
    RAISE EXCEPTION 'bad approval audit row %', to_jsonb(r);
  END IF;
  -- Audit rows are append-only for authenticated callers.
  BEGIN
    UPDATE public.admin_audit_logs SET reason = 'tamper';
    RAISE EXCEPTION 'audit update allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.admin_audit_logs;
    RAISE EXCEPTION 'audit delete allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.admin_audit_logs(operation_id, admin_id, action_type, target_type, target_id, reason)
    VALUES (gen_random_uuid(), 'a3000000-0000-4000-8000-000000000001', 'property_approved', 'property', gen_random_uuid(), 'forged');
    RAISE EXCEPTION 'audit insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- 3. Unpublish / restore lifecycle.
DO $$
DECLARE op uuid := 'c3000000-0000-4000-8000-000000000003'; p uuid := 'b3000000-0000-4000-8000-000000000003';
        r jsonb; n int; a public.admin_audit_logs%ROWTYPE;
BEGIN
  SELECT count(*) INTO n FROM public.get_public_submitted_rentals() WHERE id = p;
  IF n <> 1 THEN RAISE EXCEPTION 'approved property should be public before unpublish'; END IF;
  r := public.admin_set_property_lifecycle(p, op, 'unpublish', 'Fraudulent permit photo');
  IF r <> jsonb_build_object('propertyId', p, 'status', 'archived') THEN RAISE EXCEPTION 'bad unpublish result %', r; END IF;
  IF public.admin_set_property_lifecycle(p, op, 'unpublish', 'Fraudulent permit photo') IS DISTINCT FROM r THEN RAISE EXCEPTION 'replay mismatch'; END IF;
  SELECT count(*) INTO n FROM public.admin_audit_logs WHERE operation_id = op;
  IF n <> 1 THEN RAISE EXCEPTION 'replay duplicated audit row'; END IF;
  SELECT count(*) INTO n FROM public.get_public_submitted_rentals() WHERE id = p;
  IF n <> 0 THEN RAISE EXCEPTION 'archived property still public'; END IF;
  SELECT * INTO a FROM public.admin_audit_logs WHERE operation_id = op;
  IF a.action_type <> 'property_unpublished' OR a.previous_state->>'status' <> 'approved' OR a.new_state->>'status' <> 'archived' THEN
    RAISE EXCEPTION 'bad unpublish audit row %', to_jsonb(a);
  END IF;
  BEGIN
    PERFORM public.admin_set_property_lifecycle(p, op, 'restore', 'Restoring same op');
    RAISE EXCEPTION 'op reuse accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    PERFORM public.admin_set_property_lifecycle(p, gen_random_uuid(), 'unpublish', 'Already archived');
    RAISE EXCEPTION 'double unpublish accepted';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  BEGIN
    PERFORM public.admin_set_property_lifecycle(p, gen_random_uuid(), 'restore', 'bad');
    RAISE EXCEPTION 'short reason accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  r := public.admin_set_property_lifecycle(p, 'c3000000-0000-4000-8000-000000000004', 'restore', 'Evidence verified');
  IF r->>'status' <> 'approved' THEN RAISE EXCEPTION 'restore failed %', r; END IF;
  SELECT count(*) INTO n FROM public.get_public_submitted_rentals() WHERE id = p;
  IF n <> 1 THEN RAISE EXCEPTION 'restored property not public'; END IF;
END $$;

-- 4. Account suspension.
DO $$
DECLARE l uuid := 'a3000000-0000-4000-8000-000000000003'; op uuid := 'c3000000-0000-4000-8000-000000000005';
        r jsonb; n int; o jsonb;
BEGIN
  BEGIN
    PERFORM public.admin_set_account_suspension('a3000000-0000-4000-8000-000000000001', gen_random_uuid(), true, 'Self suspend test', true);
    RAISE EXCEPTION 'self-suspension allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.admin_set_account_suspension('a3000000-0000-4000-8000-000000000005', gen_random_uuid(), true, 'Other admin test', true);
    RAISE EXCEPTION 'suspending another admin allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  r := public.admin_set_account_suspension(l, op, true, 'Repeated scam reports', true);
  -- B, C (restored) and D are approved; A was rejected.
  IF (r->>'isSuspended')::boolean IS NOT TRUE OR (r->>'unpublishedCount')::int <> 3 THEN RAISE EXCEPTION 'bad suspend result %', r; END IF;
  IF public.admin_set_account_suspension(l, op, true, 'Repeated scam reports', true) IS DISTINCT FROM r THEN RAISE EXCEPTION 'suspend replay mismatch'; END IF;
  BEGIN
    PERFORM public.admin_set_account_suspension(l, op, false, 'Reinstating same op', true);
    RAISE EXCEPTION 'op reuse accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000001', true);
  -- Base tables are RLS-filtered for the admin role; verify through the admin RPCs.
  SELECT jsonb_array_length(public.admin_list_properties('archived', 'Three', 100, 0)) INTO n;
  IF n <> 3 THEN RAISE EXCEPTION 'expected 3 archived, got %', n; END IF;
  IF (public.admin_list_accounts('landlord', true, 'Three', 10, 0)->0->>'isSuspended')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'landlord not suspended'; END IF;
  BEGIN
    PERFORM public.admin_set_property_lifecycle('b3000000-0000-4000-8000-000000000003', gen_random_uuid(), 'restore', 'Try restore suspended');
    RAISE EXCEPTION 'restore for suspended landlord accepted';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  -- Listing RPCs.
  o := public.admin_dashboard_overview();
  IF (o->>'suspendedAccountCount')::int < 2 OR (o->>'archivedListingCount')::int < 3 OR jsonb_array_length(o->'recentAuditEntries') < 1
    OR NOT (o ? 'openReportCount') OR NOT (o ? 'pendingReviewCount') THEN RAISE EXCEPTION 'bad overview %', o; END IF;
  o := public.admin_list_properties('archived', 'Approved C', 10, 0);
  IF jsonb_array_length(o) <> 1 OR o->0->>'landlordName' <> 'Landlord Three' OR (o->0->>'landlordSuspended')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'bad property list %', o; END IF;
  o := public.admin_list_properties('rejected', NULL, 10, 0);
  IF o->0->'photoPaths' <> '["p/1.jpg"]'::jsonb OR o->0->'permitPaths' <> '["p/permit.pdf"]'::jsonb
    OR o->0->>'submissionDraftId' <> 'd3000000-0000-4000-8000-000000000001' OR (o->0->>'submissionExpectedRevision')::int <> 1 THEN
    RAISE EXCEPTION 'bad media/submission in property list %', o;
  END IF;
  o := public.admin_list_accounts('landlord', true, 'Three', 10, 0);
  IF jsonb_array_length(o) <> 1 OR (o->0->>'propertyCount')::int <> 4 OR (o->0->>'livePropertyCount')::int <> 0 THEN RAISE EXCEPTION 'bad account list %', o; END IF;
  o := public.admin_list_audit_logs('account', 10, 0);
  IF jsonb_array_length(o) <> 1 OR o->0->>'adminName' <> 'Admin One' OR o->0->>'actionType' <> 'account_suspended' THEN RAISE EXCEPTION 'bad audit list %', o; END IF;
  r := public.admin_set_account_suspension(l, 'c3000000-0000-4000-8000-000000000006', false, 'Appeal accepted', false);
  IF (r->>'isSuspended')::boolean IS NOT FALSE OR (r->>'unpublishedCount')::int <> 0 THEN RAISE EXCEPTION 'bad reinstate %', r; END IF;
  r := public.admin_set_property_lifecycle('b3000000-0000-4000-8000-000000000003', 'c3000000-0000-4000-8000-000000000007', 'restore', 'Reinstated landlord');
  IF r->>'status' <> 'approved' THEN RAISE EXCEPTION 'restore after reinstate failed %', r; END IF;
END $$;

-- 5. Stale revision, cross-action operation-id collision and same-operation replay.
SELECT set_config('request.jwt.claim.sub', 'a3000000-0000-4000-8000-000000000001', true);
DO $$
DECLARE
  e uuid := 'b3000000-0000-4000-8000-000000000005'; f uuid := 'b3000000-0000-4000-8000-000000000006';
  d uuid := 'd3000000-0000-4000-8000-000000000003'; n int; st text; r jsonb;
BEGIN
  -- Superseded revision 1 can never be approved/rejected; nothing changes.
  BEGIN
    PERFORM public.review_property(e, 'c3000000-0000-4000-8000-000000000010', 'approved', NULL, d, 1);
    RAISE EXCEPTION 'stale revision 1 approved';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  SELECT count(*) INTO n FROM public.admin_audit_logs WHERE operation_id = 'c3000000-0000-4000-8000-000000000010';
  SELECT jsonb_array_length(public.admin_list_properties('pending', 'Pending 5', 10, 0)) INTO st;
  IF n <> 0 OR st::int <> 1 THEN RAISE EXCEPTION 'stale review left side effects'; END IF;
  -- A revision that never existed is rejected the same way.
  BEGIN
    PERFORM public.review_property(e, gen_random_uuid(), 'approved', NULL, d, 3);
    RAISE EXCEPTION 'unknown revision approved';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  -- Live revision 2 is approved; replay returns the same result with one audit row.
  r := public.review_property(e, 'c3000000-0000-4000-8000-000000000011', 'approved', NULL, d, 2);
  IF r <> jsonb_build_object('status', 'approved')
    OR public.review_property(e, 'c3000000-0000-4000-8000-000000000011', 'approved', NULL, d, 2) <> r THEN RAISE EXCEPTION 'bad approve/replay %', r; END IF;
  BEGIN
    PERFORM public.review_property(e, 'c3000000-0000-4000-8000-000000000011', 'approved', NULL, d, 1);
    RAISE EXCEPTION 'replay with different revision accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  SELECT count(*) INTO n FROM public.admin_audit_logs WHERE operation_id = 'c3000000-0000-4000-8000-000000000011' AND (new_state->>'revision')::int = 2;
  IF n <> 1 THEN RAISE EXCEPTION 'expected exactly 1 audit row for replayed review, got %', n; END IF;

  -- Operation ids already used by a lifecycle change / account suspension cannot be reused by a review.
  FOR n IN 1..2 LOOP
    BEGIN
      PERFORM public.review_property(f, CASE n WHEN 1 THEN 'c3000000-0000-4000-8000-000000000003'::uuid ELSE 'c3000000-0000-4000-8000-000000000005'::uuid END,
        'approved', NULL, 'd3000000-0000-4000-8000-000000000004', 1);
      RAISE EXCEPTION 'review reused operation id from another action (%)', n;
    EXCEPTION WHEN unique_violation THEN NULL; END;
  END LOOP;
  -- ...and the rejected review left F untouched, with no extra audit row.
  IF jsonb_array_length(public.admin_list_properties('pending', 'Pending 6', 10, 0)) <> 1 THEN RAISE EXCEPTION 'collision changed property'; END IF;
  SELECT count(*) INTO n FROM public.admin_audit_logs WHERE target_id = f;
  IF n <> 0 THEN RAISE EXCEPTION 'collision wrote audit for F'; END IF;
  SELECT count(*) INTO n FROM public.admin_audit_logs WHERE operation_id IN ('c3000000-0000-4000-8000-000000000003', 'c3000000-0000-4000-8000-000000000005');
  IF n <> 2 THEN RAISE EXCEPTION 'original audit rows disturbed (%)', n; END IF;
  -- Reverse direction: a lifecycle change cannot reuse a review's operation id.
  BEGIN
    PERFORM public.admin_set_property_lifecycle(e, 'c3000000-0000-4000-8000-000000000011', 'unpublish', 'Reusing review op');
    RAISE EXCEPTION 'lifecycle reused review operation id';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
ROLLBACK;
