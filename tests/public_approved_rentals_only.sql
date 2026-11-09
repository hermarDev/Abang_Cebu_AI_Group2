\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('a0000000-0000-4000-8000-000000000021','{"role":"landlord","full_name":"Active Owner"}'),
 ('a0000000-0000-4000-8000-000000000022','{"role":"landlord","full_name":"Suspended Owner"}');
UPDATE public.profiles SET is_suspended = true WHERE id = 'a0000000-0000-4000-8000-000000000022';
INSERT INTO public.properties(id,landlord_id,title,description,property_type,street_address,barangay,city,coordinates,status)
SELECT ('b0000000-0000-4000-8000-0000000000' || n)::uuid, owner::uuid, 'Property ' || label, 'Description', 'house', 'Street', 'Apas', 'Cebu City',
  extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326), status
FROM (VALUES
 ('21','a0000000-0000-4000-8000-000000000021','approved','approved'),
 ('22','a0000000-0000-4000-8000-000000000021','pending','pending'),
 ('23','a0000000-0000-4000-8000-000000000021','rejected','rejected'),
 ('24','a0000000-0000-4000-8000-000000000021','archived','archived'),
 ('25','a0000000-0000-4000-8000-000000000022','suspended-owner','approved')
) v(n, owner, label, status);
INSERT INTO public.rental_units(property_id, rental_type, monthly_rent)
SELECT id, 'private_room', 5000 FROM public.properties WHERE id::text LIKE 'b0000000-0000-4000-8000-0000000000%';
SET LOCAL ROLE anon;
DO $$ DECLARE ids uuid[]; BEGIN
  SELECT array_agg(id) INTO ids FROM public.get_public_submitted_rentals()
  WHERE id::text LIKE 'b0000000-0000-4000-8000-0000000000%';
  IF ids IS DISTINCT FROM ARRAY['b0000000-0000-4000-8000-000000000021'::uuid, 'b0000000-0000-4000-8000-000000000022'::uuid] THEN
    RAISE EXCEPTION 'public RPC must return approved and pending active-owner properties, got %', ids;
  END IF;
END $$;
ROLLBACK;
