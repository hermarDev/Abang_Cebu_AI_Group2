\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data) VALUES
 ('a0000000-0000-4000-8000-000000000011','{"role":"landlord","full_name":"Owner A"}'),
 ('a0000000-0000-4000-8000-000000000012','{"role":"landlord","full_name":"Owner B"}'),
 ('a0000000-0000-4000-8000-000000000013','{"role":"renter","full_name":"Admin"}');
UPDATE public.profiles SET role='admin' WHERE id='a0000000-0000-4000-8000-000000000013';
INSERT INTO public.properties(id,landlord_id,title,description,property_type,street_address,barangay,city,coordinates,status,moderation_note) VALUES
 ('b0000000-0000-4000-8000-000000000011','a0000000-0000-4000-8000-000000000011','Property A','Description A','house','Street','Apas','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326),'rejected','internal synthetic note'),
 ('b0000000-0000-4000-8000-000000000012','a0000000-0000-4000-8000-000000000012','Property B','Description B','house','Street','Apas','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326),'rejected','foreign internal note'),
 ('b0000000-0000-4000-8000-000000000013','a0000000-0000-4000-8000-000000000011','Property C','Description C','house','Street','Apas','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326),'rejected','legacy note');
INSERT INTO public.property_drafts(id,owner_id,operation_id,payload,original_payload) VALUES
 ('c0000000-0000-4000-8000-000000000011','a0000000-0000-4000-8000-000000000011','d0000000-0000-4000-8000-000000000011','{"property":{},"unit":{}}','{"property":{},"unit":{}}'),
 ('c0000000-0000-4000-8000-000000000012','a0000000-0000-4000-8000-000000000012','d0000000-0000-4000-8000-000000000012','{"property":{},"unit":{}}','{"property":{},"unit":{}}'),
 ('c0000000-0000-4000-8000-000000000013','a0000000-0000-4000-8000-000000000011','d0000000-0000-4000-8000-000000000013','{"property":{},"unit":{}}','{"property":{},"unit":{}}');
INSERT INTO public.property_submissions(owner_id,operation_id,draft_id,expected_revision,property_id) VALUES
 ('a0000000-0000-4000-8000-000000000011','e0000000-0000-4000-8000-000000000011','c0000000-0000-4000-8000-000000000011',1,'b0000000-0000-4000-8000-000000000011'),
 ('a0000000-0000-4000-8000-000000000012','e0000000-0000-4000-8000-000000000011','c0000000-0000-4000-8000-000000000012',1,'b0000000-0000-4000-8000-000000000012'),
 ('a0000000-0000-4000-8000-000000000011','e0000000-0000-4000-8000-000000000013','c0000000-0000-4000-8000-000000000013',1,'b0000000-0000-4000-8000-000000000013');
INSERT INTO public.property_reviews(admin_id,operation_id,property_id,decision,note,submission_owner_id,submission_operation_id) VALUES
 ('a0000000-0000-4000-8000-000000000013','f0000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-000000000011','rejected','fix the permit','a0000000-0000-4000-8000-000000000011','e0000000-0000-4000-8000-000000000011'),
 ('a0000000-0000-4000-8000-000000000013','f0000000-0000-4000-8000-000000000012','b0000000-0000-4000-8000-000000000012','rejected','foreign reason','a0000000-0000-4000-8000-000000000012','e0000000-0000-4000-8000-000000000011'),
 ('a0000000-0000-4000-8000-000000000013','f0000000-0000-4000-8000-000000000013','b0000000-0000-4000-8000-000000000013','rejected','legacy reason',NULL,NULL);
UPDATE public.property_reviews r
SET submission_owner_id = s.owner_id,
    submission_operation_id = s.operation_id
FROM (
  SELECT DISTINCT ON (property_id) property_id, owner_id, operation_id
  FROM public.property_submissions
  ORDER BY property_id, created_at DESC
) s
WHERE r.property_id = s.property_id
  AND (r.submission_owner_id IS NULL OR r.submission_operation_id IS NULL);
CREATE POLICY pr37_broad_submissions ON public.property_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY pr37_broad_properties ON public.properties FOR SELECT TO authenticated USING (true);
CREATE POLICY pr37_broad_reviews ON public.property_reviews FOR SELECT TO authenticated USING (true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000011',true);
DO $$ DECLARE result jsonb; BEGIN
  IF has_column_privilege(current_user, 'public.properties', 'moderation_note', 'SELECT') THEN RAISE EXCEPTION 'internal moderation note is directly readable'; END IF;
  IF EXISTS (SELECT 1 FROM public.property_reviews WHERE note='foreign reason') THEN RAISE EXCEPTION 'foreign review exposed on owner-scoped operation collision'; END IF;
  result := public.landlord_rejection_feedback();
  IF jsonb_array_length(result) <> 2
     OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(result) x WHERE x->>'propertyId' = 'b0000000-0000-4000-8000-000000000011' AND x->>'reason' = 'fix the permit')
     OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(result) x WHERE x->>'propertyId' = 'b0000000-0000-4000-8000-000000000013' AND x->>'reason' = 'legacy reason') THEN
    RAISE EXCEPTION 'owner feedback incorrect: %',result;
  END IF;
  IF (public.landlord_property_status('e0000000-0000-4000-8000-000000000011')->>'moderationNote') <> 'fix the permit' THEN RAISE EXCEPTION 'status feedback incorrect'; END IF;
END $$;
RESET ROLE;
UPDATE public.profiles SET is_suspended=true WHERE id='a0000000-0000-4000-8000-000000000011';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.landlord_rejection_feedback() <> '[]'::jsonb THEN RAISE EXCEPTION 'suspended owner saw feedback'; END IF;
 IF public.landlord_property_status('e0000000-0000-4000-8000-000000000011') <> '{}'::jsonb THEN RAISE EXCEPTION 'suspended owner saw status'; END IF;
 IF EXISTS (SELECT 1 FROM public.property_reviews) THEN RAISE EXCEPTION 'suspended owner saw direct review'; END IF;
END $$;
ROLLBACK;
