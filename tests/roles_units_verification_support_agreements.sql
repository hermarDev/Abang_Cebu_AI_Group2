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
VALUES ('bb100000-0000-4000-8000-000000000002', 'ff100000-0000-4000-8000-000000000001', 'dd100000-0000-4000-8000-000000000001', 1, 'ee100000-0000-4000-8000-000000000001', '{"property":{},"unit":{}}', '[]', 'pending');

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

-- Valid verification with proof
SELECT public.verifier_submit_verification(
  'ee100000-0000-4000-8000-000000000001', 'aa100000-0000-4000-8000-000000000001',
  'dd100000-0000-4000-8000-000000000001', 1, 'verified', 'site_visit',
  'Verified premises in person and inspected perimeter fence',
  '[{"kind":"photo","object_path":"11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"}]'::jsonb
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

DO $$ BEGIN
  RAISE NOTICE 'PASS: All roles, verification, support, multi-unit and agreement assertions passed.';
END $$;

ROLLBACK;
