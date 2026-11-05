\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.properties') IS NULL OR to_regclass('public.rental_units') IS NULL THEN
    RAISE EXCEPTION 'property and unit tables are required';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_class WHERE oid = 'public.properties'::regclass AND relrowsecurity)
     OR NOT EXISTS (SELECT FROM pg_class WHERE oid = 'public.rental_units'::regclass AND relrowsecurity) THEN
    RAISE EXCEPTION 'both tables must enforce RLS';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'properties' AND indexdef LIKE '%USING gist (coordinates)%') THEN
    RAISE EXCEPTION 'property coordinates require a spatial index';
  END IF;
  IF has_column_privilege('authenticated', 'public.properties', 'moderation_note', 'SELECT') THEN
    RAISE EXCEPTION 'internal moderation notes must not be visible to landlords';
  END IF;
  IF has_any_column_privilege('anon', 'public.properties', 'SELECT') OR
     has_any_column_privilege('anon', 'public.rental_units', 'SELECT') OR
     has_any_column_privilege('authenticated', 'public.properties', 'INSERT,UPDATE') OR
     has_any_column_privilege('authenticated', 'public.rental_units', 'INSERT,UPDATE') OR
     has_table_privilege('authenticated', 'public.properties', 'DELETE') OR
     has_table_privilege('authenticated', 'public.rental_units', 'DELETE') THEN
    RAISE EXCEPTION 'anonymous reads and client writes must be denied';
  END IF;
  IF has_table_privilege('anon', 'public.properties', 'SELECT') OR has_table_privilege('authenticated', 'public.properties', 'INSERT')
     OR has_table_privilege('authenticated', 'public.rental_units', 'INSERT') THEN
    RAISE EXCEPTION 'property and unit writes must not be exposed directly';
  END IF;
END $$;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('00000000-0000-0000-0000-000000000001', '{"role":"landlord","full_name":"Owner A"}'),
 ('00000000-0000-0000-0000-000000000002', '{"role":"landlord","full_name":"Owner B"}'),
 ('00000000-0000-0000-0000-000000000003', '{"role":"landlord","full_name":"Suspended"}');
UPDATE public.profiles SET is_suspended = true WHERE id = '00000000-0000-0000-0000-000000000003';
INSERT INTO public.properties(id, landlord_id, title, description, property_type, street_address, barangay, city, coordinates)
VALUES ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Test property','Test description','house','Street','Apas','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326)),
 ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003','Suspended property','Test description','house','Street','Apas','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326));
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.properties WHERE latitude = 10.3 AND longitude = 123.9
    AND coordinates OPERATOR(extensions.&&) extensions.ST_MakeEnvelope(123.8,10.2,124,10.4,4326)) THEN
    RAISE EXCEPTION 'generated coordinates or spatial query are incorrect';
  END IF;
END $$;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.properties(landlord_id,title,description,property_type,street_address,barangay,city,coordinates)
      VALUES ('00000000-0000-0000-0000-000000000001','Invalid','Invalid','house','Street','Apas','Cebu City',extensions.ST_GeomFromText('POINT EMPTY',4326));
    RAISE EXCEPTION 'empty location accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.properties(landlord_id,title,description,property_type,street_address,barangay,city,coordinates)
      VALUES ('00000000-0000-0000-0000-000000000001','Invalid','Invalid','house','Street','Apas','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(181,10),4326));
    RAISE EXCEPTION 'out-of-range location accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
INSERT INTO public.rental_units(id, property_id, rental_type, monthly_rent)
VALUES ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','private_room',5000),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003','private_room',5000);
UPDATE public.properties SET updated_at = '2000-01-01' WHERE id = '10000000-0000-0000-0000-000000000001';
UPDATE public.rental_units SET updated_at = '2000-01-01' WHERE id = '20000000-0000-0000-0000-000000000001';
DO $$ BEGIN
  IF (SELECT updated_at FROM public.properties WHERE id = '10000000-0000-0000-0000-000000000001') <> now()
     OR (SELECT updated_at FROM public.rental_units WHERE id = '20000000-0000-0000-0000-000000000001') <> now() THEN
    RAISE EXCEPTION 'updates must refresh timestamps';
  END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.properties) <> 1 OR (SELECT count(*) FROM public.rental_units) <> 1 THEN RAISE EXCEPTION 'owner must read own property and unit'; END IF;
END $$;
DO $$ BEGIN
  BEGIN
    PERFORM moderation_note FROM public.properties LIMIT 1;
    RAISE EXCEPTION 'owner can read internal moderation note';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.rental_units(property_id, rental_type, monthly_rent) VALUES ('10000000-0000-0000-0000-000000000001','private_room',5000);
    RAISE EXCEPTION 'client can insert units';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.properties SET title = 'unapproved change' WHERE id = '10000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'client can update properties';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.rental_units WHERE id = '20000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'client can delete units';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.properties) <> 0 OR (SELECT count(*) FROM public.rental_units) <> 0 THEN RAISE EXCEPTION 'other owner must not read property or unit'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.properties) <> 0 OR (SELECT count(*) FROM public.rental_units) <> 0 THEN RAISE EXCEPTION 'suspended owner must not read'; END IF;
END $$;
ROLLBACK;
