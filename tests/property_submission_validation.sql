BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES ('aaaaaaaa-0000-4000-8000-000000000001','{"role":"landlord"}');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-0000-4000-8000-000000000001',true);
DO $$ DECLARE d uuid; payload jsonb; BEGIN
 payload := jsonb_build_object('property', jsonb_build_object('title','Test','description','A valid description for fixture.','property_type','house','street_address','Street 1','barangay','Mabolo','city','Cebu City','latitude',10.3,'longitude',123.9,'location_id','x','location_name','Cebu','location_detail','Cebu City'), 'unit', jsonb_build_object('rental_type','private_room','monthly_rent','5000','bathroom_type','private','max_occupants','2'), 'amenities', jsonb_build_array('wifi'));
 d := public.save_property_draft('bbbbbbbb-0000-4000-8000-000000000001', payload);
 BEGIN
  PERFORM public.submit_property_from_draft('cccccccc-0000-4000-8000-000000000001', d, 1);
  RAISE EXCEPTION 'missing permit applicability accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
END $$;
DO $$ DECLARE d uuid; payload jsonb; BEGIN
 payload := jsonb_build_object('property', jsonb_build_object('title','Test','description','A valid description for fixture.','street_address','Street 1','barangay','Mabolo','city','Cebu City','latitude',10.3,'longitude',123.9,'permit_applicability','not_required','permit_not_required_confirmed','true'), 'unit', jsonb_build_object('rental_type','private_room','monthly_rent','5000','max_occupants','2'), 'amenities', jsonb_build_array());
 d := public.save_property_draft('bbbbbbbb-0000-4000-8000-000000000003', payload);
 BEGIN
  PERFORM public.submit_property_from_draft('cccccccc-0000-4000-8000-000000000003', d, 1);
  RAISE EXCEPTION 'missing property type accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
END $$;
DO $$ DECLARE d uuid; payload jsonb; op uuid := 'dddddddd-0000-4000-8000-000000000001'; BEGIN
 payload := jsonb_build_object('property', jsonb_build_object('title','Test','description','A valid description for fixture.','property_type','house','street_address','Street 1','barangay','Mabolo','city','Cebu City','latitude',10.3,'longitude',123.9,'permit_applicability','required'), 'unit', jsonb_build_object('rental_type','private_room','monthly_rent','5000','max_occupants','2'), 'amenities', jsonb_build_array());
 d := public.save_property_draft('bbbbbbbb-0000-4000-8000-000000000002', payload);
 PERFORM public.prepare_property_draft_media(d, op, 'permit', 'application/pdf', 7, repeat('a',64), 'aaaaaaaa-0000-4000-8000-000000000001/' || d || '/' || op || '/' || repeat('a',64) || '.pdf', 'permit.pdf');
 PERFORM set_config('test.missing_object_draft', d::text, true);
END $$;
RESET ROLE;
UPDATE public.property_draft_media SET confirmed = true WHERE draft_id = current_setting('test.missing_object_draft')::uuid;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.submit_property_from_draft('cccccccc-0000-4000-8000-000000000002', current_setting('test.missing_object_draft')::uuid, 1);
  RAISE EXCEPTION 'missing permit object accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
END $$;
RESET ROLE;
INSERT INTO storage.buckets(id, name, public) VALUES ('property-draft-media', 'property-draft-media', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.objects(bucket_id, name)
 SELECT 'property-draft-media', object_path FROM public.property_draft_media WHERE draft_id = current_setting('test.missing_object_draft')::uuid;
SET LOCAL ROLE authenticated;
DO $$ DECLARE result jsonb; BEGIN
 result := public.submit_property_from_draft('cccccccc-0000-4000-8000-000000000002', current_setting('test.missing_object_draft')::uuid, 1);
 IF result->>'property_id' IS NULL THEN RAISE EXCEPTION 'required permit with object did not submit'; END IF;
END $$;
ROLLBACK;
