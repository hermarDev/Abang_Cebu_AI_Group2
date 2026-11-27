\set ON_ERROR_STOP on
BEGIN;

INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('a2100000-0000-4000-8000-000000000001', '{"role":"landlord","full_name":"Phase2 Landlord"}'),
 ('a2100000-0000-4000-8000-000000000002', '{"role":"verification_officer","full_name":"Phase2 Verifier"}'),
 ('a2100000-0000-4000-8000-000000000003', '{"role":"admin","full_name":"Phase2 Admin"}'),
 ('a2100000-0000-4000-8000-000000000004', '{"role":"renter","full_name":"Phase2 Renter"}');

UPDATE public.profiles SET role = 'landlord', is_suspended = false WHERE id = 'a2100000-0000-4000-8000-000000000001';
UPDATE public.profiles SET role = 'verification_officer', is_suspended = false WHERE id = 'a2100000-0000-4000-8000-000000000002';
UPDATE public.profiles SET role = 'admin', is_suspended = false WHERE id = 'a2100000-0000-4000-8000-000000000003';
UPDATE public.profiles SET role = 'renter', is_suspended = false WHERE id = 'a2100000-0000-4000-8000-000000000004';

-- 1. Test verifier_dashboard_overview() RBAC and counts
INSERT INTO public.properties(id, landlord_id, title, description, property_type, street_address, barangay, city, coordinates, status)
VALUES
  ('a2200000-0000-4000-8000-000000000001', 'a2100000-0000-4000-8000-000000000001', 'Pending Villa', 'Desc', 'apartment', '1 St', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9, 10.3), 4326), 'pending'),
  ('a2200000-0000-4000-8000-000000000002', 'a2100000-0000-4000-8000-000000000001', 'Verified Studio', 'Desc', 'condominium', '2 St', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9, 10.3), 4326), 'pending'),
  ('a2200000-0000-4000-8000-000000000003', 'a2100000-0000-4000-8000-000000000001', 'Flagged Room', 'Desc', 'boarding_house', '3 St', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9, 10.3), 4326), 'pending');

INSERT INTO public.property_drafts(id, owner_id, operation_id, payload, original_payload)
VALUES
  ('a2300000-0000-4000-8000-000000000001', 'a2100000-0000-4000-8000-000000000001', gen_random_uuid(), '{"property":{"title":"Pending Villa","barangay":"Apas","city":"Cebu City"},"unit":{}}', '{}'),
  ('a2300000-0000-4000-8000-000000000002', 'a2100000-0000-4000-8000-000000000001', gen_random_uuid(), '{"property":{"title":"Verified Studio","barangay":"Apas","city":"Cebu City"},"unit":{}}', '{}'),
  ('a2300000-0000-4000-8000-000000000003', 'a2100000-0000-4000-8000-000000000001', gen_random_uuid(), '{"property":{"title":"Flagged Room","barangay":"Apas","city":"Cebu City"},"unit":{}}', '{}');

INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media, review_status, field_verification_status, superseded_by)
VALUES
  ('a2100000-0000-4000-8000-000000000001', gen_random_uuid(), 'a2300000-0000-4000-8000-000000000001', 1, 'a2200000-0000-4000-8000-000000000001', '{"property":{"title":"Pending Villa","barangay":"Apas","city":"Cebu City"},"unit":{}}', '[]', 'pending', 'pending_verification', NULL),
  ('a2100000-0000-4000-8000-000000000001', gen_random_uuid(), 'a2300000-0000-4000-8000-000000000002', 1, 'a2200000-0000-4000-8000-000000000002', '{"property":{"title":"Verified Studio","barangay":"Apas","city":"Cebu City"},"unit":{}}', '[]', 'pending', 'verified', NULL),
  ('a2100000-0000-4000-8000-000000000001', gen_random_uuid(), 'a2300000-0000-4000-8000-000000000003', 1, 'a2200000-0000-4000-8000-000000000003', '{"property":{"title":"Flagged Room","barangay":"Apas","city":"Cebu City"},"unit":{}}', '[]', 'pending', 'flagged', NULL);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a2100000-0000-4000-8000-000000000004', true);

DO $$
BEGIN
  PERFORM public.verifier_dashboard_overview();
  RAISE EXCEPTION 'Expected 42501 for renter';
EXCEPTION
  WHEN SQLSTATE '42501' THEN NULL;
END $$;

SELECT set_config('request.jwt.claim.sub', 'a2100000-0000-4000-8000-000000000002', true);

DO $$
DECLARE v_overview jsonb;
BEGIN
  v_overview := public.verifier_dashboard_overview();
  IF (v_overview->>'pendingCount')::int < 1
     OR (v_overview->>'verifiedCount')::int < 1
     OR (v_overview->>'flaggedCount')::int < 1
     OR jsonb_array_length(v_overview->'latestPending') < 1 THEN
    RAISE EXCEPTION 'verifier_dashboard_overview missing expected counts: %', v_overview;
  END IF;
END $$;

-- 2. Test admin_list_support_tickets and admin_update_support_ticket with escalated & awaiting_landlord
RESET ROLE;
INSERT INTO public.support_tickets(id, operation_id, ticket_number, user_id, requester_name, requester_email, requester_role, category, subject, description, status, priority)
VALUES
  ('a2400000-0000-4000-8000-000000000001', gen_random_uuid(), 'SUP-99001', 'a2100000-0000-4000-8000-000000000004', 'Phase2 Renter', 'renter@example.test', 'renter', 'messaging_safety', 'Escalated ticket test', 'Detailed complaint description over twenty chars.', 'escalated', 'high'),
  ('a2400000-0000-4000-8000-000000000002', gen_random_uuid(), 'SUP-99002', 'a2100000-0000-4000-8000-000000000004', 'Phase2 Renter', 'renter@example.test', 'renter', 'messaging_safety', 'Awaiting landlord test', 'Detailed complaint description over twenty chars.', 'awaiting_landlord', 'normal');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a2100000-0000-4000-8000-000000000003', true);

DO $$
DECLARE v_res jsonb;
BEGIN
  v_res := public.admin_list_support_tickets('escalated', NULL, NULL, 50, 0, NULL);
  IF (v_res->>'total')::int < 1 THEN
    RAISE EXCEPTION 'admin_list_support_tickets failed for escalated: %', v_res;
  END IF;

  v_res := public.admin_list_support_tickets('awaiting_landlord', NULL, NULL, 50, 0, NULL);
  IF (v_res->>'total')::int < 1 THEN
    RAISE EXCEPTION 'admin_list_support_tickets failed for awaiting_landlord: %', v_res;
  END IF;

  v_res := public.admin_update_support_ticket(
    'a2400000-0000-4000-8000-000000000002'::uuid,
    gen_random_uuid(),
    'escalated',
    'urgent',
    'Escalated by admin check',
    'Escalation test',
    NULL,
    false
  );
  IF v_res->>'status' <> 'escalated' THEN
    RAISE EXCEPTION 'admin_update_support_ticket failed for escalated: %', v_res;
  END IF;
END $$;

-- 3. Test 50-conversation limit trigger on assistant_conversations
RESET ROLE;
INSERT INTO public.assistant_conversations(user_id, title, messages)
SELECT 'a2100000-0000-4000-8000-000000000004', 'Chat ' || i, '[{"role":"user","content":"hi"},{"role":"assistant","content":"hello"}]'::jsonb
FROM generate_series(1, 50) AS i;

DO $$
BEGIN
  INSERT INTO public.assistant_conversations(user_id, title, messages)
  VALUES ('a2100000-0000-4000-8000-000000000004', 'Chat 51', '[{"role":"user","content":"hi"},{"role":"assistant","content":"hello"}]'::jsonb);
  RAISE EXCEPTION 'Expected 54000 when inserting 51st assistant_conversation';
EXCEPTION
  WHEN SQLSTATE '54000' THEN NULL;
END $$;

ROLLBACK;
