BEGIN;

-- ============================================================================
-- 1. Field Verification Schema & Storage
-- ============================================================================

ALTER TABLE public.property_submissions
  ADD COLUMN IF NOT EXISTS field_verification_status text NOT NULL DEFAULT 'pending_verification' CHECK (field_verification_status IN ('pending_verification','verified','flagged')),
  ADD COLUMN IF NOT EXISTS field_verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS field_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS field_verification_method text CHECK (field_verification_method IN ('site_visit','video_call','proxy_meeting')),
  ADD COLUMN IF NOT EXISTS field_verification_notes text,
  ADD COLUMN IF NOT EXISTS field_verification_proof jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (pg_catalog.jsonb_typeof(field_verification_proof) = 'array'),
  ADD COLUMN IF NOT EXISTS field_verification_proxy_name text,
  ADD COLUMN IF NOT EXISTS field_verification_proxy_relationship text;

-- Preserve already-approved submissions as verified
UPDATE public.property_submissions SET field_verification_status = 'verified' WHERE review_status = 'approved';

-- Extend admin_audit_logs action_type constraint
DO $$
DECLARE
  v_con record;
BEGIN
  FOR v_con IN
    SELECT c.conname
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class r ON r.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public' AND r.relname = 'admin_audit_logs' AND c.contype = 'c'
      AND pg_catalog.pg_get_constraintdef(c.oid) ILIKE '%action_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.admin_audit_logs DROP CONSTRAINT %I', v_con.conname);
  END LOOP;

  ALTER TABLE public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_action_type_check CHECK (action_type IN (
      'property_approved', 'property_rejected', 'property_unpublished', 'property_restored',
      'account_suspended', 'account_reinstated', 'report_resolved', 'report_dismissed',
      'report_evidence_viewed', 'property_location_corrected', 'support_ticket_updated',
      'staff_account_created', 'property_field_verified', 'property_field_flagged'
    ));
END $$;

CREATE TABLE IF NOT EXISTS public.property_field_verifications (
  officer_id uuid NOT NULL REFERENCES public.profiles(id),
  operation_id uuid NOT NULL,
  submission_owner_id uuid NOT NULL,
  submission_operation_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id),
  draft_id uuid NOT NULL,
  expected_revision bigint NOT NULL,
  status text NOT NULL CHECK (status IN ('verified','flagged')),
  method text NOT NULL CHECK (method IN ('site_visit','video_call','proxy_meeting')),
  notes text NOT NULL,
  proof jsonb NOT NULL,
  proxy_name text,
  proxy_relationship text,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (officer_id, operation_id),
  FOREIGN KEY (submission_owner_id, submission_operation_id) REFERENCES public.property_submissions(owner_id, operation_id)
);
ALTER TABLE public.property_field_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_field_verifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.property_field_verifications TO authenticated;

DROP POLICY IF EXISTS field_verifications_staff_read ON public.property_field_verifications;
CREATE POLICY field_verifications_staff_read ON public.property_field_verifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('verification_officer','admin') AND NOT p.is_suspended));

-- Dedicated field verification storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('field-verification-media', 'field-verification-media', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS field_verification_media_staff_read ON storage.objects;
CREATE POLICY field_verification_media_staff_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'field-verification-media' AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('verification_officer','admin') AND NOT p.is_suspended
  ));

DROP POLICY IF EXISTS field_verification_media_staff_insert ON storage.objects;
CREATE POLICY field_verification_media_staff_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'field-verification-media' AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('verification_officer','admin') AND NOT p.is_suspended
  ));

-- Verifier submission RPC
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
  v_proof_elem jsonb;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND p.role::text IN ('verification_officer','admin') AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active verifier or admin required' USING ERRCODE = '42501';
  END IF;
  IF p_property_id IS NULL OR p_operation_id IS NULL OR p_submission_draft_id IS NULL OR p_submission_expected_revision IS NULL OR p_submission_expected_revision < 1
     OR p_status IS NULL OR p_status NOT IN ('verified','flagged') OR p_method IS NULL OR p_method NOT IN ('site_visit','video_call','proxy_meeting')
     OR length(pg_catalog.btrim(COALESCE(p_notes,''))) NOT BETWEEN 5 AND 2000
     OR pg_catalog.jsonb_typeof(v_proof) <> 'array' OR pg_catalog.octet_length(v_proof::text) > 32768
     OR (p_method = 'proxy_meeting' AND (NULLIF(pg_catalog.btrim(p_proxy_name),'') IS NULL OR NULLIF(pg_catalog.btrim(p_proxy_relationship),'') IS NULL)) THEN
    RAISE EXCEPTION 'invalid verification' USING ERRCODE = '22023';
  END IF;

  -- Verification requires proof objects with valid kind and storage paths
  IF p_status = 'verified' THEN
    IF pg_catalog.jsonb_array_length(v_proof) < 1 THEN
      RAISE EXCEPTION 'verification requires at least one proof item' USING ERRCODE = '22023';
    END IF;
    FOR v_proof_elem IN SELECT * FROM pg_catalog.jsonb_array_elements(v_proof) LOOP
      IF pg_catalog.jsonb_typeof(v_proof_elem) <> 'object'
         OR v_proof_elem->>'kind' IS NULL OR v_proof_elem->>'kind' NOT IN ('photo','document','meeting_minutes')
         OR v_proof_elem->>'object_path' IS NULL
         OR v_proof_elem->>'object_path' !~ '^[0-9a-f-]+/[0-9a-f-]+/[0-9a-f-]+/[0-9a-f]{64}\.(jpg|png|webp|pdf)$' THEN
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
      OR v_existing.proof IS DISTINCT FROM v_proof OR v_existing.proxy_name IS DISTINCT FROM p_proxy_name
      OR v_existing.proxy_relationship IS DISTINCT FROM p_proxy_relationship THEN
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
    field_verification_proof = v_proof, field_verification_proxy_name = p_proxy_name, field_verification_proxy_relationship = p_proxy_relationship
    WHERE owner_id = v_submission.owner_id AND operation_id = v_submission.operation_id;

  INSERT INTO public.property_field_verifications(officer_id,operation_id,submission_owner_id,submission_operation_id,property_id,draft_id,expected_revision,status,method,notes,proof,proxy_name,proxy_relationship)
    VALUES(v_actor,p_operation_id,v_submission.owner_id,v_submission.operation_id,p_property_id,p_submission_draft_id,p_submission_expected_revision,p_status,p_method,pg_catalog.btrim(p_notes),v_proof,p_proxy_name,p_proxy_relationship);

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

-- Verifier queue list RPC
CREATE OR REPLACE FUNCTION public.verifier_list_queue(
  p_status text DEFAULT NULL, p_search text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_search text := lower(NULLIF(btrim(p_search), ''));
  v_result jsonb;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND p.role::text IN ('verification_officer','admin') AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active verifier or admin required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(pg_catalog.jsonb_agg(t.j ORDER BY t.submission_created_at DESC, t.id ASC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT s.created_at AS submission_created_at, p.id, pg_catalog.jsonb_build_object(
      'id', p.id,
      'title', p.title,
      'description', p.description,
      'propertyType', p.property_type,
      'streetAddress', p.street_address,
      'barangay', p.barangay,
      'city', p.city,
      'latitude', p.latitude,
      'longitude', p.longitude,
      'landlordId', p.landlord_id,
      'landlordName', owner.full_name,
      'landlordPhone', owner.phone_number,
      'submissionDraftId', s.draft_id,
      'submissionExpectedRevision', s.expected_revision,
      'submissionOperationId', s.operation_id,
      'submissionCreatedAt', s.created_at,
      'reviewStatus', s.review_status,
      'fieldVerificationStatus', s.field_verification_status,
      'fieldVerifiedBy', s.field_verified_by,
      'fieldVerifiedAt', s.field_verified_at,
      'fieldVerificationMethod', s.field_verification_method,
      'fieldVerificationNotes', s.field_verification_notes,
      'fieldVerificationProof', s.field_verification_proof,
      'fieldVerificationProxyName', s.field_verification_proxy_name,
      'fieldVerificationProxyRelationship', s.field_verification_proxy_relationship
    ) AS j
    FROM public.properties p
    JOIN public.profiles owner ON owner.id = p.landlord_id
    JOIN LATERAL (
      SELECT s.* FROM public.property_submissions s
      WHERE s.property_id = p.id AND s.superseded_by IS NULL AND s.review_status = 'pending'
      ORDER BY s.created_at DESC LIMIT 1
    ) s ON true
    WHERE (p_status IS NULL OR p_status = 'all' OR s.field_verification_status = p_status)
      AND (v_search IS NULL OR pg_catalog.strpos(lower(p.title || ' ' || p.street_address || ' ' || p.barangay || ' ' || p.city || ' ' || COALESCE(owner.full_name, '')), v_search) > 0)
    ORDER BY s.created_at DESC, p.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100) OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) t;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.verifier_list_queue(text,text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verifier_list_queue(text,text,integer,integer) TO authenticated;

-- Field verification trigger on review approval
CREATE OR REPLACE FUNCTION public.require_verified_property_review() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.decision = 'approved' AND NOT EXISTS (
    SELECT 1 FROM public.property_submissions s
    WHERE s.owner_id = NEW.submission_owner_id AND s.operation_id = NEW.submission_operation_id
      AND s.property_id = NEW.property_id AND s.superseded_by IS NULL AND s.field_verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'field verification required before admin approval' USING ERRCODE = '40001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.require_verified_property_review() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS require_verified_property_review ON public.property_reviews;
CREATE TRIGGER require_verified_property_review BEFORE INSERT ON public.property_reviews
FOR EACH ROW EXECUTE FUNCTION public.require_verified_property_review();

-- Include verification proof in admin list RPC
CREATE OR REPLACE FUNCTION public.admin_list_properties(p_status text DEFAULT NULL, p_search text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_search text := lower(NULLIF(btrim(p_search), ''));
  v_result jsonb;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'approved', 'rejected', 'archived', 'all') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(t.j ORDER BY t.updated_at DESC, t.created_at DESC, t.id ASC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT p.updated_at, p.created_at, p.id, pg_catalog.jsonb_build_object(
      'id', p.id, 'title', p.title, 'description', p.description, 'propertyType', p.property_type,
      'rentalType', u.rental_type, 'monthlyRent', u.monthly_rent, 'maxOccupants', u.max_occupants,
      'floorAreaSqm', u.floor_area_sqm, 'isAvailable', COALESCE(u.is_available, false),
      'streetAddress', p.street_address, 'barangay', p.barangay, 'city', p.city, 'postalCode', p.postal_code,
      'latitude', p.latitude, 'longitude', p.longitude, 'status', p.status, 'moderationNote', p.moderation_note,
      'landlordId', p.landlord_id, 'landlordName', owner.full_name, 'landlordSuspended', owner.is_suspended,
      'submissionDraftId', s.draft_id, 'submissionExpectedRevision', s.expected_revision,
      'hasPendingRevision', (p.status = 'approved' AND s.review_status = 'pending'),
      'fieldVerificationStatus', s.field_verification_status,
      'fieldVerifiedBy', s.field_verified_by,
      'fieldVerifiedAt', s.field_verified_at,
      'fieldVerificationMethod', s.field_verification_method,
      'fieldVerificationNotes', s.field_verification_notes,
      'fieldVerificationProof', s.field_verification_proof,
      'permitApplicability', s.snapshot_payload->'property'->>'permit_applicability',
      'permitNumber', s.snapshot_payload->'property'->>'permit_number',
      'permitLgu', s.snapshot_payload->'property'->>'permit_lgu',
      'permitExpiresOn', s.snapshot_payload->'property'->>'permit_expires_on',
      'permitNotRequiredConfirmed', (s.snapshot_payload->'property'->>'permit_not_required_confirmed' = 'true'),
      'permitExemptionReason', s.snapshot_payload->'property'->>'permit_exemption_reason',
      'documentCategories', s.snapshot_payload->'property'->>'document_categories',
      'documentApplicabilityDecision', s.document_applicability_decision,
      'photoPaths', pg_catalog.to_jsonb(CASE WHEN s.snapshot_payload IS NULL THEN
        ARRAY(
          SELECT m.object_path FROM public.property_draft_media m
          WHERE m.draft_id = s.draft_id AND m.confirmed AND m.released_at IS NULL AND m.kind = 'photo'
          ORDER BY m.created_at)
        ELSE ARRAY(
          SELECT e.elem->>'object_path'
          FROM pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(s.snapshot_media) = 'array' THEN s.snapshot_media ELSE '[]'::jsonb END)
            WITH ORDINALITY AS e(elem, ord)
          WHERE e.elem->>'kind' = 'photo' AND e.elem->>'object_path' IS NOT NULL ORDER BY e.ord)
        END),
      'permitPaths', pg_catalog.to_jsonb(CASE WHEN s.snapshot_payload IS NULL THEN
        ARRAY(
          SELECT m.object_path FROM public.property_draft_media m
          WHERE m.draft_id = s.draft_id AND m.confirmed AND m.released_at IS NULL AND m.kind = 'permit'
          ORDER BY m.created_at)
        ELSE ARRAY(
          SELECT e.elem->>'object_path'
          FROM pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(s.snapshot_media) = 'array' THEN s.snapshot_media ELSE '[]'::jsonb END)
            WITH ORDINALITY AS e(elem, ord)
          WHERE e.elem->>'kind' = 'permit' AND e.elem->>'object_path' IS NOT NULL ORDER BY e.ord)
        END),
      'createdAt', p.created_at, 'updatedAt', p.updated_at) AS j
    FROM public.properties p
    LEFT JOIN public.profiles owner ON owner.id = p.landlord_id
    LEFT JOIN LATERAL (
      SELECT u.* FROM public.rental_units u WHERE u.property_id = p.id ORDER BY u.created_at ASC, u.id ASC LIMIT 1
    ) u ON true
    LEFT JOIN LATERAL (
      SELECT s.* FROM public.property_submissions s WHERE s.property_id = p.id AND s.superseded_by IS NULL
      ORDER BY s.created_at DESC LIMIT 1
    ) s ON true
    WHERE (p_status IS NULL OR p_status = 'all' OR p.status = p_status OR (p_status = 'pending' AND p.status = 'approved' AND s.review_status = 'pending'))
      AND (v_search IS NULL OR pg_catalog.strpos(lower(p.title || ' ' || p.street_address || ' ' || p.barangay || ' ' || p.city || ' ' || COALESCE(owner.full_name, '')), v_search) > 0)
    ORDER BY p.updated_at DESC, p.created_at DESC, p.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100) OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) t;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_properties(text,text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_properties(text,text,integer,integer) TO authenticated;

-- ============================================================================
-- 2. Admin Staff Account Creation RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_assign_staff_role(
  p_target_user_id uuid, p_operation_id uuid, p_role text, p_full_name text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_target public.profiles%ROWTYPE;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_target_user_id IS NULL OR p_operation_id IS NULL OR p_role IS NULL OR p_role NOT IN ('verification_officer', 'customer_support') THEN
    RAISE EXCEPTION 'invalid staff assignment parameters' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_target FROM public.profiles WHERE id = p_target_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'target profile not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.profiles
    SET role = p_role::public.user_role,
        full_name = COALESCE(NULLIF(pg_catalog.btrim(p_full_name), ''), full_name),
        updated_at = pg_catalog.now()
    WHERE id = p_target_user_id;

  INSERT INTO public.admin_audit_logs(admin_id, operation_id, target_type, target_id, action_type, previous_state, new_state, reason)
    VALUES (v_admin, p_operation_id, 'account', p_target_user_id, 'staff_account_created',
      pg_catalog.jsonb_build_object('role', v_target.role, 'full_name', v_target.full_name),
      pg_catalog.jsonb_build_object('role', p_role, 'full_name', COALESCE(NULLIF(pg_catalog.btrim(p_full_name), ''), v_target.full_name)),
      'Staff account assigned role: ' || p_role);

  RETURN pg_catalog.jsonb_build_object('targetUserId', p_target_user_id, 'role', p_role, 'success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_assign_staff_role(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_staff_role(uuid,uuid,text,text) TO authenticated;

-- ============================================================================
-- 3. Customer Support & Complaint Mediation Schema & RPCs
-- ============================================================================

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS reported_landlord_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS landlord_inquiry_note text,
  ADD COLUMN IF NOT EXISTS landlord_inquiry_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS landlord_response text,
  ADD COLUMN IF NOT EXISTS landlord_responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS handled_by_support_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS support_resolution_note text,
  ADD COLUMN IF NOT EXISTS escalated_to_admin_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_reason text,
  ADD COLUMN IF NOT EXISTS recommended_admin_action text CHECK (recommended_admin_action IS NULL OR recommended_admin_action IN ('suspend_account','unpublish_listing','both','review'));

-- Update status check constraint on support_tickets
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_status_check
  CHECK (status IN ('open', 'in_progress', 'awaiting_landlord', 'escalated', 'resolved', 'closed'));

DROP POLICY IF EXISTS support_tickets_staff_read ON public.support_tickets;
CREATE POLICY support_tickets_staff_read ON public.support_tickets FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR reported_landlord_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('customer_support', 'admin') AND NOT p.is_suspended)
  );

CREATE OR REPLACE FUNCTION public.support_desk_list_tickets(
  p_status text DEFAULT NULL, p_category text DEFAULT NULL, p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_ticket_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_search text := lower(NULLIF(btrim(p_search), ''));
  v_result jsonb;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND p.role::text IN ('customer_support','admin') AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active support or admin required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(pg_catalog.jsonb_agg(t.j ORDER BY t.created_at DESC, t.id ASC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT st.created_at, st.id, pg_catalog.jsonb_build_object(
      'id', st.id,
      'userId', st.user_id,
      'requesterName', st.requester_name,
      'requesterEmail', st.requester_email,
      'requesterRole', st.requester_role,
      'category', st.category,
      'subject', st.subject,
      'description', st.description,
      'relatedListingId', st.related_listing_id,
      'attachments', st.attachments,
      'status', st.status,
      'priority', st.priority,
      'reportedLandlordId', st.reported_landlord_id,
      'reportedLandlordName', landlord.full_name,
      'landlordInquiryNote', st.landlord_inquiry_note,
      'landlordInquirySentAt', st.landlord_inquiry_sent_at,
      'landlordResponse', st.landlord_response,
      'landlordRespondedAt', st.landlord_responded_at,
      'handledBySupportId', st.handled_by_support_id,
      'handledBySupportName', support_staff.full_name,
      'supportResolutionNote', st.support_resolution_note,
      'escalatedToAdminAt', st.escalated_to_admin_at,
      'escalationReason', st.escalation_reason,
      'recommendedAdminAction', st.recommended_admin_action,
      'adminResponse', st.admin_response,
      'resolvedAt', st.resolved_at,
      'createdAt', st.created_at,
      'updatedAt', st.updated_at
    ) AS j
    FROM public.support_tickets st
    LEFT JOIN public.profiles landlord ON landlord.id = st.reported_landlord_id
    LEFT JOIN public.profiles support_staff ON support_staff.id = st.handled_by_support_id
    WHERE (p_ticket_id IS NULL OR st.id = p_ticket_id)
      AND (p_status IS NULL OR p_status = 'all' OR st.status = p_status)
      AND (p_category IS NULL OR p_category = 'all' OR st.category = p_category)
      AND (v_search IS NULL OR pg_catalog.strpos(lower(st.subject || ' ' || st.description || ' ' || st.requester_name || ' ' || st.requester_email || ' ' || COALESCE(landlord.full_name, '')), v_search) > 0)
    ORDER BY st.created_at DESC, st.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100) OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) t;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.support_desk_list_tickets(text,text,text,integer,integer,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.support_desk_list_tickets(text,text,text,integer,integer,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.support_desk_act_on_ticket(
  p_ticket_id uuid, p_operation_id uuid, p_action text, p_note text,
  p_reported_landlord_id uuid DEFAULT NULL, p_recommended_admin_action text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_ticket public.support_tickets%ROWTYPE;
  v_trimmed_note text := pg_catalog.btrim(COALESCE(p_note, ''));
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND p.role::text IN ('customer_support','admin') AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active support or admin required' USING ERRCODE = '42501';
  END IF;
  IF p_ticket_id IS NULL OR p_operation_id IS NULL OR p_action IS NULL
     OR p_action NOT IN ('request_landlord_response', 'resolve', 'escalate_to_admin')
     OR length(v_trimmed_note) < 5 THEN
    RAISE EXCEPTION 'invalid support desk action parameters' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'support ticket not found' USING ERRCODE = 'P0002'; END IF;

  IF p_action = 'request_landlord_response' THEN
    IF p_reported_landlord_id IS NULL AND v_ticket.reported_landlord_id IS NULL THEN
      RAISE EXCEPTION 'reported landlord required to request response' USING ERRCODE = '22023';
    END IF;
    UPDATE public.support_tickets SET
      status = 'awaiting_landlord',
      reported_landlord_id = COALESCE(p_reported_landlord_id, reported_landlord_id),
      landlord_inquiry_note = v_trimmed_note,
      landlord_inquiry_sent_at = pg_catalog.now(),
      handled_by_support_id = v_actor,
      updated_at = pg_catalog.now()
    WHERE id = p_ticket_id;

  ELSIF p_action = 'resolve' THEN
    UPDATE public.support_tickets SET
      status = 'resolved',
      support_resolution_note = v_trimmed_note,
      handled_by_support_id = v_actor,
      resolved_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
    WHERE id = p_ticket_id;

  ELSIF p_action = 'escalate_to_admin' THEN
    IF p_recommended_admin_action IS NOT NULL AND p_recommended_admin_action NOT IN ('suspend_account','unpublish_listing','both','review') THEN
      RAISE EXCEPTION 'invalid recommended admin action' USING ERRCODE = '22023';
    END IF;
    UPDATE public.support_tickets SET
      status = 'escalated',
      escalation_reason = v_trimmed_note,
      escalated_to_admin_at = pg_catalog.now(),
      recommended_admin_action = p_recommended_admin_action,
      handled_by_support_id = v_actor,
      updated_at = pg_catalog.now()
    WHERE id = p_ticket_id;
  END IF;

  RETURN pg_catalog.jsonb_build_object('ticketId', p_ticket_id, 'action', p_action, 'success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.support_desk_act_on_ticket(uuid,uuid,text,text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.support_desk_act_on_ticket(uuid,uuid,text,text,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.landlord_respond_to_support_ticket(
  p_ticket_id uuid, p_operation_id uuid, p_response text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_ticket public.support_tickets%ROWTYPE;
  v_trimmed text := pg_catalog.btrim(COALESCE(p_response, ''));
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND p.role = 'landlord' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active landlord required' USING ERRCODE = '42501';
  END IF;
  IF p_ticket_id IS NULL OR p_operation_id IS NULL OR length(v_trimmed) < 5 THEN
    RAISE EXCEPTION 'invalid response parameters' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ticket not found' USING ERRCODE = 'P0002'; END IF;
  IF v_ticket.reported_landlord_id IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'not authorized to respond to this ticket' USING ERRCODE = '42501';
  END IF;

  UPDATE public.support_tickets SET
    landlord_response = v_trimmed,
    landlord_responded_at = pg_catalog.now(),
    status = 'in_progress',
    updated_at = pg_catalog.now()
  WHERE id = p_ticket_id;

  RETURN pg_catalog.jsonb_build_object('ticketId', p_ticket_id, 'success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.landlord_respond_to_support_ticket(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.landlord_respond_to_support_ticket(uuid,uuid,text) TO authenticated;

-- ============================================================================
-- 4. Multi-Unit Boarding Houses & Unit Availability
-- ============================================================================

ALTER TABLE public.rental_units
  ADD COLUMN IF NOT EXISTS unit_number text,
  ADD COLUMN IF NOT EXISTS floor_area_sqm numeric;

CREATE OR REPLACE FUNCTION public.landlord_set_unit_availability(
  p_unit_id uuid, p_is_available boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_unit public.rental_units%ROWTYPE;
  v_prop public.properties%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authenticated user required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_unit FROM public.rental_units WHERE id = p_unit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unit not found' USING ERRCODE = 'P0002'; END IF;

  SELECT * INTO v_prop FROM public.properties WHERE id = v_unit.property_id;
  IF v_prop.landlord_id IS DISTINCT FROM v_actor AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND p.role = 'admin' AND NOT p.is_suspended
  ) THEN
    RAISE EXCEPTION 'not authorized to modify unit availability' USING ERRCODE = '42501';
  END IF;

  UPDATE public.rental_units SET is_available = p_is_available WHERE id = p_unit_id;
  RETURN pg_catalog.jsonb_build_object('unitId', p_unit_id, 'isAvailable', p_is_available, 'success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.landlord_set_unit_availability(uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.landlord_set_unit_availability(uuid,boolean) TO authenticated;

-- ============================================================================
-- 5. Dual-Button Mutual Rental Agreement Schema & RPC
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rental_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.rental_conversations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  unit_id uuid NOT NULL REFERENCES public.rental_units(id) ON DELETE CASCADE,
  renter_id uuid NOT NULL REFERENCES public.profiles(id),
  landlord_id uuid NOT NULL REFERENCES public.profiles(id),
  renter_agreed_at timestamptz,
  landlord_agreed_at timestamptz,
  status text NOT NULL CHECK (status IN ('pending_both', 'renter_agreed', 'landlord_agreed', 'agreed', 'cancelled')),
  operation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX IF NOT EXISTS idx_rental_agreements_conversation ON public.rental_agreements(conversation_id);
CREATE INDEX IF NOT EXISTS idx_rental_agreements_unit ON public.rental_agreements(unit_id);
ALTER TABLE public.rental_agreements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rental_agreements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.rental_agreements TO authenticated;

DROP POLICY IF EXISTS rental_agreements_participant_read ON public.rental_agreements;
CREATE POLICY rental_agreements_participant_read ON public.rental_agreements FOR SELECT TO authenticated
  USING (renter_id = auth.uid() OR landlord_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND NOT p.is_suspended
  ));

CREATE OR REPLACE FUNCTION public.set_rental_agreement_consent(
  p_conversation_id uuid, p_operation_id uuid, p_agree boolean DEFAULT true, p_unit_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_conv public.rental_conversations%ROWTYPE;
  v_agreement public.rental_agreements%ROWTYPE;
  v_unit_id uuid;
  v_property_id uuid;
  v_listing_id uuid;
  v_is_renter boolean;
  v_is_landlord boolean;
  v_new_status text;
  v_both_agreed boolean := false;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authenticated user required' USING ERRCODE = '42501'; END IF;
  IF p_conversation_id IS NULL OR p_operation_id IS NULL THEN
    RAISE EXCEPTION 'invalid agreement parameters' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_conv FROM public.rental_conversations WHERE id = p_conversation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'conversation not found' USING ERRCODE = 'P0002'; END IF;

  v_is_renter := (v_conv.renter_id = v_actor);
  v_is_landlord := (v_conv.landlord_id = v_actor);
  IF NOT v_is_renter AND NOT v_is_landlord THEN
    RAISE EXCEPTION 'not a participant in this conversation' USING ERRCODE = '42501';
  END IF;

  IF v_conv.listing_source = 'property' THEN
    v_property_id := v_conv.listing_id;
    v_listing_id := NULL;
  ELSE
    v_property_id := (SELECT property_id FROM public.listings WHERE id = v_conv.listing_id);
    v_listing_id := v_conv.listing_id;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('rental-agreement:' || p_conversation_id::text, 0));

  -- Look for active agreement in this conversation
  SELECT * INTO v_agreement FROM public.rental_agreements
    WHERE conversation_id = p_conversation_id AND status NOT IN ('agreed', 'cancelled')
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF FOUND THEN
    v_unit_id := v_agreement.unit_id;
    IF p_unit_id IS NOT NULL AND p_unit_id IS DISTINCT FROM v_unit_id THEN
      -- Switched unit selection: cancel previous pending agreement
      UPDATE public.rental_agreements SET status = 'cancelled', updated_at = pg_catalog.now() WHERE id = v_agreement.id;
      v_agreement := NULL;
      v_unit_id := p_unit_id;
    END IF;
  ELSE
    v_unit_id := p_unit_id;
  END IF;

  IF p_agree THEN
    IF v_unit_id IS NULL THEN
      -- Pick first available unit for property if unspecified
      SELECT id INTO v_unit_id FROM public.rental_units
        WHERE property_id = v_property_id AND is_available = true
        ORDER BY created_at ASC LIMIT 1;
      IF v_unit_id IS NULL THEN
        RAISE EXCEPTION 'no available units for this property' USING ERRCODE = '40001';
      END IF;
    END IF;

    -- Ensure unit is currently available
    IF NOT EXISTS (SELECT 1 FROM public.rental_units WHERE id = v_unit_id AND is_available = true) THEN
      RAISE EXCEPTION 'selected unit is no longer available' USING ERRCODE = '40001';
    END IF;

    IF v_agreement.id IS NULL THEN
      -- Create initial agreement row
      INSERT INTO public.rental_agreements(
        conversation_id, property_id, listing_id, unit_id, renter_id, landlord_id,
        renter_agreed_at, landlord_agreed_at, status, operation_id
      ) VALUES (
        p_conversation_id, v_property_id, v_listing_id, v_unit_id, v_conv.renter_id, v_conv.landlord_id,
        CASE WHEN v_is_renter THEN pg_catalog.now() ELSE NULL END,
        CASE WHEN v_is_landlord THEN pg_catalog.now() ELSE NULL END,
        CASE WHEN v_is_renter THEN 'renter_agreed' ELSE 'landlord_agreed' END,
        p_operation_id
      ) RETURNING * INTO v_agreement;
    ELSE
      -- Update existing agreement with second consent
      IF v_is_renter THEN
        v_agreement.renter_agreed_at := pg_catalog.now();
      ELSE
        v_agreement.landlord_agreed_at := pg_catalog.now();
      END IF;

      IF v_agreement.renter_agreed_at IS NOT NULL AND v_agreement.landlord_agreed_at IS NOT NULL THEN
        v_new_status := 'agreed';
        v_both_agreed := true;
      ELSIF v_agreement.renter_agreed_at IS NOT NULL THEN
        v_new_status := 'renter_agreed';
      ELSE
        v_new_status := 'landlord_agreed';
      END IF;

      UPDATE public.rental_agreements SET
        renter_agreed_at = v_agreement.renter_agreed_at,
        landlord_agreed_at = v_agreement.landlord_agreed_at,
        status = v_new_status,
        updated_at = pg_catalog.now()
      WHERE id = v_agreement.id
      RETURNING * INTO v_agreement;
    END IF;

    -- Atomic occupation transition on dual agreement
    IF v_both_agreed THEN
      UPDATE public.rental_units SET is_available = false WHERE id = v_unit_id;
      -- Auto-cancel competing pending agreements for the same unit in other threads
      UPDATE public.rental_agreements SET status = 'cancelled', updated_at = pg_catalog.now()
        WHERE unit_id = v_unit_id AND id <> v_agreement.id AND status NOT IN ('agreed', 'cancelled');
    END IF;

  ELSE
    -- User withdrawing consent / cancelling
    IF v_agreement.id IS NOT NULL THEN
      UPDATE public.rental_agreements SET status = 'cancelled', updated_at = pg_catalog.now() WHERE id = v_agreement.id
      RETURNING * INTO v_agreement;
    END IF;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'agreementId', v_agreement.id,
    'unitId', v_agreement.unit_id,
    'status', v_agreement.status,
    'renterAgreed', v_agreement.renter_agreed_at IS NOT NULL,
    'landlordAgreed', v_agreement.landlord_agreed_at IS NOT NULL,
    'bothAgreed', v_agreement.status = 'agreed'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.set_rental_agreement_consent(uuid,uuid,boolean,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_rental_agreement_consent(uuid,uuid,boolean,uuid) TO authenticated;

-- ============================================================================
-- 6. Public Map RPC: Approved-Only + Multi-Unit Availability Counts
-- ============================================================================

DROP POLICY IF EXISTS finder_favorite_insert ON public.favorites;
DROP FUNCTION IF EXISTS public.get_public_submitted_rentals();

CREATE OR REPLACE FUNCTION public.get_public_submitted_rentals()
RETURNS TABLE (
  id uuid, title text, description text, price numeric, property_type text, rental_type text,
  latitude double precision, longitude double precision, address text, barangay text, city text,
  max_occupants integer, floor_area_sqm numeric, bathroom_type text, tenant_policy text,
  amenities jsonb, photo_paths text[], moderation_status text, created_at timestamptz,
  available_units_count integer, total_units_count integer, units jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH latest_approved_submission AS (
    SELECT s.property_id, s.draft_id, s.expected_revision, s.snapshot_payload, s.snapshot_media,
           r.created_at AS review_created_at
    FROM public.property_submissions s
    JOIN public.property_reviews r
      ON r.property_id = s.property_id
     AND r.submission_owner_id = s.owner_id
     AND r.submission_operation_id = s.operation_id
     AND r.decision = 'approved'
    JOIN public.admin_audit_logs a
      ON a.admin_id = r.admin_id
     AND a.operation_id = r.operation_id
     AND a.target_type = 'property'
     AND a.target_id = r.property_id
     AND a.action_type = 'property_approved'
     AND a.new_state->>'status' = 'approved'
     AND a.new_state->>'draft_id' = s.draft_id::text
     AND a.new_state->>'revision' = s.expected_revision::text
    WHERE r.created_at >= s.created_at
      AND a.created_at >= s.created_at
  ),
  ranked_submissions AS (
    SELECT p.id, p.title, p.description, u.monthly_rent AS price, p.property_type, u.rental_type,
           p.latitude::double precision, p.longitude::double precision,
           p.street_address AS address, p.barangay, p.city,
           u.max_occupants, u.floor_area_sqm,
           NULLIF(l.snapshot_payload->'unit'->>'bathroom_type', '') AS bathroom_type,
           NULLIF(l.snapshot_payload->'unit'->>'tenant_policy', '') AS tenant_policy,
           CASE WHEN pg_catalog.jsonb_typeof(l.snapshot_payload->'amenities') = 'array'
                THEN l.snapshot_payload->'amenities' ELSE '[]'::jsonb END AS amenities,
           CASE WHEN l.snapshot_payload IS NOT NULL THEN ARRAY(
               SELECT dedup.object_path
               FROM (
                 SELECT DISTINCT ON (COALESCE(e.elem->>'content_sha256', e.elem->>'object_path'))
                       e.elem->>'object_path' AS object_path, e.ord
                 FROM pg_catalog.jsonb_array_elements(
                        CASE WHEN pg_catalog.jsonb_typeof(l.snapshot_media) = 'array'
                             THEN l.snapshot_media ELSE '[]'::jsonb END
                      ) WITH ORDINALITY AS e(elem, ord)
                 WHERE e.elem->>'kind' = 'photo'
                   AND e.elem->>'object_path' ~ '^[0-9a-f-]+/[0-9a-f-]+/[0-9a-f-]+/[0-9a-f]{64}\.(jpg|png|webp)$'
                 ORDER BY COALESCE(e.elem->>'content_sha256', e.elem->>'object_path'), e.ord
               ) dedup
               ORDER BY dedup.ord
             )
             ELSE '{}'::text[] END AS photo_paths,
           p.status AS moderation_status, p.created_at,
           u_summary.available_units_count,
           u_summary.total_units_count,
           u_summary.units_json AS units,
           ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY l.review_created_at DESC NULLS LAST) AS rn
    FROM public.properties p
    JOIN LATERAL (
      SELECT u.* FROM public.rental_units u
      WHERE u.property_id = p.id AND u.is_available = true
      ORDER BY u.created_at ASC, u.id ASC LIMIT 1
    ) u ON true
    JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE ru.is_available = true)::integer AS available_units_count,
        COUNT(*)::integer AS total_units_count,
        COALESCE(pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', ru.id,
            'unit_number', COALESCE(ru.unit_number, 'Room ' || ord::text),
            'rental_type', ru.rental_type,
            'monthly_rent', ru.monthly_rent,
            'max_occupants', ru.max_occupants,
            'is_available', ru.is_available
          ) ORDER BY ru.created_at ASC, ru.id ASC
        ), '[]'::jsonb) AS units_json
      FROM (
        SELECT ru.*, ROW_NUMBER() OVER (ORDER BY ru.created_at ASC, ru.id ASC) AS ord
        FROM public.rental_units ru
        WHERE ru.property_id = p.id
      ) ru
    ) u_summary ON u_summary.available_units_count > 0
    LEFT JOIN LATERAL (
      SELECT s.* FROM public.property_submissions s
      JOIN latest_approved_submission approved
        ON approved.property_id = s.property_id
       AND approved.draft_id = s.draft_id
       AND approved.expected_revision = s.expected_revision
      WHERE s.property_id = p.id
      ORDER BY approved.review_created_at DESC NULLS LAST, s.created_at DESC, s.operation_id DESC LIMIT 1
    ) s ON true
    LEFT JOIN latest_approved_submission l
      ON l.property_id = p.id
     AND l.draft_id = s.draft_id
     AND l.expected_revision = s.expected_revision
    WHERE p.status = 'approved'
      AND p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.profiles owner
                  WHERE owner.id = p.landlord_id AND NOT owner.is_suspended)
  )
  SELECT id, title, description, price, property_type, rental_type,
         latitude, longitude, address, barangay, city,
         max_occupants, floor_area_sqm,
         bathroom_type, tenant_policy, amenities,
         photo_paths, moderation_status, created_at,
         available_units_count, total_units_count, units
  FROM ranked_submissions
  WHERE rn = 1
  ORDER BY created_at DESC, id ASC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.get_public_submitted_rentals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_submitted_rentals() TO anon, authenticated;

CREATE POLICY finder_favorite_insert ON public.favorites FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.get_current_user_role() = 'renter'
    AND (
      EXISTS (
        SELECT 1
        FROM public.listings l
        WHERE l.id = listing_id
          AND l.status = 'published'
          AND l.is_available
      )
      OR EXISTS (
        SELECT 1
        FROM public.get_public_submitted_rentals() r
        WHERE r.id = listing_id
      )
    )
  );

COMMIT;
