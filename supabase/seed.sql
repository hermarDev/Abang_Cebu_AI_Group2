-- Stable development fixtures. Emails use .invalid; passwordless users are not login-ready.
-- This Supabase CLI config must list seed.sql under [db.seed].
BEGIN;

INSERT INTO public.landmarks (slug, name, category, coordinates, default_radius_meters, aliases)
VALUES
    ('it-park', 'Cebu IT Park (Lahug)', 'business_hub', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9064, 10.3297), 4326)::extensions.geography, 1500, ARRAY['IT Park', 'Cebu I.T. Park']),
    ('usc-tc', 'USC - Talamban Campus', 'university', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9114, 10.3541), 4326)::extensions.geography, 2000, ARRAY['USC Talamban', 'USC-TC']),
    ('cit-u', 'Cebu Institute of Technology - University', 'university', extensions.ST_SetSRID(extensions.ST_MakePoint(123.8808, 10.2944), 4326)::extensions.geography, 1500, ARRAY['CIT-U', 'Cebu Tech']),
    ('ayala-center', 'Ayala Center Cebu (Cebu Business Park)', 'business_hub', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9050, 10.3173), 4326)::extensions.geography, 1500, ARRAY['Ayala Cebu', 'Cebu Business Park']),
    ('uc-main', 'University of Cebu - Main Campus', 'university', extensions.ST_SetSRID(extensions.ST_MakePoint(123.8970, 10.2975), 4326)::extensions.geography, 1200, ARRAY['UC Main', 'University of Cebu Main']),
    ('sm-city', 'SM City Cebu (North Reclamation Area)', 'commercial', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9183, 10.3117), 4326)::extensions.geography, 1500, ARRAY['SM City Cebu', 'SM Cebu'])
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    coordinates = EXCLUDED.coordinates,
    default_radius_meters = EXCLUDED.default_radius_meters,
    aliases = EXCLUDED.aliases;

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        is_sso_user, is_anonymous)
VALUES
    ('14400000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'qa-renter@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"renter","full_name":"QA Renter"}'::jsonb, now(), now(), false, false),
    ('14400000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'qa-landlord@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"landlord","full_name":"QA Landlord"}'::jsonb, now(), now(), false, false),
    ('14400000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'qa-admin@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"renter","full_name":"QA Admin"}'::jsonb, now(), now(), false, false)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

-- Admins are never self-registered; provision these synthetic local profiles explicitly.
UPDATE public.profiles SET
    role = CASE id
        WHEN '14400000-0000-4000-8000-000000000001'::uuid THEN 'renter'::public.user_role
        WHEN '14400000-0000-4000-8000-000000000002'::uuid THEN 'landlord'::public.user_role
        ELSE 'admin'::public.user_role
    END,
    full_name = CASE id
        WHEN '14400000-0000-4000-8000-000000000001'::uuid THEN 'QA Renter'
        WHEN '14400000-0000-4000-8000-000000000002'::uuid THEN 'QA Landlord'
        ELSE 'QA Admin'
    END
WHERE id IN (
    '14400000-0000-4000-8000-000000000001',
    '14400000-0000-4000-8000-000000000002',
    '14400000-0000-4000-8000-000000000003'
);

WITH sample AS (
    SELECT i,
           (ARRAY['Cebu City','Mandaue City','Lapu-Lapu City','Talisay City'])[((i - 1) % 4) + 1] AS city,
           (ARRAY['Lahug','Apas','Mabolo','Banilad','Guadalupe','Kamputhaw','Kasambagan','Basak','Gun-ob','Poblacion'])[((i - 1) % 10) + 1] AS barangay,
           123.84 + ((i % 12) * 0.012)::double precision AS longitude,
           10.285 + ((i % 9) * 0.014)::double precision AS latitude
    FROM generate_series(1, 63) AS i
), property_rows AS (
    SELECT i,
           md5('abangcebu-scrum144-property-' || i)::uuid AS property_id,
           CASE WHEN i <= 60 THEN 'approved' WHEN i = 61 THEN 'draft'
                WHEN i = 62 THEN 'pending' ELSE 'rejected' END AS status,
           city, barangay, longitude, latitude
    FROM sample
)
INSERT INTO public.properties (id, landlord_id, title, description, property_type,
    street_address, barangay, city, postal_code, coordinates, status, moderation_note,
    approved_by, approved_at)
SELECT property_id,
       '14400000-0000-4000-8000-000000000002'::uuid,
       format('Metro Cebu Sample Rental %s', i),
       'Synthetic local QA listing. Not a real property or offer.',
       (ARRAY['apartment','condominium','house','townhouse','boarding_house'])[((i - 1) % 5) + 1],
       format('Sample Block %s, %s', ((i - 1) % 20) + 1, barangay),
       barangay, city,
       CASE city WHEN 'Cebu City' THEN '6000' WHEN 'Mandaue City' THEN '6014'
                 WHEN 'Lapu-Lapu City' THEN '6015' ELSE '6045' END,
       extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)::extensions.geography,
       status,
       CASE WHEN status = 'rejected' THEN 'Synthetic QA moderation example.' ELSE NULL END,
       CASE WHEN status = 'approved' THEN '14400000-0000-4000-8000-000000000003'::uuid ELSE NULL END,
       CASE WHEN status = 'approved' THEN now() ELSE NULL END
FROM property_rows
ON CONFLICT (id) DO UPDATE SET
    landlord_id = EXCLUDED.landlord_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    property_type = EXCLUDED.property_type,
    street_address = EXCLUDED.street_address,
    barangay = EXCLUDED.barangay,
    city = EXCLUDED.city,
    postal_code = EXCLUDED.postal_code,
    coordinates = EXCLUDED.coordinates,
    status = EXCLUDED.status,
    moderation_note = EXCLUDED.moderation_note,
    approved_by = EXCLUDED.approved_by,
    approved_at = EXCLUDED.approved_at;

WITH sample AS (
    SELECT i, md5('abangcebu-scrum144-property-' || i)::uuid AS property_id
    FROM generate_series(1, 63) AS i
)
INSERT INTO public.rental_units (id, property_id, unit_number, rental_type, monthly_rent,
    security_deposit, advance_rent, bedrooms, bathrooms, floor_area_sqm, max_occupants,
    furnished_status, is_available, available_from, minimum_lease_months)
SELECT md5('abangcebu-scrum144-unit-' || i)::uuid,
       property_id,
       'Unit 1',
       (ARRAY['entire_place','private_room','shared_room','bedspace']::public.rental_unit_type[])[((i - 1) % 4) + 1],
       (6000 + ((i * 137) % 24000))::numeric(10,2),
       5000, 0, 1, 1.0, 18.0, 2,
       (ARRAY['unfurnished','semi_furnished','fully_furnished'])[((i - 1) % 3) + 1],
       i <= 60,
       CURRENT_DATE,
       6
FROM sample
ON CONFLICT (id) DO UPDATE SET
    property_id = EXCLUDED.property_id,
    unit_number = EXCLUDED.unit_number,
    rental_type = EXCLUDED.rental_type,
    monthly_rent = EXCLUDED.monthly_rent,
    security_deposit = EXCLUDED.security_deposit,
    advance_rent = EXCLUDED.advance_rent,
    bedrooms = EXCLUDED.bedrooms,
    bathrooms = EXCLUDED.bathrooms,
    floor_area_sqm = EXCLUDED.floor_area_sqm,
    max_occupants = EXCLUDED.max_occupants,
    furnished_status = EXCLUDED.furnished_status,
    is_available = EXCLUDED.is_available,
    available_from = EXCLUDED.available_from,
    minimum_lease_months = EXCLUDED.minimum_lease_months;

COMMIT;
