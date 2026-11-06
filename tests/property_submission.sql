\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES ('aaaaaaaa-0000-4000-8000-000000000001','{"role":"landlord"}');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000001',true);
DO $$ DECLARE a uuid; p jsonb; r jsonb; BEGIN
 p := jsonb_build_object('property', jsonb_build_object('title','Test','description','A valid description for fixture.','property_type','house','street_address','Street 1','barangay','Mabolo','city','Cebu City','latitude',10.3,'longitude',123.9,'location_id','x','location_name','Cebu','location_detail','Cebu City','permit_applicability','not_required','permit_not_required_confirmed','true'), 'unit', jsonb_build_object('rental_type','private_room','monthly_rent','5000','bathroom_type','private','max_occupants','2'), 'amenities', jsonb_build_array('wifi'));
 a := public.save_property_draft('bbbbbbbb-0000-4000-8000-000000000001', p);
 r := public.submit_property_from_draft('cccccccc-0000-4000-8000-000000000001', a, 1);
 IF (r->>'property_id') IS NULL THEN RAISE EXCEPTION 'submission missing property'; END IF;
 r := public.submit_property_from_draft('cccccccc-0000-4000-8000-000000000001', a, 1);
 IF (SELECT count(*) FROM public.properties) <> 1 OR (SELECT count(*) FROM public.rental_units) <> 1 THEN RAISE EXCEPTION 'duplicate submission'; END IF;
 BEGIN PERFORM public.submit_property_from_draft('cccccccc-0000-4000-8000-000000000001', a, 2); RAISE EXCEPTION 'changed operation intent accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN PERFORM public.submit_property_from_draft('dddddddd-0000-4000-8000-000000000001', a, 1); RAISE EXCEPTION 'duplicate draft submission accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN PERFORM public.submit_property_from_draft('eeeeeeee-0000-4000-8000-000000000001', a, 2); RAISE EXCEPTION 'stale revision accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;
ROLLBACK;
