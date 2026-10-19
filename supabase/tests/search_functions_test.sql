-- Local pgTAP verification for SCRUM-143 PostGIS search RPCs.
-- Run only against the local Supabase database: supabase test db --local.
BEGIN;
SELECT plan(21);

SELECT has_function('public','search_listings_in_viewport',ARRAY['double precision','double precision','double precision','double precision','numeric','numeric','text[]','text[]','integer'],'viewport RPC is installed');
SELECT has_function('public','search_listings_near_landmark',ARRAY['double precision','double precision','double precision','numeric','numeric','text[]','text[]','integer'],'landmark radius RPC is installed');
SELECT ok((SELECT prosecdef IS FALSE FROM pg_proc WHERE oid='public.search_listings_in_viewport(double precision,double precision,double precision,double precision,numeric,numeric,text[],text[],integer)'::regprocedure),'viewport RPC runs as invoker');
SELECT ok((SELECT prosecdef IS FALSE FROM pg_proc WHERE oid='public.search_listings_near_landmark(double precision,double precision,double precision,numeric,numeric,text[],text[],integer)'::regprocedure),'landmark RPC runs as invoker');
SELECT ok(
    NOT EXISTS (
        SELECT 1
        FROM aclexplode((SELECT proacl FROM pg_proc WHERE oid='public.search_listings_in_viewport(double precision,double precision,double precision,double precision,numeric,numeric,text[],text[],integer)'::regprocedure)) AS acl
        WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
    ),
    'viewport RPC is not executable by PUBLIC'
);
SELECT throws_ok($$SELECT * FROM public.search_listings_in_viewport(123.9,10.2,123.8,10.4)$$,'22023','Invalid viewport bounds','inverted viewport bounds are rejected');
SELECT throws_ok($$SELECT * FROM public.search_listings_in_viewport(123.8,10.2,123.9,10.4,-1,NULL)$$,'22023','Invalid rent range','negative minimum rent is rejected');
SELECT throws_ok($$SELECT * FROM public.search_listings_in_viewport(123.8,10.2,123.9,10.4,20000,10000)$$,'22023','Invalid rent range','inverted rent range is rejected');
SELECT throws_ok($$SELECT * FROM public.search_listings_in_viewport(123.8,10.2,123.9,10.4,NULL,NULL,NULL,NULL,501)$$,'22023','Limit must be between 1 and 500','oversized limit is rejected');
SELECT throws_ok($$SELECT * FROM public.search_listings_near_landmark(123.9,10.3,50001)$$,'22023','Invalid landmark coordinates or radius','radius over 50 km is rejected');
SELECT throws_ok($$SELECT * FROM public.search_listings_near_landmark(123.9,10.3,0)$$,'22023','Invalid landmark coordinates or radius','zero radius is rejected');
SELECT throws_ok($$SELECT * FROM public.search_listings_in_viewport(123.8,10.2,123.9,10.4,NULL,NULL,NULL,NULL,0)$$,'22023','Limit must be between 1 and 500','zero result limit is rejected');

INSERT INTO auth.users (id,aud,role,email,raw_user_meta_data) VALUES
 ('14300000-0000-4000-8000-000000000001','authenticated','authenticated','143-landlord@example.invalid','{"role":"landlord","full_name":"Synthetic Landlord"}'::jsonb),
 ('14300000-0000-4000-8000-000000000002','authenticated','authenticated','143-suspended@example.invalid','{"role":"landlord","full_name":"Suspended Landlord"}'::jsonb);
UPDATE public.profiles SET is_suspended = TRUE WHERE id = '14300000-0000-4000-8000-000000000002';
INSERT INTO public.properties (id,landlord_id,title,description,property_type,street_address,barangay,city,coordinates,status) VALUES
 ('14300000-0000-4000-8000-000000000011','14300000-0000-4000-8000-000000000001','Approved Synthetic','Fixture','apartment','1 Test St','Lahug','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(123.9065,10.3298),4326)::extensions.geography,'approved'),
 ('14300000-0000-4000-8000-000000000012','14300000-0000-4000-8000-000000000001','Pending Synthetic','Fixture','apartment','2 Test St','Lahug','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(123.9066,10.3299),4326)::extensions.geography,'pending'),
 ('14300000-0000-4000-8000-000000000013','14300000-0000-4000-8000-000000000001','Outside Synthetic','Fixture','apartment','3 Test St','Lahug','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(124.5,10.8),4326)::extensions.geography,'approved'),
 ('14300000-0000-4000-8000-000000000019','14300000-0000-4000-8000-000000000002','Suspended Approved','Fixture','apartment','9 Test St','Lahug','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(123.9067,10.3297),4326)::extensions.geography,'approved');
INSERT INTO public.rental_units (id,property_id,rental_type,monthly_rent,is_available) VALUES
 ('14300000-0000-4000-8000-000000000021','14300000-0000-4000-8000-000000000011','private_room',12000,true),
 ('14300000-0000-4000-8000-000000000022','14300000-0000-4000-8000-000000000012','private_room',9000,true),
 ('14300000-0000-4000-8000-000000000023','14300000-0000-4000-8000-000000000013','private_room',8000,true),
 ('14300000-0000-4000-8000-000000000024','14300000-0000-4000-8000-000000000011','bedspace',7000,false),
 ('14300000-0000-4000-8000-000000000029','14300000-0000-4000-8000-000000000019','private_room',11000,true);
INSERT INTO public.properties (id,landlord_id,title,description,property_type,street_address,barangay,city,coordinates,status) VALUES
 ('14300000-0000-4000-8000-000000000014','14300000-0000-4000-8000-000000000001','House Synthetic','Fixture','house','4 Test St','Lahug','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(123.9067,10.3299),4326)::extensions.geography,'approved'),
 ('14300000-0000-4000-8000-000000000015','14300000-0000-4000-8000-000000000001','Out-of-range Synthetic','Fixture','apartment','5 Test St','Lahug','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(123.9068,10.3299),4326)::extensions.geography,'approved');
INSERT INTO public.rental_units (id,property_id,rental_type,monthly_rent,is_available) VALUES
 ('14300000-0000-4000-8000-000000000026','14300000-0000-4000-8000-000000000014','entire_place',22000,true),
 ('14300000-0000-4000-8000-000000000027','14300000-0000-4000-8000-000000000015','entire_place',30000,true);
INSERT INTO public.amenities (name,category) VALUES ('wifi','utility'),('laundry','utility'),('elevator','utility');
INSERT INTO public.property_amenities (property_id,amenity_id)
 SELECT '14300000-0000-4000-8000-000000000011',id FROM public.amenities WHERE name='laundry';
INSERT INTO public.property_amenities (property_id,amenity_id)
 SELECT '14300000-0000-4000-8000-000000000011',id FROM public.amenities WHERE name='wifi';
INSERT INTO public.property_amenities (property_id,amenity_id)
 SELECT '14300000-0000-4000-8000-000000000014',id FROM public.amenities WHERE name='wifi';

SELECT results_eq(
 $$SELECT property_id::text FROM public.search_listings_in_viewport(123.88,10.30,123.93,10.36,NULL,NULL,ARRAY['house'])$$,
 $$VALUES ('14300000-0000-4000-8000-000000000014')$$,
 'property-type filter selects only matching property types'
);
SELECT results_eq(
 $$SELECT property_id::text FROM public.search_listings_in_viewport(123.88,10.30,123.93,10.36,NULL,NULL,NULL,ARRAY['wifi','laundry'])$$,
 $$VALUES ('14300000-0000-4000-8000-000000000011')$$,
 'amenity filter requires every requested amenity'
);
SELECT is((SELECT count(*)::integer FROM public.search_listings_in_viewport(123.88,10.30,123.93,10.36,NULL,NULL,NULL,ARRAY['wifi','laundry','elevator'])),0,'missing any requested amenity excludes the property');
SELECT results_eq(
 $$SELECT property_id::text,cluster_count::text FROM public.search_listings_in_viewport(123.88,10.30,123.93,10.36,10000,15000)$$,
 $$VALUES ('14300000-0000-4000-8000-000000000011','1')$$,
 'cluster_count reflects rent-filtered properties only'
);
SELECT results_eq(
 $$SELECT property_id::text FROM public.search_listings_in_viewport(123.88,10.30,123.93,10.36,NULL,NULL,NULL,ARRAY['wifi'])$$,
 $$VALUES ('14300000-0000-4000-8000-000000000011'),('14300000-0000-4000-8000-000000000014')$$,
 'single amenity matches any approved property that has it'
);

SELECT is(
    (SELECT count(*)::integer FROM public.search_listings_in_viewport(123.88,10.30,123.93,10.36) WHERE property_id = '14300000-0000-4000-8000-000000000019'),
    0,
    'suspended landlord property is excluded from viewport search (TC-RBAC-026)'
);

SELECT is(
    (SELECT count(*)::integer FROM public.search_listings_near_landmark(123.9067,10.3297,1000) WHERE property_id = '14300000-0000-4000-8000-000000000019'),
    0,
    'suspended landlord property is excluded from landmark search (TC-RBAC-026)'
);

-- More than the maximum page size: total matching clusters must stay unbounded by p_limit.
-- Only the main 19 pgTAP assertions count here; earlier draft plan was stale.
DO $$
DECLARE i integer; property_id uuid; longitude double precision; latitude double precision;
BEGIN
 FOR i IN 1..503 LOOP
  property_id := extensions.uuid_generate_v4();
  longitude := 123.905 + ((i % 20)::double precision * 0.0001);
  latitude := 10.328 + (((i / 20) % 20)::double precision * 0.0001);
  INSERT INTO public.properties(id,landlord_id,title,description,property_type,street_address,barangay,city,coordinates,status)
   VALUES (property_id,'14300000-0000-4000-8000-000000000001','Cluster Fixture '||i,'Fixture','apartment','Cluster St','Lahug','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(longitude,latitude),4326)::extensions.geography,'approved');
  INSERT INTO public.rental_units(id,property_id,rental_type,monthly_rent,is_available)
   VALUES (extensions.uuid_generate_v4(),property_id,'private_room',10000,true);
 END LOOP;
END $$;
SELECT is((SELECT count(*)::integer FROM public.search_listings_in_viewport(123.88,10.30,123.93,10.36,NULL,NULL,NULL,NULL,500)),500,'viewport caps returned rows at p_limit');
SELECT is((SELECT min(cluster_count)::integer FROM public.search_listings_in_viewport(123.88,10.30,123.93,10.36,NULL,NULL,NULL,NULL,500)),506,'cluster_count reports all matching properties beyond p_limit');

SELECT * FROM finish();
ROLLBACK;
