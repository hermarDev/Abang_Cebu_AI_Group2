\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('cccccccc-0000-4000-8000-000000000001','{"role":"landlord"}'),
 ('cccccccc-0000-4000-8000-000000000002','{"role":"admin"}')
ON CONFLICT (id) DO NOTHING;
UPDATE public.profiles SET role = 'admin', is_suspended = false WHERE id = 'cccccccc-0000-4000-8000-000000000002';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','cccccccc-0000-4000-8000-000000000001',true);
DO $$ DECLARE a uuid; p uuid; r jsonb; BEGIN
 a := public.save_property_draft('dddddddd-0000-4000-8000-000000000001', jsonb_build_object('property', jsonb_build_object('title','Review me','description','A valid description for fixture.','property_type','house','street_address','Street 1','barangay','Mabolo','city','Cebu City','latitude',10.3,'longitude',123.9,'location_id','x','location_name','Cebu','location_detail','Cebu City','permit_applicability','not_required','permit_not_required_confirmed','true'), 'unit', jsonb_build_object('rental_type','private_room','monthly_rent','5000','bathroom_type','private','max_occupants','2'), 'amenities', jsonb_build_array('wifi')));
 SET LOCAL ROLE postgres;
 p := (public.submit_property_from_draft('cccccccc-0000-4000-8000-000000000001', a, 1)->>'property_id')::uuid;
 SET LOCAL ROLE authenticated;
 PERFORM set_config('request.jwt.claim.sub','cccccccc-0000-4000-8000-000000000002',true);
 r := public.review_property(p,'dddddddd-0000-4000-8000-000000000001','rejected','Fix permit image', a, 1);
 IF (r->>'status') <> 'rejected' THEN RAISE EXCEPTION 'reject failed'; END IF;
 r := public.review_property(p,'dddddddd-0000-4000-8000-000000000001','rejected','Fix permit image', a, 1);
 IF (SELECT status FROM public.properties WHERE id=p) <> 'rejected' THEN RAISE EXCEPTION 'review status not retained'; END IF;
 BEGIN PERFORM public.review_property(p,'eeeeeeee-0000-4000-8000-000000000001','approved',NULL,a,1); RAISE EXCEPTION 'stale decision accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN PERFORM public.review_property(p,'ffffffff-0000-4000-8000-000000000001','approved',NULL,a,2); RAISE EXCEPTION 'wrong revision accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.property_submissions WHERE draft_id = (SELECT id FROM public.property_drafts WHERE owner_id='cccccccc-0000-4000-8000-000000000001' ORDER BY created_at DESC LIMIT 1) AND snapshot_payload IS NOT NULL AND snapshot_media IS NOT NULL) <> 1 THEN RAISE EXCEPTION 'submission snapshot missing'; END IF;
 IF (SELECT count(*) FROM public.property_reviews WHERE submission_owner_id = 'cccccccc-0000-4000-8000-000000000001' AND submission_operation_id = 'cccccccc-0000-4000-8000-000000000001') <> 1 THEN RAISE EXCEPTION 'review not bound to submission revision'; END IF;
END $$;
ROLLBACK;
