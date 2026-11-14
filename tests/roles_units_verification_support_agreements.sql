\set ON_ERROR_STOP on
BEGIN;

-- Setup test users
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('bb100000-0000-4000-8000-000000000001', '{"role":"renter","full_name":"Test Renter"}'),
 ('bb100000-0000-4000-8000-000000000002', '{"role":"landlord","full_name":"Test Landlord"}'),
 ('bb100000-0000-4000-8000-000000000003', '{"role":"admin","full_name":"Test Admin"}'),
 ('bb100000-0000-4000-8000-000000000004', '{"role":"verification_officer","full_name":"Test Verifier"}'),
 ('bb100000-0000-4000-8000-000000000005', '{"role":"customer_support","full_name":"Test Support"}')
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET role = 'admin' WHERE id = 'bb100000-0000-4000-8000-000000000003';
UPDATE public.profiles SET role = 'verification_officer' WHERE id = 'bb100000-0000-4000-8000-000000000004';
UPDATE public.profiles SET role = 'customer_support' WHERE id = 'bb100000-0000-4000-8000-000000000005';

-- ============================================================================
-- Test 1: Admin Staff Account Assignment
-- ============================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'bb100000-0000-4000-8000-000000000003', true);

SELECT public.admin_assign_staff_role(
  'bb100000-0000-4000-8000-000000000004', gen_random_uuid(), 'verification_officer', 'Assigned Verifier'
);

SELECT public.admin_assign_staff_role(
  'bb100000-0000-4000-8000-000000000005', gen_random_uuid(), 'customer_support', 'Assigned Support'
);

-- Non-admin cannot assign staff role
SELECT set_config('request.jwt.claim.sub', 'bb100000-0000-4000-8000-000000000002', true);
DO $$ BEGIN
  BEGIN
    PERFORM public.admin_assign_staff_role('bb100000-0000-4000-8000-000000000001', gen_random_uuid(), 'verification_officer');
    RAISE EXCEPTION 'non-admin was able to assign staff role';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- ============================================================================
-- Test 2: Field Verification & Approval Gate
-- ============================================================================
RESET ROLE;
INSERT INTO public.property_drafts(id, owner_id, operation_id, payload, original_payload)
VALUES ('dd100000-0000-4000-8000-000000000001', 'bb100000-0000-4000-8000-000000000002', gen_random_uuid(), '{"property":{},"unit":{}}', '{"property":{},"unit":{}}');

INSERT INTO public.properties(id, landlord_id, title, description, property_type, street_address, barangay, city, coordinates, status)
VALUES ('ee100000-0000-4000-8000-000000000001', 'bb100000-0000-4000-8000-000000000002', 'Boarding House One', 'Boarding house in Apas', 'boarding_house', 'Street 1', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9, 10.3), 4326), 'pending');

-- Multi-unit support: 2 units under this property
INSERT INTO public.rental_units(id, property_id, unit_number, rental_type, monthly_rent, max_occupants, is_available) VALUES
 ('11100000-0000-4000-8000-000000000001', 'ee100000-0000-4000-8000-000000000001', 'Room 1', 'private_room', 4500, 1, true),
 ('11100000-0000-4000-8000-000000000002', 'ee100000-0000-4000-8000-000000000001', 'Room 2', 'private_room', 5000, 2, true);

INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media, review_status)
VALUES (
  'bb100000-0000-4000-8000-000000000002',
  'ff100000-0000-4000-8000-000000000001',
  'dd100000-0000-4000-8000-000000000001',
  1,
  'ee100000-0000-4000-8000-000000000001',
  '{"property":{},"unit":{"rental_type":"private_room","monthly_rent":"4500"},"units":[{"unit_number":"Room 1","monthly_rent":"4500","max_occupants":"1","rental_type":"private_room"},{"unit_number":"Room 2","monthly_rent":"5000","max_occupants":"2","rental_type":"private_room"}]}'::jsonb,
  '[]',
  'pending'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'bb100000-0000-4000-8000-000000000003', true);

-- Admin approval blocked prior to field verification
DO $$ BEGIN
  BEGIN
    PERFORM public.review_property('ee100000-0000-4000-8000-000000000001', gen_random_uuid(), 'approved', NULL, 'dd100000-0000-4000-8000-000000000001', 1);
    RAISE EXCEPTION 'admin approval allowed without field verification';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;

-- Verifier listing queue
SELECT set_config('request.jwt.claim.sub', 'bb100000-0000-4000-8000-000000000004', true);
DO $$ DECLARE q jsonb; BEGIN
  q := public.verifier_list_queue('pending_verification', 'Boarding House', 10, 0);
  IF jsonb_array_length(q) < 1 THEN RAISE EXCEPTION 'queue did not return pending verification'; END IF;
END $$;

-- Verification requires proof when marking verified
DO $$ BEGIN
  BEGIN
    PERFORM public.verifier_submit_verification(
      'ee100000-0000-4000-8000-000000000001', gen_random_uuid(), 'dd100000-0000-4000-8000-000000000001', 1,
      'verified', 'site_visit', 'Verified premises in person', '[]'::jsonb
    );
    RAISE EXCEPTION 'empty proof accepted for verified status';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;

-- Proof must belong to property and exist in storage.objects
DO $$ BEGIN
  BEGIN
    PERFORM public.verifier_submit_verification(
      'ee100000-0000-4000-8000-000000000001', gen_random_uuid(), 'dd100000-0000-4000-8000-000000000001', 1,
      'verified', 'site_visit', 'Verified premises in person',
      '[{"kind":"photo","object_path":"bb100000-0000-4000-8000-000000000004/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"}]'::jsonb
    );
    RAISE EXCEPTION 'cross-property or missing proof accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;

RESET ROLE;
INSERT INTO storage.objects (bucket_id, name, owner, owner_id)
VALUES (
  'field-verification-media',
  'bb100000-0000-4000-8000-000000000004/ee100000-0000-4000-8000-000000000001/33333333-3333-4333-8333-333333333333/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg',
  'bb100000-0000-4000-8000-000000000004',
  'bb100000-0000-4000-8000-000000000004'
)
ON CONFLICT DO NOTHING;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'bb100000-0000-4000-8000-000000000004', true);

-- Valid verification with proof
SELECT public.verifier_submit_verification(
  'ee100000-0000-4000-8000-000000000001', 'aa100000-0000-4000-8000-000000000001',
  'dd100000-0000-4000-8000-000000000001', 1, 'verified', 'site_visit',
  'Verified premises in person and inspected perimeter fence',
  '[{"kind":"photo","object_path":"bb100000-0000-4000-8000-000000000004/ee100000-0000-4000-8000-000000000001/33333333-3333-4333-8333-333333333333/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"}]'::jsonb
);

-- Admin can now approve
SELECT set_config('request.jwt.claim.sub', 'bb100000-0000-4000-8000-000000000003', true);
SELECT public.review_property('ee100000-0000-4000-8000-000000000001', gen_random_uuid(), 'approved', NULL, 'dd100000-0000-4000-8000-000000000001', 1);

-- ============================================================================
-- Test 3: Customer Support Complaint Mediation
-- ============================================================================
RESET ROLE;
INSERT INTO public.support_tickets(id, operation_id, user_id, requester_name, requester_email, requester_role, category, subject, description, related_listing_id, reported_landlord_id, status, priority, attachments)
VALUES ('77100000-0000-4000-8000-000000000001', gen_random_uuid(), 'bb100000-0000-4000-8000-000000000001', 'Renter Requester', 'renter@test.local', 'renter', 'messaging_safety', 'Noise complaint', 'Loud tenant late at night', 'ee100000-0000-4000-8000-000000000001', 'bb100000-0000-4000-8000-000000000002', 'open', 'normal', '[]'::jsonb);

-- Landlord cannot select open ticket prior to awaiting_landlord status
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'bb100000-0000-4000-8000-000000000002', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.support_tickets WHERE id = '77100000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'reported landlord was able to read open ticket before awaiting_landlord';
  END IF;
END $$;

-- Support lists tickets
SELECT set_config('request.jwt.claim.sub', 'bb100000-0000-4000-8000-000000000005', true);
DO $$ DECLARE tickets jsonb; BEGIN
  tickets := public.support_desk_list_tickets('open');
  IF jsonb_array_length(tickets) < 1 THEN RAISE EXCEPTION 'support desk list tickets failed'; END IF;
END $$;

-- Support requests landlord response with idempotency check
DO $$ DECLARE
  v_op uuid := gen_random_uuid();
  r1 jsonb;
  r2 jsonb;
BEGIN
  r1 := public.support_desk_act_on_ticket(
    '77100000-0000-4000-8000-000000000001', v_op, 'request_landlord_response',
    'Please clarify house rules on noise curfews', 'bb100000-0000-4000-8000-000000000002'
  );
  r2 := public.support_desk_act_on_ticket(
    '77100000-0000-4000-8000-000000000001', v_op, 'request_landlord_response',
    'Please clarify house rules on noise curfews', 'bb100000-0000-4000-8000-000000000002'
  );
  IF (r2->>'replayed')::boolean IS NOT true THEN
    RAISE EXCEPTION 'support desk act on ticket replay failed: %', r2;
  END IF;
END $$;

-- Landlord can now see the awaiting_landlord ticket
SELECT set_config('request.jwt.claim.sub', 'bb100000-0000-4000-8000-000000000002', true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.support_tickets WHERE id = '77100000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'reported landlord cannot read awaiting_landlord ticket';
  END IF;
END $$;

-- Landlord responds with idempotency check
DO $$ DECLARE
  v_op uuid := gen_random_uuid();
  r1 jsonb;
  r2 jsonb;
BEGIN
  r1 := public.landlord_respond_to_support_ticket(
    '77100000-0000-4000-8000-000000000001', v_op, 'I have issued a verbal reminder to the occupants'
  );
  r2 := public.landlord_respond_to_support_ticket(
    '77100000-0000-4000-8000-000000000001', v_op, 'I have issued a verbal reminder to the occupants'
  );
  IF (r2->>'replayed')::boolean IS NOT true THEN
    RAISE EXCEPTION 'landlord respond replay failed: %', r2;
  END IF;
END $$;

-- Second new response fails because status is now in_progress
DO $$ BEGIN
  BEGIN
    PERFORM public.landlord_respond_to_support_ticket(
      '77100000-0000-4000-8000-000000000001', gen_random_uuid(), 'Another reply'
    );
    RAISE EXCEPTION 'landlord was able to respond to ticket not awaiting landlord';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;

-- Support marks resolved
SELECT set_config('request.jwt.claim.sub', 'bb100000-0000-4000-8000-000000000005', true);
SELECT public.support_desk_act_on_ticket(
  '77100000-0000-4000-8000-000000000001', gen_random_uuid(), 'resolve', 'Complaint settled through landlord intervention'
);

-- Trying to request landlord response on resolved ticket fails transition guard
DO $$ BEGIN
  BEGIN
    PERFORM public.support_desk_act_on_ticket(
      '77100000-0000-4000-8000-000000000001', gen_random_uuid(), 'request_landlord_response',
      'Try reopening illegally', 'bb100000-0000-4000-8000-000000000002'
    );
    RAISE EXCEPTION 'support desk was able to transition resolved ticket to awaiting_landlord';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;

-- ============================================================================
-- Test 4: Dual-Button Mutual Rental Agreement
-- ============================================================================
RESET ROLE;
INSERT INTO public.rental_conversations(id, listing_source, listing_id, renter_id, landlord_id)
VALUES ('cc100000-0000-4000-8000-000000000001', 'property', 'ee100000-0000-4000-8000-000000000001', 'bb100000-0000-4000-8000-000000000001', 'bb100000-0000-4000-8000-000000000002');

SET LOCAL ROLE authenticated;
-- Renter clicks "I Agree to Rent Room 1"
SELECT set_config('request.jwt.claim.sub', 'bb100000-0000-4000-8000-000000000001', true);
DO $$ DECLARE res jsonb; BEGIN
  res := public.set_rental_agreement_consent('cc100000-0000-4000-8000-000000000001', gen_random_uuid(), true, '11100000-0000-4000-8000-000000000001');
  IF (res->>'status') <> 'renter_agreed' OR (res->>'renterAgreed')::boolean IS NOT true THEN
    RAISE EXCEPTION 'renter consent failed: %', res;
  END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT is_available FROM public.rental_units WHERE id = '11100000-0000-4000-8000-000000000001') IS NOT true THEN
    RAISE EXCEPTION 'unit became unavailable before landlord agreed';
  END IF;
END $$;

-- Landlord clicks "I Agree to Rent Room 1"
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'bb100000-0000-4000-8000-000000000002', true);
DO $$ DECLARE res jsonb; BEGIN
  res := public.set_rental_agreement_consent('cc100000-0000-4000-8000-000000000001', gen_random_uuid(), true, '11100000-0000-4000-8000-000000000001');
  IF (res->>'status') <> 'agreed' OR (res->>'bothAgreed')::boolean IS NOT true THEN
    RAISE EXCEPTION 'mutual agreement transition failed: %', res;
  END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT is_available FROM public.rental_units WHERE id = '11100000-0000-4000-8000-000000000001') IS NOT false THEN
    RAISE EXCEPTION 'unit was not marked occupied after dual agreement';
  END IF;
END $$;

-- ============================================================================
-- Test 5: Public Map Multi-Unit Visibility
-- ============================================================================
SET LOCAL ROLE anon;
DO $$ DECLARE r record; BEGIN
  -- Room 1 is occupied, Room 2 is available: 1 of 2 available. Property is returned.
  SELECT * INTO STRICT r FROM public.get_public_submitted_rentals() WHERE id = 'ee100000-0000-4000-8000-000000000001';
  IF r.available_units_count <> 1 OR r.total_units_count <> 2 THEN
    RAISE EXCEPTION 'unexpected unit counts: avail=%, total=%', r.available_units_count, r.total_units_count;
  END IF;
END $$;

-- Landlord marks Room 2 occupied as well: 0 of 2 available
RESET ROLE;
UPDATE public.rental_units SET is_available = false WHERE id = '11100000-0000-4000-8000-000000000002';

SET LOCAL ROLE anon;
DO $$ BEGIN
  -- 0 units available: property automatically hidden from public map
  IF EXISTS (SELECT 1 FROM public.get_public_submitted_rentals() WHERE id = 'ee100000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'property with 0 available units leaked to public map';
  END IF;
END $$;

-- ============================================================================
-- Test 6: CodeRabbit Remediation Assertions (Replay, Cascade, Cursor, Unit Retirement)
-- ============================================================================
-- 6a. admin_assign_staff_role replay safety & conflict
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'bb100000-0000-4000-8000-000000000003', true);
DO $$ DECLARE
  v_op uuid := gen_random_uuid();
  r1 jsonb;
  r2 jsonb;
BEGIN
  r1 := public.admin_assign_staff_role('bb100000-0000-4000-8000-000000000004', v_op, 'verification_officer', 'Assigned Verifier');
  r2 := public.admin_assign_staff_role('bb100000-0000-4000-8000-000000000004', v_op, 'verification_officer', 'Assigned Verifier');
  IF (r2->>'replayed')::boolean IS NOT true THEN
    RAISE EXCEPTION 'admin_assign_staff_role replay failed: %', r2;
  END IF;
  BEGIN
    PERFORM public.admin_assign_staff_role('bb100000-0000-4000-8000-000000000004', v_op, 'customer_support', 'Assigned Verifier');
    RAISE EXCEPTION 'admin_assign_staff_role allowed conflicting replay';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;

-- 6b. admin_staff_creation_ops cascades on auth.users deletion
RESET ROLE;
INSERT INTO auth.users(id, raw_user_meta_data)
VALUES ('bb100000-0000-4000-8000-000000000099', '{"role":"customer_support","full_name":"Temp Staff"}')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.admin_staff_creation_ops(operation_id, user_id, role, full_name, email)
VALUES (gen_random_uuid(), 'bb100000-0000-4000-8000-000000000099', 'customer_support', 'Temp Staff', 'temp@test.local');
DELETE FROM auth.users WHERE id = 'bb100000-0000-4000-8000-000000000099';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_staff_creation_ops WHERE user_id = 'bb100000-0000-4000-8000-000000000099') THEN
    RAISE EXCEPTION 'admin_staff_creation_ops row remained after auth.users delete';
  END IF;
END $$;

-- 6c. support_desk_list_tickets keyset cursor stability
RESET ROLE;
INSERT INTO public.support_tickets(id, operation_id, user_id, requester_name, requester_email, requester_role, category, subject, description, status, priority, attachments, created_at)
VALUES
  ('77100000-0000-4000-8000-000000000011', gen_random_uuid(), 'bb100000-0000-4000-8000-000000000001', 'R1', 'r1@test.local', 'renter', 'other', 'Cursor A', 'Cursor pagination test ticket description A', 'open', 'normal', '[]'::jsonb, '2026-11-14T10:00:00Z'),
  ('77100000-0000-4000-8000-000000000012', gen_random_uuid(), 'bb100000-0000-4000-8000-000000000001', 'R2', 'r2@test.local', 'renter', 'other', 'Cursor B', 'Cursor pagination test ticket description B', 'open', 'normal', '[]'::jsonb, '2026-11-14T09:00:00Z');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'bb100000-0000-4000-8000-000000000005', true);
DO $$ DECLARE
  page1 jsonb;
  page2 jsonb;
BEGIN
  page1 := public.support_desk_list_tickets('open', NULL, 'Cursor', 1, 0, NULL, NULL, NULL);
  IF jsonb_array_length(page1) <> 1 OR (page1->0->>'id') <> '77100000-0000-4000-8000-000000000011' THEN
    RAISE EXCEPTION 'cursor page1 mismatch: %', page1;
  END IF;
  page2 := public.support_desk_list_tickets('open', NULL, 'Cursor', 1, 0, NULL, (page1->0->>'createdAt')::timestamptz, (page1->0->>'id')::uuid);
  IF jsonb_array_length(page2) <> 1 OR (page2->0->>'id') <> '77100000-0000-4000-8000-000000000012' THEN
    RAISE EXCEPTION 'cursor page2 mismatch: %', page2;
  END IF;
END $$;

-- 6d. review_property multi-unit retirement preserves rental_agreements & applies shared specs
RESET ROLE;
INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media, review_status, field_verification_status)
VALUES (
  'bb100000-0000-4000-8000-000000000002',
  'ff100000-0000-4000-8000-000000000002',
  'dd100000-0000-4000-8000-000000000001',
  2,
  'ee100000-0000-4000-8000-000000000001',
  '{
    "property":{"title":"Boarding House One Revised","description":"Updated boarding house description in Apas","property_type":"boarding_house"},
    "unit":{"rental_type":"private_room","monthly_rent":"5500","floor_area_sqm":"22.5","bedrooms":"2","bathrooms":"1.5","furnished_status":"semi_furnished"},
    "units":[{"unit_number":"Room 2","monthly_rent":"5500","max_occupants":"2","rental_type":"private_room"}]
  }'::jsonb,
  '[]'::jsonb,
  'pending',
  'verified'
);
UPDATE public.property_submissions
  SET superseded_by = 'ff100000-0000-4000-8000-000000000002'
  WHERE owner_id = 'bb100000-0000-4000-8000-000000000002'
    AND operation_id = 'ff100000-0000-4000-8000-000000000001';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'bb100000-0000-4000-8000-000000000003', true);
SELECT public.review_property('ee100000-0000-4000-8000-000000000001', gen_random_uuid(), 'approved', NULL, 'dd100000-0000-4000-8000-000000000001', 2);

RESET ROLE;
DO $$ BEGIN
  -- Room 1 (omitted from revision) must be retired, not deleted, so its rental_agreement remains intact
  IF NOT EXISTS (SELECT 1 FROM public.rental_units WHERE id = '11100000-0000-4000-8000-000000000001' AND is_retired = true AND is_available = false) THEN
    RAISE EXCEPTION 'omitted unit Room 1 was not retired cleanly';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rental_agreements WHERE unit_id = '11100000-0000-4000-8000-000000000001' AND status = 'agreed') THEN
    RAISE EXCEPTION 'rental agreement on retired Room 1 was lost';
  END IF;
  -- Room 2 must receive updated shared specs
  IF NOT EXISTS (SELECT 1 FROM public.rental_units WHERE id = '11100000-0000-4000-8000-000000000002' AND is_retired = false AND floor_area_sqm = 22.5 AND bedrooms = 2 AND bathrooms = 1.5 AND furnished_status = 'semi_furnished') THEN
    RAISE EXCEPTION 'shared specs were not applied to Room 2 on multi-unit approval';
  END IF;
END $$;

-- ============================================================================
-- Test 7: CodeRabbit Round 2 Assertions (Conversation Detail Units/Agreement, Version Serialization, Staff Requester Role)
-- ============================================================================
-- 7a. support_tickets accepts verification_officer and customer_support requester roles
RESET ROLE;
INSERT INTO public.support_tickets(id, operation_id, user_id, requester_name, requester_email, requester_role, category, subject, description, status, priority, attachments)
VALUES
  ('77100000-0000-4000-8000-000000000021', gen_random_uuid(), 'bb100000-0000-4000-8000-000000000004', 'Verifier', 'v@test.local', 'verification_officer', 'other', 'Verifier Ticket', 'Staff ticket description for verification officer', 'open', 'normal', '[]'::jsonb),
  ('77100000-0000-4000-8000-000000000022', gen_random_uuid(), 'bb100000-0000-4000-8000-000000000005', 'Support', 's@test.local', 'customer_support', 'other', 'Support Ticket', 'Staff ticket description for customer support', 'open', 'normal', '[]'::jsonb);

-- 7b. get_rental_conversation_detail returns agreement, agreementVersion, and active availableUnits (excluding retired Room 1)
--     and set_rental_agreement_consent rejects stale expected_version with 40001
INSERT INTO public.rental_units(id, property_id, unit_number, rental_type, monthly_rent, max_occupants, is_available, is_retired)
VALUES
  ('11100000-0000-4000-8000-000000000003', 'ee100000-0000-4000-8000-000000000001', 'Room 3', 'private_room', 6000, 1, true, false),
  ('11100000-0000-4000-8000-000000000004', 'ee100000-0000-4000-8000-000000000001', 'Room 4', 'private_room', 6500, 1, true, false)
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'bb100000-0000-4000-8000-000000000001', true);
DO $$ DECLARE
  detail jsonb;
  units jsonb;
  seq integer;
  res jsonb;
BEGIN
  detail := public.get_rental_conversation_detail('cc100000-0000-4000-8000-000000000001', NULL, 10);
  units := detail->'thread'->'availableUnits';
  IF jsonb_array_length(units) <> 3 THEN
    RAISE EXCEPTION 'expected 3 active (non-retired) units in conversation detail, got %', units;
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(units) e WHERE e->>'id' = '11100000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'retired Room 1 leaked into conversation detail availableUnits';
  END IF;
  IF (detail->'thread'->'agreement'->>'status') <> 'agreed' THEN
    RAISE EXCEPTION 'expected agreed historical agreement on thread detail, got %', detail->'thread'->'agreement';
  END IF;

  seq := (detail->'thread'->>'agreementVersion')::integer;
  -- Advance agreement with current expected version on available Room 3
  res := public.set_rental_agreement_consent('cc100000-0000-4000-8000-000000000001', gen_random_uuid(), true, '11100000-0000-4000-8000-000000000003', seq);
  IF (res->>'version')::integer <> seq + 1 THEN
    RAISE EXCEPTION 'expected version increment to %, got %', seq + 1, res;
  END IF;

  -- Stale version must fail with SQLSTATE 40001
  BEGIN
    PERFORM public.set_rental_agreement_consent('cc100000-0000-4000-8000-000000000001', gen_random_uuid(), true, '11100000-0000-4000-8000-000000000004', seq);
    RAISE EXCEPTION 'stale agreement version was allowed to overwrite newer unit selection';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;

DO $$ BEGIN
  RAISE NOTICE 'PASS: All roles, verification, support, multi-unit and agreement assertions passed.';
END $$;

ROLLBACK;
