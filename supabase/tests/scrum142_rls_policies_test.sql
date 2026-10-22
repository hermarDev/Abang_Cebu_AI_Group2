-- SCRUM-142 role-boundary regression tests. Synthetic fixtures only; all changes roll back.
BEGIN;
CREATE TEMP TABLE rls_policy_test_results (
    label text PRIMARY KEY,
    affected integer NOT NULL DEFAULT 0
) ON COMMIT DROP;

SELECT plan(47);

SELECT is((SELECT count(*)::integer FROM pg_class
           WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relrowsecurity),
          12, 'RLS is enabled on every domain table');
SELECT ok(NOT has_column_privilege('anon', 'public.profiles', 'role', 'SELECT'),
          'guests cannot read profile roles');
SELECT ok(NOT has_column_privilege('anon', 'public.properties', 'moderation_note', 'SELECT'),
          'guests cannot read moderation notes');
SELECT ok(NOT has_column_privilege('anon', 'public.rental_units', 'security_deposit', 'SELECT'),
          'guests cannot read security deposits');
SELECT ok(NOT has_column_privilege('anon', 'public.property_photos', 'storage_path', 'SELECT'),
          'guests cannot read internal storage paths');
SELECT ok(NOT has_table_privilege('anon', 'public.kyc_verifications', 'SELECT'),
          'guests cannot read KYC documents');
SELECT ok(NOT has_table_privilege('anon', 'public.inquiries', 'SELECT'),
          'guests cannot read inquiries');
SELECT ok(NOT has_table_privilege('anon', 'public.saved_listings', 'SELECT'),
          'guests cannot read saved listings');
SELECT ok(NOT has_table_privilege('anon', 'public.audit_logs', 'SELECT'),
          'guests cannot read audit logs');
SELECT ok(NOT has_function_privilege('anon', 'public.is_admin()', 'EXECUTE'),
          'guests cannot call the admin helper');
SELECT ok(NOT has_function_privilege('anon', 'public.get_current_user_role()', 'EXECUTE'),
          'guests cannot call the role helper');

INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data) VALUES
 ('14200000-0000-4000-8000-000000000001','authenticated','authenticated','142-landlord-a@example.invalid','{"role":"landlord","full_name":"Landlord A"}'::jsonb),
 ('14200000-0000-4000-8000-000000000002','authenticated','authenticated','142-landlord-b@example.invalid','{"role":"landlord","full_name":"Landlord B"}'::jsonb),
 ('14200000-0000-4000-8000-000000000003','authenticated','authenticated','142-renter-a@example.invalid','{"role":"renter","full_name":"Renter A"}'::jsonb),
 ('14200000-0000-4000-8000-000000000004','authenticated','authenticated','142-renter-b@example.invalid','{"role":"renter","full_name":"Renter B"}'::jsonb),
 ('14200000-0000-4000-8000-000000000005','authenticated','authenticated','142-admin@example.invalid','{"role":"renter","full_name":"Admin"}'::jsonb),
 ('14200000-0000-4000-8000-000000000006','authenticated','authenticated','142-suspended@example.invalid','{"role":"landlord","full_name":"Suspended Landlord"}'::jsonb);
UPDATE public.profiles SET role = 'admin'::public.user_role
WHERE id = '14200000-0000-4000-8000-000000000005';
UPDATE public.profiles SET is_suspended = true
WHERE id = '14200000-0000-4000-8000-000000000006';

INSERT INTO public.properties (id, landlord_id, title, description, property_type,
    street_address, barangay, city, coordinates, status, moderation_note)
VALUES
 ('14200000-0000-4000-8000-000000000011','14200000-0000-4000-8000-000000000001','Approved A','Synthetic fixture','apartment','1 Test St','Lahug','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326)::extensions.geography,'approved',NULL),
 ('14200000-0000-4000-8000-000000000012','14200000-0000-4000-8000-000000000001','Pending A','Synthetic fixture','apartment','2 Test St','Lahug','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326)::extensions.geography,'pending','internal'),
 ('14200000-0000-4000-8000-000000000013','14200000-0000-4000-8000-000000000002','Approved B','Synthetic fixture','house','3 Test St','Banilad','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(123.91,10.31),4326)::extensions.geography,'approved',NULL),
 ('14200000-0000-4000-8000-000000000014','14200000-0000-4000-8000-000000000006','Suspended approved','Synthetic fixture','apartment','4 Test St','Lahug','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(123.92,10.32),4326)::extensions.geography,'approved',NULL);
INSERT INTO public.rental_units (id, property_id, rental_type, monthly_rent, is_available, security_deposit)
VALUES
 ('14200000-0000-4000-8000-000000000021','14200000-0000-4000-8000-000000000011','private_room',12000,true,5000),
 ('14200000-0000-4000-8000-000000000022','14200000-0000-4000-8000-000000000011','bedspace',7000,false,1000),
 ('14200000-0000-4000-8000-000000000023','14200000-0000-4000-8000-000000000012','private_room',9000,true,2000),
 ('14200000-0000-4000-8000-000000000024','14200000-0000-4000-8000-000000000013','entire_place',20000,true,10000),
 ('14200000-0000-4000-8000-000000000025','14200000-0000-4000-8000-000000000014','private_room',10000,true,3000);
INSERT INTO public.property_photos (id, property_id, storage_path, public_url)
VALUES ('14200000-0000-4000-8000-000000000031','14200000-0000-4000-8000-000000000011','private/path.jpg','https://example.invalid/public.jpg');
INSERT INTO public.amenities (id, name, category)
VALUES ('14200000-0000-4000-8000-000000000041','WiFi','utility');
INSERT INTO public.property_amenities (property_id, amenity_id)
VALUES ('14200000-0000-4000-8000-000000000011','14200000-0000-4000-8000-000000000041');
INSERT INTO public.kyc_verifications (id, landlord_id, id_type, id_document_url)
VALUES ('14200000-0000-4000-8000-000000000051','14200000-0000-4000-8000-000000000001','passport','private://landlord-a');
INSERT INTO public.inquiries (id, property_id, renter_id, landlord_id, message)
VALUES ('14200000-0000-4000-8000-000000000061','14200000-0000-4000-8000-000000000011','14200000-0000-4000-8000-000000000003','14200000-0000-4000-8000-000000000001','Synthetic inquiry');
INSERT INTO public.saved_listings (id, renter_id, property_id)
VALUES ('14200000-0000-4000-8000-000000000071','14200000-0000-4000-8000-000000000003','14200000-0000-4000-8000-000000000011');
INSERT INTO public.reviews (id, property_id, renter_id, rating, comment)
VALUES ('14200000-0000-4000-8000-000000000081','14200000-0000-4000-8000-000000000011','14200000-0000-4000-8000-000000000003',5,'Synthetic review');
INSERT INTO public.audit_logs (id, actor_id, action, target_type, target_id)
VALUES ('14200000-0000-4000-8000-000000000091','14200000-0000-4000-8000-000000000005','policy-test','property','14200000-0000-4000-8000-000000000011');

SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::integer FROM public.properties WHERE id::text LIKE '14200000-%'),
          2, 'guests see only approved listings from active landlords');
SELECT is((SELECT count(*)::integer FROM public.rental_units WHERE id::text LIKE '14200000-%'),
          2, 'guests see available units only for public listings');
SELECT is((SELECT count(*)::integer FROM public.profiles WHERE id::text LIKE '14200000-%'),
          6, 'guests can see basic public profiles');
SELECT is((SELECT count(*)::integer FROM public.property_photos WHERE id = '14200000-0000-4000-8000-000000000031'),
          1, 'guests see photos attached to public listings');
SELECT is((SELECT count(*)::integer FROM public.property_amenities WHERE property_id = '14200000-0000-4000-8000-000000000011'),
          1, 'guests see amenities on public listings');
SELECT throws_ok($$SELECT moderation_note FROM public.properties WHERE id='14200000-0000-4000-8000-000000000012'$$,
                 '42501', NULL, 'guests cannot select moderation notes');
SELECT throws_ok($$SELECT security_deposit FROM public.rental_units WHERE id='14200000-0000-4000-8000-000000000021'$$,
                 '42501', NULL, 'guests cannot select security deposits');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','14200000-0000-4000-8000-000000000001',true);
SET LOCAL request.jwt.claims = '{"sub":"14200000-0000-4000-8000-000000000001","role":"authenticated"}';
SELECT is((SELECT count(*)::integer FROM public.properties WHERE landlord_id='14200000-0000-4000-8000-000000000001'),
          2, 'landlord sees own approved and pending listings');
SELECT is((SELECT count(*)::integer FROM public.kyc_verifications WHERE id='14200000-0000-4000-8000-000000000051'),
          1, 'landlord sees own KYC submission');
SELECT throws_ok($$INSERT INTO public.kyc_verifications(landlord_id,id_type,id_document_url) VALUES ('14200000-0000-4000-8000-000000000002','passport','private://foreign')$$,
                 '42501', NULL, 'landlord cannot submit KYC for another user');
SELECT lives_ok($$INSERT INTO public.properties(landlord_id,title,description,property_type,street_address,barangay,city,coordinates,status)
VALUES ('14200000-0000-4000-8000-000000000001','New pending','Synthetic fixture','apartment','5 Test St','Lahug','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326)::extensions.geography,'pending')$$,
                 'landlord can create own pending listing');
SELECT throws_ok($$UPDATE public.properties SET status='approved' WHERE id='14200000-0000-4000-8000-000000000012'$$,
                 '42501', NULL, 'landlord cannot self-approve a listing');
SELECT lives_ok($$UPDATE public.properties SET title='Unauthorized' WHERE id='14200000-0000-4000-8000-000000000013'$$,
                'landlord update attempt on another owner listing is filtered');
SELECT is((SELECT title FROM public.properties WHERE id='14200000-0000-4000-8000-000000000013'),
          'Approved B', 'landlord cannot modify another owner listing');
SELECT lives_ok($$INSERT INTO public.rental_units(property_id,rental_type,monthly_rent) VALUES ('14200000-0000-4000-8000-000000000011','private_room',15000)$$,
                 'landlord can add a unit to own listing');
SELECT throws_ok($$INSERT INTO public.rental_units(property_id,rental_type,monthly_rent) VALUES ('14200000-0000-4000-8000-000000000013','private_room',15000)$$,
                 '42501', NULL, 'landlord cannot add a unit to another listing');
SELECT lives_ok($$INSERT INTO public.property_photos(property_id,storage_path,public_url) VALUES ('14200000-0000-4000-8000-000000000011','private/new.jpg','https://example.invalid/new.jpg')$$,
                 'landlord can attach a photo to own listing');
SELECT lives_ok($$INSERT INTO public.property_amenities(property_id,amenity_id) VALUES ('14200000-0000-4000-8000-000000000011','14200000-0000-4000-8000-000000000041') ON CONFLICT DO NOTHING$$,
                 'landlord can manage amenities on own listing');
SELECT is((SELECT count(*)::integer FROM public.saved_listings WHERE id='14200000-0000-4000-8000-000000000071'),
          0, 'landlord cannot read a renter saved listing');

SELECT set_config('request.jwt.claim.sub','14200000-0000-4000-8000-000000000003',true);
SET LOCAL request.jwt.claims = '{"sub":"14200000-0000-4000-8000-000000000003","role":"authenticated"}';
SELECT is((SELECT count(*)::integer FROM public.saved_listings WHERE id='14200000-0000-4000-8000-000000000071'),
          1, 'renter sees own saved listing');
SET LOCAL request.jwt.claims = '{"sub":"14200000-0000-4000-8000-000000000001","role":"authenticated"}';
CREATE OR REPLACE FUNCTION pg_temp.delete_saved_listing_result(p_renter_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE changed_count integer;
BEGIN
    DELETE FROM public.saved_listings WHERE renter_id = p_renter_id;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    RETURN changed_count;
END;
$function$;
SELECT is(pg_temp.delete_saved_listing_result('14200000-0000-4000-8000-000000000004'),
          0, 'landlord cannot delete another saved listing');

SET LOCAL request.jwt.claims = '{"sub":"14200000-0000-4000-8000-000000000003","role":"authenticated"}';
SELECT is(pg_temp.delete_saved_listing_result('14200000-0000-4000-8000-000000000004'),
          0, 'renter cannot delete another saved listing');

SELECT set_config('request.jwt.claim.sub','14200000-0000-4000-8000-000000000003',true);
SELECT lives_ok($$INSERT INTO public.saved_listings(renter_id,property_id) VALUES ('14200000-0000-4000-8000-000000000003','14200000-0000-4000-8000-000000000013')$$,
                 'renter can save an approved listing');
SELECT throws_ok($$INSERT INTO public.saved_listings(renter_id,property_id) VALUES ('14200000-0000-4000-8000-000000000004','14200000-0000-4000-8000-000000000011')$$,
                 '42501', NULL, 'renter cannot save for another renter');
SELECT lives_ok($$INSERT INTO public.inquiries(property_id,renter_id,landlord_id,message) VALUES ('14200000-0000-4000-8000-000000000013','14200000-0000-4000-8000-000000000003','14200000-0000-4000-8000-000000000002','Synthetic inquiry')$$,
                 'renter can inquire about an approved listing');
CREATE OR REPLACE FUNCTION pg_temp.inquiry_update_result(p_inquiry_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE changed_count integer;
BEGIN
    UPDATE public.inquiries SET status = 'closed' WHERE id = p_inquiry_id;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    RETURN changed_count;
END;
$function$;
SELECT is(pg_temp.inquiry_update_result('14200000-0000-4000-8000-000000000061'),
          1, 'inquiry renter can update own inquiry');
SELECT lives_ok($$INSERT INTO public.reviews(property_id,renter_id,rating,comment) VALUES ('14200000-0000-4000-8000-000000000013','14200000-0000-4000-8000-000000000003',4,'Synthetic review')$$,
                 'renter can submit own review');
SELECT is((SELECT is_verified_tenant FROM public.reviews WHERE property_id='14200000-0000-4000-8000-000000000013' AND renter_id='14200000-0000-4000-8000-000000000003'),
          false, 'client review defaults to unverified tenant');
SELECT throws_ok($$INSERT INTO public.audit_logs(actor_id,action,target_type,target_id) VALUES ('14200000-0000-4000-8000-000000000003','policy-test','property','14200000-0000-4000-8000-000000000011')$$,
                 '42501', NULL, 'non-admin renter cannot append audit logs');
CREATE OR REPLACE FUNCTION pg_temp.update_property_result(p_property_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE changed_count integer;
BEGIN
    UPDATE public.properties SET title = 'unauthorized' WHERE id = p_property_id;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    RETURN changed_count;
END;
$function$;
SET LOCAL request.jwt.claims = '{"sub":"14200000-0000-4000-8000-000000000003","role":"authenticated"}';
SELECT is((SELECT title FROM public.properties WHERE id='14200000-0000-4000-8000-000000000011'),
          'Approved A', 'renter cannot change landlord listing');
SELECT is(pg_temp.update_property_result('14200000-0000-4000-8000-000000000011'),
          0, 'renter cannot update landlord listing');

SELECT set_config('request.jwt.claim.sub','14200000-0000-4000-8000-000000000005',true);
SET LOCAL request.jwt.claims = '{"sub":"14200000-0000-4000-8000-000000000005","role":"authenticated"}';
SELECT is((SELECT count(*)::integer FROM public.audit_logs WHERE id='14200000-0000-4000-8000-000000000091'),
          1, 'admin can read audit logs');
SELECT lives_ok($$INSERT INTO public.audit_logs(actor_id,action,target_type,target_id) VALUES ('14200000-0000-4000-8000-000000000005','policy-test','property','14200000-0000-4000-8000-000000000011')$$,
                 'admin can append audit logs');
SELECT is((SELECT count(*)::integer FROM public.kyc_verifications),
          1, 'admin can read KYC submissions');
SELECT lives_ok($$UPDATE public.kyc_verifications SET status='verified',reviewed_by='14200000-0000-4000-8000-000000000005',reviewed_at=now() WHERE id='14200000-0000-4000-8000-000000000051'$$,
                 'admin can review KYC submission');
CREATE OR REPLACE FUNCTION pg_temp.admin_property_update_result(p_property_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE changed_count integer;
BEGIN
    UPDATE public.properties SET title = 'Admin update' WHERE id = p_property_id;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
    RETURN changed_count;
END;
$function$;
SELECT is(pg_temp.admin_property_update_result('14200000-0000-4000-8000-000000000012'),
          1, 'admin can update listings');
RESET ROLE;

SELECT * FROM extensions.finish();
ROLLBACK;
