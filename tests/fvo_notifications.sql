\set ON_ERROR_STOP on
BEGIN;

-- Fixture inserts for FVO notification tests
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('f1100000-0000-4000-8000-000000000001', '{"role":"landlord","full_name":"Test Landlord"}'),
 ('f1100000-0000-4000-8000-000000000002', '{"role":"verification_officer","full_name":"FVO Officer"}'),
 ('f1100000-0000-4000-8000-000000000003', '{"role":"verification_officer","full_name":"FVO Officer 2"}'),
 ('f1100000-0000-4000-8000-000000000004', '{"role":"admin","full_name":"Test Admin"}'),
 ('f1100000-0000-4000-8000-000000000005', '{"role":"renter","full_name":"Test Renter"}'),
 ('f1100000-0000-4000-8000-000000000006', '{"role":"customer_support","full_name":"Test Support"}');

-- Public signup must not assign privileged roles
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.profiles WHERE id IN (
   'f1100000-0000-4000-8000-000000000002',
   'f1100000-0000-4000-8000-000000000003',
   'f1100000-0000-4000-8000-000000000004',
   'f1100000-0000-4000-8000-000000000006'
 ) AND role::text <> 'renter') THEN
   RAISE EXCEPTION 'public signup assigned privileged role';
 END IF;
END $$;

UPDATE public.profiles SET role = 'landlord', is_suspended = false WHERE id = 'f1100000-0000-4000-8000-000000000001';
UPDATE public.profiles SET role = 'verification_officer', is_suspended = false WHERE id = 'f1100000-0000-4000-8000-000000000002';
UPDATE public.profiles SET role = 'verification_officer', is_suspended = false WHERE id = 'f1100000-0000-4000-8000-000000000003';
UPDATE public.profiles SET role = 'admin', is_suspended = false WHERE id = 'f1100000-0000-4000-8000-000000000004';
UPDATE public.profiles SET role = 'renter', is_suspended = false WHERE id = 'f1100000-0000-4000-8000-000000000005';
UPDATE public.profiles SET role = 'customer_support', is_suspended = false WHERE id = 'f1100000-0000-4000-8000-000000000006';

INSERT INTO public.properties(id, landlord_id, title, description, property_type, street_address, barangay, city, coordinates, status)
VALUES ('f2200000-0000-4000-8000-000000000001', 'f1100000-0000-4000-8000-000000000001', 'Test Property for FVO', 'Description', 'apartment', '123 Test St', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9, 10.3), 4326), 'pending');

INSERT INTO public.rental_units(property_id, rental_type, monthly_rent)
VALUES ('f2200000-0000-4000-8000-000000000001', 'private_room', 5000);

INSERT INTO public.property_drafts(id, owner_id, operation_id, payload, original_payload)
VALUES ('f3300000-0000-4000-8000-000000000001', 'f1100000-0000-4000-8000-000000000001', gen_random_uuid(), '{"property":{"title":"Test Property for FVO","barangay":"Apas","city":"Cebu City"},"unit":{}}', '{"property":{"title":"Test Property for FVO","barangay":"Apas","city":"Cebu City"},"unit":{}}');

-- TEST 1: Pending submission creates unread FVO notifications
INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media, review_status, field_verification_status, superseded_by)
VALUES (
  'f1100000-0000-4000-8000-000000000001',
  'f4400000-0000-4000-8000-000000000001',
  'f3300000-0000-4000-8000-000000000001',
  1,
  'f2200000-0000-4000-8000-000000000001',
  '{"property":{"title":"Test Property for FVO","barangay":"Apas","city":"Cebu City"},"unit":{}}',
  '[]',
  'pending',
  'pending_verification',
  NULL
);

DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.notifications
  WHERE recipient_id = 'f1100000-0000-4000-8000-000000000002'
    AND type = 'listing_pending'
    AND entity_type = 'property'
    AND entity_id = 'f2200000-0000-4000-8000-000000000001'
    AND link = '/verification/queue?status=pending_verification&propertyId=f2200000-0000-4000-8000-000000000001'
    AND NOT is_read;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: FVO 1 expected 1 unread notification, got %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.notifications
  WHERE recipient_id = 'f1100000-0000-4000-8000-000000000003'
    AND type = 'listing_pending'
    AND entity_type = 'property'
    AND entity_id = 'f2200000-0000-4000-8000-000000000001'
    AND NOT is_read;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: FVO 2 expected 1 unread notification, got %', v_count;
  END IF;
END $$;

-- TEST 2: Duplicate submission does NOT create duplicate unread notifications
INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media, review_status, field_verification_status, superseded_by)
VALUES (
  'f1100000-0000-4000-8000-000000000001',
  'f4400000-0000-4000-8000-000000000002',
  'f3300000-0000-4000-8000-000000000001',
  1,
  'f2200000-0000-4000-8000-000000000001',
  '{"property":{"title":"Test Property for FVO","barangay":"Apas","city":"Cebu City"},"unit":{}}',
  '[]',
  'pending',
  'pending_verification',
  NULL
);

DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.notifications
  WHERE recipient_id = 'f1100000-0000-4000-8000-000000000002'
    AND type = 'listing_pending'
    AND entity_type = 'property'
    AND entity_id = 'f2200000-0000-4000-8000-000000000001'
    AND NOT is_read;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: expected deduped count 1, got %', v_count;
  END IF;
END $$;

-- TEST 3: Non-FVO roles do not get FVO notifications
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.notifications
  WHERE recipient_id IN (
    'f1100000-0000-4000-8000-000000000004',
    'f1100000-0000-4000-8000-000000000005',
    'f1100000-0000-4000-8000-000000000006'
  )
    AND type = 'listing_pending'
    AND entity_type = 'property'
    AND entity_id = 'f2200000-0000-4000-8000-000000000001';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: non-FVO role received listing_pending notification (%)', v_count;
  END IF;
END $$;

-- TEST 4: Field verification marks FVO notification read and notifies admin
INSERT INTO public.property_field_verifications(
  officer_id, operation_id, submission_owner_id, submission_operation_id,
  property_id, draft_id, expected_revision, status, method, notes, proof,
  proxy_name, proxy_relationship
)
VALUES (
  'f1100000-0000-4000-8000-000000000002',
  'f5500000-0000-4000-8000-000000000001',
  'f1100000-0000-4000-8000-000000000001',
  'f4400000-0000-4000-8000-000000000001',
  'f2200000-0000-4000-8000-000000000001',
  'f3300000-0000-4000-8000-000000000001',
  1,
  'verified',
  'site_visit',
  'Property verified successfully',
  '[]'::jsonb,
  NULL,
  NULL
);

DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.notifications
  WHERE recipient_id = 'f1100000-0000-4000-8000-000000000002'
    AND type = 'listing_pending'
    AND entity_type = 'property'
    AND entity_id = 'f2200000-0000-4000-8000-000000000001'
    AND NOT is_read;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: FVO notification still unread (%)', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.notifications
  WHERE recipient_id = 'f1100000-0000-4000-8000-000000000004'
    AND type = 'listing_pending'
    AND entity_type = 'property'
    AND entity_id = 'f2200000-0000-4000-8000-000000000001'
    AND NOT is_read;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: Admin should have 1 unread notification, got %', v_count;
  END IF;
END $$;

-- TEST 5: RLS prevents non-recipients from reading FVO notifications
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'f1100000-0000-4000-8000-000000000005', true);
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.notifications
  WHERE recipient_id = 'f1100000-0000-4000-8000-000000000002';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST 5 FAILED: Renter read FVO notification under RLS (%)', v_count;
  END IF;
END $$;

ROLLBACK;
