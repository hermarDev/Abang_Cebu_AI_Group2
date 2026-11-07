\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('aaaaaaaa-0000-4000-8000-000000000001', '{"role":"admin"}'),
 ('aaaaaaaa-0000-4000-8000-000000000002', '{"role":"landlord"}');
UPDATE public.profiles SET role = 'admin', is_suspended = false WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001';
UPDATE public.profiles SET role = 'landlord', is_suspended = false WHERE id = 'aaaaaaaa-0000-4000-8000-000000000002';
INSERT INTO public.property_drafts(id, owner_id, operation_id, payload, original_payload) VALUES
 ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000003', '{"property":{},"unit":{}}', '{"property":{},"unit":{}}'),
 ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000004', '{"property":{},"unit":{}}', '{"property":{},"unit":{}}');
INSERT INTO public.properties(id, landlord_id, title, description, property_type, street_address, barangay, city, coordinates) VALUES
 ('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'Property', 'Description', 'house', 'Street', 'Barangay', 'City', extensions.ST_SetSRID(extensions.ST_MakePoint(123,10),4326)),
 ('bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002', 'Property 2', 'Description', 'house', 'Street', 'Barangay', 'City', extensions.ST_SetSRID(extensions.ST_MakePoint(123,10),4326));
INSERT INTO public.property_submissions(owner_id, operation_id, draft_id, expected_revision, property_id, snapshot_payload, snapshot_media) VALUES
 ('aaaaaaaa-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 1, 'bbbbbbbb-0000-4000-8000-000000000001', '{"property":{},"unit":{}}', '[]'),
 ('aaaaaaaa-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000002', 1, 'bbbbbbbb-0000-4000-8000-000000000002', '{"property":{},"unit":{}}', '[]');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-4000-8000-000000000001', true);
DO $$
DECLARE p uuid := 'bbbbbbbb-0000-4000-8000-000000000001';
        op uuid := 'cccccccc-0000-4000-8000-000000000001';
        d uuid := 'dddddddd-0000-4000-8000-000000000001';
BEGIN
  PERFORM public.review_property('bbbbbbbb-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000002', 'approved', 'ignored note', 'dddddddd-0000-4000-8000-000000000002', 1);
  PERFORM public.review_property('bbbbbbbb-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000002', 'approved', 'ignored note', 'dddddddd-0000-4000-8000-000000000002', 1);
  PERFORM public.review_property(p, op, 'rejected', 'Fix evidence', d, 1);
  PERFORM public.review_property(p, op, 'rejected', 'Fix evidence', d, 1);
  BEGIN
    PERFORM public.review_property(p, op, 'rejected', 'Fix evidence', NULL, NULL);
    RAISE EXCEPTION 'missing revision accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.review_property(p, op, 'rejected', 'Fix evidence', d, 2);
    RAISE EXCEPTION 'changed revision accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    PERFORM public.review_property(p, op, 'rejected', 'Fix evidence', 'dddddddd-0000-4000-8000-000000000002', 1);
    RAISE EXCEPTION 'changed draft accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
ROLLBACK;
