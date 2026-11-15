-- Additive FVO contract: site-visit-only writes with neutral proof kind.
-- Historical method and proof values remain readable; only new writes are constrained.
CREATE OR REPLACE FUNCTION public.verifier_submit_verification(
  p_property_id uuid, p_operation_id uuid, p_submission_draft_id uuid, p_submission_expected_revision bigint,
  p_status text, p_method text, p_notes text, p_proof jsonb DEFAULT '[]'::jsonb,
  p_proxy_name text DEFAULT NULL, p_proxy_relationship text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_submission public.property_submissions%ROWTYPE;
  v_existing public.property_field_verifications%ROWTYPE;
  v_proof jsonb := COALESCE(p_proof, '[]'::jsonb);
  v_proxy_name text := NULLIF(pg_catalog.btrim(COALESCE(p_proxy_name, '')), '');
  v_proxy_relationship text := NULLIF(pg_catalog.btrim(COALESCE(p_proxy_relationship, '')), '');
  v_proof_elem jsonb;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND p.role::text IN ('verification_officer','admin') AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active verifier or admin required' USING ERRCODE = '42501';
  END IF;
  IF p_property_id IS NULL OR p_operation_id IS NULL OR p_submission_draft_id IS NULL OR p_submission_expected_revision IS NULL OR p_submission_expected_revision < 1
     OR p_status IS NULL OR p_status NOT IN ('verified','flagged') OR p_method IS NULL OR p_method <> 'site_visit'
     OR length(pg_catalog.btrim(COALESCE(p_notes,''))) NOT BETWEEN 5 AND 2000
     OR pg_catalog.jsonb_typeof(v_proof) <> 'array' OR pg_catalog.octet_length(v_proof::text) > 32768
     OR ((v_proxy_name IS NOT NULL AND v_proxy_relationship IS NULL) OR (v_proxy_relationship IS NOT NULL AND v_proxy_name IS NULL)
         OR (v_proxy_name IS NOT NULL AND length(v_proxy_name) > 200) OR (v_proxy_relationship IS NOT NULL AND length(v_proxy_relationship) > 200)) THEN
    RAISE EXCEPTION 'invalid verification' USING ERRCODE = '22023';
  END IF;

  IF p_status = 'verified' AND pg_catalog.jsonb_array_length(v_proof) < 1 THEN
    RAISE EXCEPTION 'verification requires at least one proof item' USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.jsonb_array_length(v_proof) > 0 THEN
    FOR v_proof_elem IN SELECT * FROM pg_catalog.jsonb_array_elements(v_proof) LOOP
      IF pg_catalog.jsonb_typeof(v_proof_elem) <> 'object'
         OR v_proof_elem->>'kind' IS DISTINCT FROM 'proof'
         OR v_proof_elem->>'object_path' IS NULL
         OR v_proof_elem->>'object_path' !~ '^[0-9a-f-]+/[0-9a-f-]+/[0-9a-f-]+/[0-9a-f]{64}\.(jpg|png|webp|pdf)$'
         OR pg_catalog.split_part(v_proof_elem->>'object_path', '/', 2) <> p_property_id::text
         OR NOT EXISTS (
           SELECT 1 FROM storage.objects o
           WHERE o.bucket_id = 'field-verification-media' AND o.name = v_proof_elem->>'object_path'
         ) THEN
        RAISE EXCEPTION 'invalid verification proof object' USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('field-verification:' || v_actor::text || ':' || p_operation_id::text, 0));
  SELECT * INTO v_existing FROM public.property_field_verifications WHERE officer_id = v_actor AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_existing.property_id IS DISTINCT FROM p_property_id OR v_existing.draft_id IS DISTINCT FROM p_submission_draft_id
      OR v_existing.expected_revision IS DISTINCT FROM p_submission_expected_revision OR v_existing.status IS DISTINCT FROM p_status
      OR v_existing.method IS DISTINCT FROM p_method OR v_existing.notes IS DISTINCT FROM pg_catalog.btrim(p_notes)
      OR v_existing.proof IS DISTINCT FROM v_proof OR v_existing.proxy_name IS DISTINCT FROM v_proxy_name
      OR v_existing.proxy_relationship IS DISTINCT FROM v_proxy_relationship THEN
      RAISE EXCEPTION 'operation already used for different verification' USING ERRCODE = '23505';
    END IF;
    RETURN pg_catalog.jsonb_build_object('propertyId',p_property_id,'status',v_existing.status,'replayed',true);
  END IF;

  SELECT * INTO v_submission FROM public.property_submissions s
    WHERE s.property_id = p_property_id AND s.draft_id = p_submission_draft_id AND s.expected_revision = p_submission_expected_revision
      AND s.superseded_by IS NULL AND s.review_status = 'pending'
    ORDER BY s.created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'submission revision changed or unavailable' USING ERRCODE = '40001'; END IF;

  UPDATE public.property_submissions SET field_verification_status = p_status, field_verified_by = v_actor,
    field_verified_at = pg_catalog.now(), field_verification_method = p_method, field_verification_notes = pg_catalog.btrim(p_notes),
    field_verification_proof = v_proof, field_verification_proxy_name = v_proxy_name, field_verification_proxy_relationship = v_proxy_relationship
    WHERE owner_id = v_submission.owner_id AND operation_id = v_submission.operation_id;

  INSERT INTO public.property_field_verifications(officer_id,operation_id,submission_owner_id,submission_operation_id,property_id,draft_id,expected_revision,status,method,notes,proof,proxy_name,proxy_relationship)
    VALUES(v_actor,p_operation_id,v_submission.owner_id,v_submission.operation_id,p_property_id,p_submission_draft_id,p_submission_expected_revision,p_status,p_method,pg_catalog.btrim(p_notes),v_proof,v_proxy_name,v_proxy_relationship);

  INSERT INTO public.admin_audit_logs(admin_id, operation_id, target_type, target_id, action_type, previous_state, new_state, reason)
    VALUES (v_actor, p_operation_id, 'property', p_property_id,
      CASE WHEN p_status = 'verified' THEN 'property_field_verified' ELSE 'property_field_flagged' END,
      pg_catalog.jsonb_build_object('field_verification_status', v_submission.field_verification_status),
      pg_catalog.jsonb_build_object('field_verification_status', p_status, 'method', p_method, 'draft_id', p_submission_draft_id, 'revision', p_submission_expected_revision),
      CASE WHEN p_status = 'verified' THEN 'Field verification completed' ELSE 'Field verification flagged issues' END);

  RETURN pg_catalog.jsonb_build_object('propertyId',p_property_id,'status',p_status,'replayed',false);
END;
$$;

REVOKE ALL ON FUNCTION public.verifier_submit_verification(uuid,uuid,uuid,bigint,text,text,text,jsonb,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verifier_submit_verification(uuid,uuid,uuid,bigint,text,text,text,jsonb,text,text) TO authenticated;
