-- Local-only SCRUM-144 seed checks. Requires migrations and seed.sql first.
BEGIN;
SELECT plan(27);

SELECT has_table('public', 'landmarks', 'landmark registry table exists');
SELECT has_column('public', 'landmarks', 'aliases', 'landmark aliases are stored');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.landmarks'::regclass), 'landmarks RLS is enabled');
SELECT ok(has_table_privilege('anon', 'public.landmarks', 'SELECT'), 'guests can read landmarks');
SELECT ok(NOT has_table_privilege('anon', 'public.landmarks', 'INSERT'), 'guests cannot modify landmarks');
SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::integer FROM public.landmarks), 6, 'anonymous role can read seeded landmarks through RLS');
RESET ROLE;
SELECT is((SELECT count(*)::integer FROM public.landmarks), 6, 'six Metro Cebu landmarks are seeded');
SELECT ok((SELECT aliases @> ARRAY['IT Park'] FROM public.landmarks WHERE slug='it-park'), 'IT Park common alias is searchable');
SELECT is((SELECT round(extensions.ST_X(coordinates::extensions.geometry)::numeric,4) FROM public.landmarks WHERE slug='it-park'), 123.9064::numeric, 'IT Park uses the documented longitude');
SELECT is((SELECT count(*)::integer FROM public.landmarks WHERE ROW(slug,name,category,default_radius_meters) IN (
    ROW('it-park','Cebu IT Park (Lahug)','business_hub',1500),
    ROW('usc-tc','USC - Talamban Campus','university',2000),
    ROW('cit-u','Cebu Institute of Technology - University','university',1500),
    ROW('ayala-center','Ayala Center Cebu (Cebu Business Park)','business_hub',1500),
    ROW('uc-main','University of Cebu - Main Campus','university',1200),
    ROW('sm-city','SM City Cebu (North Reclamation Area)','commercial',1500))), 6, 'all six landmark registry rows match documented definitions');
SELECT throws_ok($$INSERT INTO public.landmarks (slug,name,category,coordinates,default_radius_meters)
    VALUES ('bad-radius','Bad radius','commercial',extensions.ST_SetSRID(extensions.ST_MakePoint(123,10),4326)::extensions.geography,0)$$,
    '23514', NULL, 'landmark radius must be positive');

SELECT is((SELECT count(*)::integer FROM auth.users WHERE email IN ('qa-renter@example.invalid','qa-landlord@example.invalid','qa-admin@example.invalid')), 3, 'three synthetic QA identities exist');
SELECT is((SELECT role::text FROM public.profiles WHERE id='14400000-0000-4000-8000-000000000001'), 'renter', 'QA renter profile has renter role');
SELECT is((SELECT role::text FROM public.profiles WHERE id='14400000-0000-4000-8000-000000000002'), 'landlord', 'QA landlord profile has landlord role');
SELECT is((SELECT role::text FROM public.profiles WHERE id='14400000-0000-4000-8000-000000000003'), 'admin', 'QA admin profile is explicitly provisioned');
SELECT is((SELECT count(*)::integer FROM public.profiles WHERE id IN ('14400000-0000-4000-8000-000000000001','14400000-0000-4000-8000-000000000002','14400000-0000-4000-8000-000000000003') AND full_name IN ('QA Renter','QA Landlord','QA Admin')), 3, 'QA profile names match the fixture roles');

SELECT is((SELECT count(*)::integer FROM public.properties WHERE status='approved'), 60, 'exactly 60 approved sample properties exist');
SELECT is((SELECT count(*)::integer FROM public.properties WHERE status='draft'), 1, 'one draft sample property exists');
SELECT is((SELECT count(*)::integer FROM public.properties WHERE status='pending'), 1, 'one pending sample property exists');
SELECT is((SELECT count(*)::integer FROM public.properties WHERE status='rejected'), 1, 'one rejected sample property exists');
SELECT is((SELECT count(*)::integer FROM public.properties), 63, 'seed has exactly 63 sample properties');
SELECT is((SELECT count(*)::integer FROM public.rental_units WHERE property_id IN (SELECT id FROM public.properties)), 63, 'each sample property has a rental unit');
SELECT ok((SELECT bool_and(approved_by IS NOT NULL AND approved_at IS NOT NULL) FROM public.properties WHERE status='approved'), 'approved samples include moderation metadata');
SELECT ok((SELECT bool_and(approved_by IS NULL AND approved_at IS NULL) FROM public.properties WHERE status <> 'approved'), 'non-approved samples have no approval metadata');
SELECT ok((SELECT bool_and(city IN ('Cebu City','Mandaue City','Lapu-Lapu City','Talisay City')) FROM public.properties), 'samples are scoped to Metro Cebu cities');
SELECT ok((SELECT bool_and(extensions.ST_X(coordinates::extensions.geometry) BETWEEN 123.80 AND 124.00 AND extensions.ST_Y(coordinates::extensions.geometry) BETWEEN 10.25 AND 10.45) FROM public.properties), 'sample coordinates fall within the Metro Cebu seed bounds');
SELECT ok((SELECT bool_and(email LIKE '%@example.invalid') FROM auth.users WHERE id IN ('14400000-0000-4000-8000-000000000001','14400000-0000-4000-8000-000000000002','14400000-0000-4000-8000-000000000003')), 'QA identities use reserved non-deliverable email domains');

SELECT * FROM finish();
ROLLBACK;
