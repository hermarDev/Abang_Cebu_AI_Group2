\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('fffffff0-0000-4000-8000-000000000001','{"role":"landlord"}'),
 ('fffffff0-0000-4000-8000-000000000002','{"role":"landlord"}'),
 ('fffffff0-0000-4000-8000-000000000003','{"role":"admin"}')
ON CONFLICT (id) DO NOTHING;
UPDATE public.profiles SET role='landlord', is_suspended=false WHERE id IN ('fffffff0-0000-4000-8000-000000000001','fffffff0-0000-4000-8000-000000000002');
UPDATE public.profiles SET role='admin', is_suspended=false WHERE id='fffffff0-0000-4000-8000-000000000003';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','fffffff0-0000-4000-8000-000000000001',true);
DO $$ DECLARE a uuid; p uuid; BEGIN
 a := public.save_property_draft('fffffff0-0000-4000-8000-000000000011', jsonb_build_object('property', jsonb_build_object('title','RLS me','description','A valid description for fixture.','property_type','house','street_address','S','barangay','B','city','C','latitude',10.3,'longitude',123.9,'permit_applicability','not_required','permit_not_required_confirmed','true'), 'unit', jsonb_build_object('rental_type','private_room','monthly_rent','5000','max_occupants','2')));
 p := (public.submit_property_from_draft('fffffff0-0000-4000-8000-000000000012', a, 1)->>'property_id')::uuid;
 PERFORM set_config('request.jwt.claim.sub','fffffff0-0000-4000-8000-000000000003',true);
 PERFORM public.review_property(p,'fffffff0-0000-4000-8000-000000000013','rejected','Fix it', a, 1);
 PERFORM set_config('request.jwt.claim.sub','fffffff0-0000-4000-8000-000000000001',true);
 IF (SELECT count(*) FROM public.property_submissions) <> 1 THEN RAISE EXCEPTION 'owner cannot read own submission'; END IF;
 IF (SELECT count(*) FROM public.property_reviews) <> 1 THEN RAISE EXCEPTION 'owner cannot read own review'; END IF;
 BEGIN INSERT INTO public.property_submissions(owner_id,operation_id,draft_id,expected_revision,property_id) VALUES ('fffffff0-0000-4000-8000-000000000001','fffffff0-0000-4000-8000-000000000099',a,1,p); RAISE EXCEPTION 'direct insert allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub','fffffff0-0000-4000-8000-000000000002',true);
 IF (SELECT count(*) FROM public.property_submissions) <> 0 THEN RAISE EXCEPTION 'other landlord can read submission'; END IF;
 IF (SELECT count(*) FROM public.property_reviews) <> 0 THEN RAISE EXCEPTION 'other landlord can read review'; END IF;
END $$;
ROLLBACK;
