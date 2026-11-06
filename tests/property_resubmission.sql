\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('bbbbbbbb-0000-4000-8000-000000000001','{"role":"landlord"}'),
 ('bbbbbbbb-0000-4000-8000-000000000002','{"role":"admin"}')
ON CONFLICT (id) DO NOTHING;
UPDATE public.profiles SET role='landlord', is_suspended=false WHERE id='bbbbbbbb-0000-4000-8000-000000000001';
UPDATE public.profiles SET role='admin', is_suspended=false WHERE id='bbbbbbbb-0000-4000-8000-000000000002';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-0000-4000-8000-000000000001',true);
DO $$ DECLARE a uuid; p uuid; rev bigint; s jsonb; BEGIN
 a := public.save_property_draft('aaaaaaa1-0000-4000-8000-000000000009', jsonb_build_object('property', jsonb_build_object('title','Resub me','description','A valid description for fixture.','property_type','house','street_address','Street 1','barangay','Mabolo','city','Cebu City','latitude',10.3,'longitude',123.9,'permit_applicability','not_required','permit_not_required_confirmed','true'), 'unit', jsonb_build_object('rental_type','private_room','monthly_rent','5000','max_occupants','2')));
 p := (public.submit_property_from_draft('aaaaaaa1-0000-4000-8000-000000000008', a, 1)->>'property_id')::uuid;
 PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-0000-4000-8000-000000000002',true);
 PERFORM public.review_property(p,'aaaaaaa1-0000-4000-8000-000000000007','rejected','Fix the permit scan', a, 1);
 PERFORM set_config('request.jwt.claim.sub','bbbbbbbb-0000-4000-8000-000000000001',true);
 rev := public.update_property_draft(a, 'aaaaaaa2-0000-4000-8000-000000000006', 1, jsonb_build_object('property', jsonb_build_object('title','Resub me v2','description','A corrected valid description.','property_type','house','street_address','Street 2','barangay','Lahug','city','Cebu City','latitude',10.31,'longitude',123.91,'permit_applicability','not_required','permit_not_required_confirmed','true'), 'unit', jsonb_build_object('rental_type','private_room','monthly_rent','5500','max_occupants','2')));
 s := public.resubmit_rejected_property('aaaaaaa2-0000-4000-8000-000000000005', a, rev);
 IF (s->>'status') <> 'pending' THEN RAISE EXCEPTION 'resubmission not pending: %', s; END IF;
 BEGIN PERFORM public.resubmit_rejected_property('aaaaaaa2-0000-4000-8000-000000000005', a, rev); RAISE EXCEPTION 'duplicate operation accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN PERFORM public.resubmit_rejected_property('aaaaaaa9-0000-4000-8000-000000000005', a, rev); RAISE EXCEPTION 'duplicate revision accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN PERFORM public.resubmit_rejected_property('aaaaaaa8-0000-4000-8000-000000000006', a, 1); RAISE EXCEPTION 'already-submitted revision accepted'; EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.property_submissions WHERE owner_id='bbbbbbbb-0000-4000-8000-000000000001') <> 2 THEN RAISE EXCEPTION 'prior submission evidence lost'; END IF;
 IF (SELECT count(*) FROM public.properties WHERE landlord_id='bbbbbbbb-0000-4000-8000-000000000001') <> 2 THEN RAISE EXCEPTION 'resubmitted property missing'; END IF;
 IF (SELECT count(*) FROM public.property_reviews) <> 1 THEN RAISE EXCEPTION 'review evidence lost'; END IF;
 IF (SELECT count(*) FROM public.property_submissions WHERE owner_id='bbbbbbbb-0000-4000-8000-000000000001' AND superseded_by IS NOT NULL) <> 1 THEN RAISE EXCEPTION 'old revision not marked superseded'; END IF;
 IF (public.landlord_property_status('aaaaaaa2-0000-4000-8000-000000000005')->>'status') <> 'pending' THEN RAISE EXCEPTION 'status not pending'; END IF;
 IF (public.landlord_property_status('aaaaaaa1-0000-4000-8000-000000000008')->>'status') <> 'rejected' THEN RAISE EXCEPTION 'rejected status lost'; END IF;
END $$;
ROLLBACK;
