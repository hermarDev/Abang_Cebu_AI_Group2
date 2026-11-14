-- Forward migration: CodeRabbit Round 2 remediation
-- 1. Extend support_tickets.requester_role CHECK constraint to allow staff roles
--    (verification_officer, customer_support) matching database.ts
-- 2. Add rental_conversations.agreement_seq for server-side optimistic serialization
--    in set_rental_agreement_consent under the conversation advisory lock
-- 3. Update get_rental_conversation_detail to return agreementVersion, agreement,
--    and active (non-retired) availableUnits on the thread payload

BEGIN;

-- ============================================================================
-- 1. support_tickets.requester_role CHECK constraint
-- ============================================================================

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_requester_role_check;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_requester_role_check
  CHECK (requester_role IN ('guest', 'renter', 'landlord', 'verification_officer', 'customer_support', 'admin'));

-- ============================================================================
-- 2. rental_conversations.agreement_seq & set_rental_agreement_consent
-- ============================================================================

ALTER TABLE public.rental_conversations
  ADD COLUMN IF NOT EXISTS agreement_seq integer NOT NULL DEFAULT 0;

UPDATE public.rental_conversations c
SET agreement_seq = sub.cnt
FROM (
  SELECT conversation_id, count(*)::integer AS cnt
  FROM public.rental_agreements
  GROUP BY conversation_id
) sub
WHERE c.id = sub.conversation_id
  AND c.agreement_seq = 0;

DROP FUNCTION IF EXISTS public.set_rental_agreement_consent(uuid, uuid, boolean, uuid);

CREATE OR REPLACE FUNCTION public.set_rental_agreement_consent(
  p_conversation_id uuid,
  p_operation_id uuid,
  p_agree boolean DEFAULT true,
  p_unit_id uuid DEFAULT NULL,
  p_expected_version integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_conv public.rental_conversations%ROWTYPE;
  v_agreement public.rental_agreements%ROWTYPE;
  v_unit public.rental_units%ROWTYPE;
  v_op public.rental_agreement_ops%ROWTYPE;
  v_unit_id uuid;
  v_property_id uuid;
  v_listing_id uuid;
  v_is_renter boolean;
  v_is_landlord boolean;
  v_new_status text;
  v_both_agreed boolean := false;
  v_new_version integer;
  v_renter_name text;
  v_unit_number text;
  v_result jsonb;
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND NOT p.is_suspended
  ) THEN
    RAISE EXCEPTION 'active user account required' USING ERRCODE = '42501';
  END IF;
  IF p_conversation_id IS NULL OR p_operation_id IS NULL THEN
    RAISE EXCEPTION 'invalid agreement parameters' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('rental-agreement:' || p_conversation_id::text, 0));

  SELECT * INTO v_conv FROM public.rental_conversations WHERE id = p_conversation_id FOR UPDATE;
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

  SELECT * INTO v_op FROM public.rental_agreement_ops
    WHERE actor_id = v_actor AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_op.conversation_id IS DISTINCT FROM p_conversation_id
       OR v_op.agree IS DISTINCT FROM p_agree
       OR v_op.requested_unit_id IS DISTINCT FROM p_unit_id THEN
      RAISE EXCEPTION 'operation already used for different agreement action' USING ERRCODE = '23505';
    END IF;
    RETURN v_op.result;
  END IF;

  IF p_expected_version IS NOT NULL AND v_conv.agreement_seq IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'agreement state changed; please refresh and try again' USING ERRCODE = '40001';
  END IF;

  SELECT * INTO v_agreement FROM public.rental_agreements
    WHERE conversation_id = p_conversation_id AND status NOT IN ('agreed', 'cancelled')
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF FOUND THEN
    v_unit_id := v_agreement.unit_id;
    IF p_unit_id IS NOT NULL AND p_unit_id IS DISTINCT FROM v_unit_id THEN
      UPDATE public.rental_agreements SET status = 'cancelled', updated_at = pg_catalog.now() WHERE id = v_agreement.id;
      v_agreement := NULL;
      v_unit_id := p_unit_id;
    END IF;
  ELSE
    v_unit_id := p_unit_id;
  END IF;

  v_new_version := v_conv.agreement_seq;

  IF p_agree THEN
    IF v_unit_id IS NULL THEN
      SELECT id INTO v_unit_id FROM public.rental_units
        WHERE property_id = v_property_id AND is_available = true AND NOT is_retired
        ORDER BY created_at ASC LIMIT 1;
      IF v_unit_id IS NULL THEN
        RAISE EXCEPTION 'no available units for this property' USING ERRCODE = '40001';
      END IF;
    END IF;

    SELECT * INTO v_unit FROM public.rental_units
      WHERE id = v_unit_id AND property_id = v_property_id AND is_available = true AND NOT is_retired
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'selected unit is no longer available' USING ERRCODE = '40001';
    END IF;

    IF v_agreement.id IS NULL THEN
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

    UPDATE public.rental_conversations
      SET agreement_seq = agreement_seq + 1
      WHERE id = p_conversation_id
      RETURNING agreement_seq INTO v_new_version;

    IF v_both_agreed THEN
      UPDATE public.rental_units SET is_available = false WHERE id = v_unit_id;
      UPDATE public.rental_agreements SET status = 'cancelled', updated_at = pg_catalog.now()
        WHERE unit_id = v_unit_id AND id <> v_agreement.id AND status NOT IN ('agreed', 'cancelled');
    END IF;
  ELSE
    IF v_agreement.id IS NOT NULL THEN
      UPDATE public.rental_agreements SET status = 'cancelled', updated_at = pg_catalog.now() WHERE id = v_agreement.id
      RETURNING * INTO v_agreement;

      UPDATE public.rental_conversations
        SET agreement_seq = agreement_seq + 1
        WHERE id = p_conversation_id
        RETURNING agreement_seq INTO v_new_version;
    END IF;
  END IF;

  SELECT full_name INTO v_renter_name FROM public.profiles WHERE id = v_conv.renter_id;
  IF v_agreement.unit_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(pg_catalog.btrim(unit_number), ''), 'Room 1') INTO v_unit_number
    FROM public.rental_units WHERE id = v_agreement.unit_id;
  END IF;

  v_result := pg_catalog.jsonb_build_object(
    'id', v_agreement.id,
    'agreementId', v_agreement.id,
    'unitId', v_agreement.unit_id,
    'unitNumber', v_unit_number,
    'status', COALESCE(v_agreement.status, 'cancelled'),
    'renterAgreed', v_agreement.renter_agreed_at IS NOT NULL,
    'landlordAgreed', v_agreement.landlord_agreed_at IS NOT NULL,
    'bothAgreed', v_agreement.status = 'agreed',
    'renterName', v_renter_name,
    'version', v_new_version
  );

  INSERT INTO public.rental_agreement_ops(actor_id, operation_id, conversation_id, agree, requested_unit_id, result)
  VALUES (v_actor, p_operation_id, p_conversation_id, p_agree, p_unit_id, v_result);

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.set_rental_agreement_consent(uuid, uuid, boolean, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_rental_agreement_consent(uuid, uuid, boolean, uuid, integer) TO authenticated;

-- ============================================================================
-- 3. get_rental_conversation_detail with agreement, agreementVersion, availableUnits
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_rental_conversation_detail(
  p_conversation_id uuid,
  p_before timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 50
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
  v_messages jsonb;
  v_count integer;
  v_conv public.rental_conversations%ROWTYPE;
  v_property_id uuid;
  v_available_units jsonb;
  v_agreement_json jsonb;
  v_thread jsonb;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user AND role IN ('renter', 'landlord') AND NOT is_suspended
  ) OR NOT EXISTS (
    SELECT 1 FROM public.rental_conversations c WHERE c.id = p_conversation_id AND (c.renter_id = v_user OR c.landlord_id = v_user)
  ) THEN
    RAISE EXCEPTION 'conversation not found or access denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_conv FROM public.rental_conversations WHERE id = p_conversation_id;

  IF v_conv.listing_source = 'property' THEN
    v_property_id := v_conv.listing_id;
  ELSE
    SELECT l.property_id INTO v_property_id FROM public.listings l WHERE l.id = v_conv.listing_id;
  END IF;

  SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id', u.id,
    'unitNumber', COALESCE(NULLIF(pg_catalog.btrim(u.unit_number), ''), 'Room 1'),
    'isAvailable', u.is_available,
    'monthlyRent', u.monthly_rent
  ) ORDER BY u.created_at ASC, u.unit_number ASC, u.id ASC), '[]'::jsonb)
  INTO v_available_units
  FROM public.rental_units u
  WHERE v_property_id IS NOT NULL
    AND u.property_id = v_property_id
    AND NOT u.is_retired;

  SELECT pg_catalog.jsonb_build_object(
    'id', a.id,
    'agreementId', a.id,
    'unitId', a.unit_id,
    'unitNumber', COALESCE(NULLIF(pg_catalog.btrim(u.unit_number), ''), 'Room 1'),
    'status', a.status,
    'renterAgreed', a.renter_agreed_at IS NOT NULL,
    'landlordAgreed', a.landlord_agreed_at IS NOT NULL,
    'bothAgreed', a.status = 'agreed',
    'renterName', rp.full_name,
    'version', v_conv.agreement_seq
  )
  INTO v_agreement_json
  FROM public.rental_agreements a
  LEFT JOIN public.rental_units u ON u.id = a.unit_id
  LEFT JOIN public.profiles rp ON rp.id = a.renter_id
  WHERE a.conversation_id = p_conversation_id
    AND a.status <> 'cancelled'
  ORDER BY CASE WHEN a.status = 'agreed' THEN 0 ELSE 1 END, a.created_at DESC
  LIMIT 1;

  SELECT COALESCE(pg_catalog.jsonb_agg(x.j ORDER BY x.created_at, x.id) FILTER (WHERE x.rn <= v_limit), '[]'::jsonb),
         COALESCE(pg_catalog.max(x.rn), 0)
    INTO v_messages, v_count
  FROM (
    SELECT m.id, m.created_at,
      pg_catalog.row_number() OVER (ORDER BY m.created_at DESC, m.id DESC) AS rn,
      pg_catalog.jsonb_build_object(
        'id', m.id,
        'conversationId', m.conversation_id,
        'senderId', m.sender_id,
        'operationId', m.operation_id,
        'body', m.body,
        'replyTo', CASE
          WHEN m.reply_to_message_id IS NULL THEN NULL
          WHEN rm_reply.id IS NOT NULL THEN pg_catalog.jsonb_build_object(
            'id', rm_reply.id,
            'senderId', rm_reply.sender_id,
            'senderName', COALESCE(p_reply.full_name, 'User'),
            'body', pg_catalog.left(rm_reply.body, 150)
          )
          ELSE pg_catalog.jsonb_build_object('id', m.reply_to_message_id, 'isUnavailable', true, 'body', 'Original message unavailable')
        END,
        'attachments', COALESCE(att.items, '[]'::jsonb),
        'createdAt', m.created_at
      ) AS j
    FROM public.rental_messages m
    LEFT JOIN public.rental_messages rm_reply ON rm_reply.id = m.reply_to_message_id
    LEFT JOIN public.profiles p_reply ON p_reply.id = rm_reply.sender_id
    LEFT JOIN LATERAL (
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'id', a.id,
        'storagePath', a.storage_path,
        'fileName', a.file_name,
        'fileSize', a.file_size,
        'mimeType', a.mime_type
      ) ORDER BY a.created_at, a.id) AS items
      FROM public.rental_message_attachments a
      WHERE a.message_id = m.id
    ) att ON true
    WHERE m.conversation_id = p_conversation_id AND (p_before IS NULL OR m.created_at < p_before)
    ORDER BY m.created_at DESC, m.id DESC LIMIT v_limit + 1
  ) x;

  v_thread := public._rental_thread_json(p_conversation_id, v_user);
  IF v_thread IS NOT NULL THEN
    v_thread := v_thread || pg_catalog.jsonb_build_object(
      'agreementVersion', v_conv.agreement_seq,
      'agreement', v_agreement_json,
      'availableUnits', v_available_units
    );
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'thread', v_thread,
    'messages', v_messages,
    'hasMore', v_count > v_limit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_rental_conversation_detail(uuid, timestamptz, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_rental_conversation_detail(uuid, timestamptz, integer) TO authenticated;

COMMIT;
