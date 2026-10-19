-- Local pgTAP schema and behavior checks for SCRUM-140/141 migrations.
-- Synthetic fixtures only. Run after applying the local migrations with:
--   supabase test db --local supabase/tests/schema_migrations_test.sql
-- This file is deliberately not run against a cloud or linked database.
BEGIN;
SELECT plan(34);

SELECT has_table('public', 'properties', 'properties table exists');
SELECT has_table('public', 'rental_units', 'rental_units table exists');
SELECT has_table('public', 'property_photos', 'property_photos table exists');
SELECT has_table('public', 'amenities', 'amenities table exists');
SELECT is(
    (SELECT count(*) FROM public.amenities),
    19::bigint,
    'seed contains exactly the standard amenity catalog'
);
SELECT results_eq(
    $$
        SELECT name, category
        FROM public.amenities
        ORDER BY name
    $$,
    $$
        VALUES
            ('24/7 Security Guard', 'security'),
            ('Air Conditioning', 'comfort'),
            ('Balcony', 'comfort'),
            ('Car Parking', 'security'),
            ('CCTV', 'security'),
            ('Cooking Allowed', 'policy'),
            ('Deep Well Backup', 'utility'),
            ('Fitness Gym', 'security'),
            ('Gated Community', 'security'),
            ('Generator Backup', 'utility'),
            ('High-speed Fiber WiFi', 'comfort'),
            ('Hot Shower', 'comfort'),
            ('Kitchenette', 'comfort'),
            ('Motorcycle Parking', 'security'),
            ('Pet Friendly', 'policy'),
            ('Sub-metered Electricity', 'utility'),
            ('Sub-metered Water', 'utility'),
            ('Swimming Pool', 'security'),
            ('Visitors Allowed', 'policy')
    $$,
    'amenity names and categories match the ERD exactly'
);
SELECT results_eq(
    $$
        SELECT category, count(*)::integer
        FROM public.amenities
        GROUP BY category
        ORDER BY category
    $$,
    $$
        VALUES
            ('comfort', 5),
            ('policy', 3),
            ('security', 7),
            ('utility', 4)
    $$,
    'amenity category counts match the ERD'
);
SELECT has_table('public', 'property_amenities', 'property_amenities table exists');
SELECT has_table('public', 'inquiries', 'inquiries table exists');
SELECT has_table('public', 'saved_listings', 'saved_listings table exists');
SELECT has_table('public', 'reviews', 'reviews table exists');
SELECT has_table('public', 'audit_logs', 'audit_logs table exists');
SELECT ok(
    NOT has_table_privilege('anon', 'public.audit_logs', 'TRUNCATE'),
    'anon cannot truncate audit logs'
);
SELECT ok(
    NOT has_table_privilege('authenticated', 'public.audit_logs', 'TRUNCATE'),
    'authenticated cannot truncate audit logs'
);

SELECT has_index('public', 'properties', 'idx_properties_coordinates', 'properties have a spatial GiST index');
SELECT has_index('public', 'inquiries', 'idx_inquiries_landlord_inbox', 'inquiries have a landlord inbox index');
SELECT has_index('public', 'saved_listings', 'idx_saved_listings_renter_created', 'favorites have a renter lookup index');
SELECT ok(
    (SELECT count(*) = 9
     FROM pg_class c
     WHERE c.oid = ANY (ARRAY[
         'public.properties'::regclass,
         'public.rental_units'::regclass,
         'public.property_photos'::regclass,
         'public.amenities'::regclass,
         'public.property_amenities'::regclass,
         'public.inquiries'::regclass,
         'public.saved_listings'::regclass,
         'public.reviews'::regclass,
         'public.audit_logs'::regclass
     ])
       AND c.relrowsecurity),
    'RLS is enabled for every new table'
);
SELECT ok(
    (SELECT a.atttypid = 'extensions.geography'::regtype
     FROM pg_attribute a
     WHERE a.attrelid = 'public.properties'::regclass
       AND a.attname = 'coordinates'
       AND NOT a.attisdropped),
    'property coordinates use PostGIS geography'
);
SELECT ok(
    (SELECT c.contype = 'u'
     FROM pg_constraint c
     WHERE c.conrelid = 'public.saved_listings'::regclass
       AND c.conname = 'saved_listings_renter_property_key'),
    'saved listings enforce renter/property uniqueness'
);
SELECT ok(
    (SELECT c.confdeltype = 'n'
     FROM pg_constraint c
     WHERE c.conrelid = 'public.inquiries'::regclass
       AND c.conname = 'inquiries_unit_property_fkey'),
    'unit deletion preserves inquiry and sets the optional unit reference to null'
);
SELECT ok(
    (SELECT c.contype = 'c'
     FROM pg_constraint c
     WHERE c.conrelid = 'public.rental_units'::regclass
       AND c.conname = 'rental_units_monthly_rent_positive'),
    'rental monthly rent has a positive-value check'
);
SELECT ok(
    (SELECT c.contype = 'c'
     FROM pg_constraint c
     WHERE c.conrelid = 'public.reviews'::regclass
       AND c.conname = 'reviews_rating_range_check'),
    'review rating has a range check'
);
SELECT ok(
    (SELECT c.contype = 'f' AND c.confdeltype = 'n'
     FROM pg_constraint c
     WHERE c.conrelid = 'public.audit_logs'::regclass
       AND c.conname = 'audit_logs_actor_id_fkey'),
    'audit actor deletion retains the log with a null actor reference'
);

-- All records and auth trigger side effects are synthetic and rolled back below.
INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data)
VALUES
    ('14000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'db-test-landlord@example.invalid', '{"role":"landlord","full_name":"Synthetic Landlord"}'::jsonb),
    ('14000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'db-test-renter@example.invalid', '{"role":"renter","full_name":"Synthetic Renter"}'::jsonb),
    ('14000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'db-test-other-landlord@example.invalid', '{"role":"landlord","full_name":"Synthetic Other Landlord"}'::jsonb);

INSERT INTO public.properties (
    id, landlord_id, title, description, property_type,
    street_address, barangay, coordinates
) VALUES
    (
      '14000000-0000-4000-8000-000000000011',
      '14000000-0000-4000-8000-000000000001',
      'Synthetic Test Property', 'Synthetic fixture only', 'apartment',
      '1 Test Street', 'Lahug',
      extensions.ST_SetSRID(extensions.ST_MakePoint(123.9065, 10.3298), 4326)::extensions.geography
    ),
    (
      '14000000-0000-4000-8000-000000000012',
      '14000000-0000-4000-8000-000000000003',
      'Synthetic Other Property', 'Synthetic fixture only', 'house',
      '2 Test Street', 'Banilad',
      extensions.ST_SetSRID(extensions.ST_MakePoint(123.9100, 10.3300), 4326)::extensions.geography
    );

INSERT INTO public.rental_units (id, property_id, rental_type, monthly_rent)
VALUES (
    '14000000-0000-4000-8000-000000000021',
    '14000000-0000-4000-8000-000000000011',
    'private_room', 12000.00
);

SELECT lives_ok(
    $$INSERT INTO public.saved_listings (renter_id, property_id)
      VALUES ('14000000-0000-4000-8000-000000000002', '14000000-0000-4000-8000-000000000011')$$,
    'valid synthetic favorite is accepted'
);
SELECT throws_ok(
    $$INSERT INTO public.saved_listings (renter_id, property_id)
      VALUES ('14000000-0000-4000-8000-000000000002', '14000000-0000-4000-8000-000000000011')$$,
    '23505', NULL, 'duplicate favorite is rejected'
);
SELECT throws_ok(
    $$INSERT INTO public.reviews (property_id, renter_id, rating)
      VALUES ('14000000-0000-4000-8000-000000000011', '14000000-0000-4000-8000-000000000002', 6)$$,
    '23514', NULL, 'out-of-range review rating is rejected'
);
SELECT throws_ok(
    $$INSERT INTO public.rental_units (property_id, rental_type, monthly_rent)
      VALUES ('14000000-0000-4000-8000-000000000011', 'bedspace', 0)$$,
    '23514', NULL, 'non-positive rent is rejected'
);
SELECT throws_ok(
    $$INSERT INTO public.inquiries (property_id, renter_id, landlord_id, message)
      VALUES ('14000000-0000-4000-8000-000000000011', '14000000-0000-4000-8000-000000000002', '14000000-0000-4000-8000-000000000003', 'Synthetic mismatch test')$$,
    '23503', NULL, 'inquiry landlord must own the referenced property'
);

INSERT INTO public.property_photos (property_id, unit_id, storage_path, public_url)
VALUES (
    '14000000-0000-4000-8000-000000000011',
    '14000000-0000-4000-8000-000000000021',
    'synthetic/test.jpg', 'https://example.invalid/synthetic/test.jpg'
);
INSERT INTO public.inquiries (id, property_id, unit_id, renter_id, landlord_id, message)
VALUES (
    '14000000-0000-4000-8000-000000000031',
    '14000000-0000-4000-8000-000000000011',
    '14000000-0000-4000-8000-000000000021',
    '14000000-0000-4000-8000-000000000002',
    '14000000-0000-4000-8000-000000000001',
    'Synthetic viewing inquiry'
);
DELETE FROM public.rental_units WHERE id = '14000000-0000-4000-8000-000000000021';
SELECT is(
    (SELECT unit_id::text FROM public.inquiries WHERE id = '14000000-0000-4000-8000-000000000031'),
    NULL,
    'deleting an optional unit keeps inquiry and nulls unit_id'
);
SELECT is(
    (SELECT count(*)::integer FROM public.property_photos
     WHERE storage_path = 'synthetic/test.jpg'),
    0,
    'deleting a unit cascades its unit-specific photo'
);

INSERT INTO public.audit_logs (actor_id, action, target_type, target_id)
VALUES (
    '14000000-0000-4000-8000-000000000001',
    'test.synthetic', 'property', '14000000-0000-4000-8000-000000000011'
);
SELECT throws_ok(
    $$UPDATE public.audit_logs SET action = 'test.changed' WHERE action = 'test.synthetic'$$,
    '55000', NULL, 'audit log updates are rejected'
);
SELECT throws_ok(
    $$DELETE FROM public.audit_logs WHERE action = 'test.synthetic'$$,
    '55000', NULL, 'audit log deletes are rejected'
);

-- Profile deletion must null the actor reference without deleting the audit row.
DELETE FROM public.profiles WHERE id = '14000000-0000-4000-8000-000000000001';
SELECT is(
    (SELECT actor_id::text FROM public.audit_logs WHERE action = 'test.synthetic'),
    NULL,
    'profile deletion nulls audit actor while retaining audit row'
);

SELECT * FROM finish();
ROLLBACK;
