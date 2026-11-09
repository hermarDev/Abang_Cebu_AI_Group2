-- Migration: 20261109060000_messaging_allow_pending_and_friendly_errors.sql
-- 1. Allow inquiries on both approved and pending submitted properties
-- 2. Preserve descriptive error messages for self-messaging, non-renters, and unavailable listings

BEGIN;

CREATE OR REPLACE FUNCTION public.send_initial_rental_inquiry(p_listing_id uuid, p_operation_id uuid, p_body text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_trimmed text := pg_catalog.btrim(COALESCE(p_body, ''));
  v_source text;
  v_landlord uuid;
  v_found boolean;
  v_pstatus text;
  v_unit boolean;
  v_lstatus text;
  v_lavail boolean;
  v_conv public.rental_conversations%ROWTYPE;
  v_conv_id uuid;
  v_msg public.rental_messages%ROWTYPE;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user AND role = 'renter' AND NOT is_suspended
  ) THEN
    RAISE EXCEPTION 'only active renters can send inquiries' USING ERRCODE = '42501';
  END IF;
  IF p_listing_id IS NULL OR p_operation_id IS NULL OR length(v_trimmed) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'invalid inquiry' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('rental-inquiry:' || v_user::text || ':' || p_listing_id::text, 0));

  SELECT m.* INTO v_msg FROM public.rental_messages m WHERE m.sender_id = v_user AND m.operation_id = p_operation_id;
  IF FOUND THEN
    IF v_msg.body <> v_trimmed OR NOT EXISTS (
      SELECT 1 FROM public.rental_conversations c WHERE c.id = v_msg.conversation_id AND c.listing_id = p_listing_id
    ) THEN
      RAISE EXCEPTION 'operation id already used for a different message' USING ERRCODE = '23505';
    END IF;
    RETURN pg_catalog.jsonb_build_object('conversationId', v_msg.conversation_id, 'messageId', v_msg.id,
      'createdAt', v_msg.created_at, 'replayed', true);
  END IF;

  SELECT true, p.status, p.landlord_id,
         EXISTS (SELECT 1 FROM public.rental_units u WHERE u.property_id = p.id AND u.is_available = true)
    INTO v_found, v_pstatus, v_landlord, v_unit
  FROM public.properties p WHERE p.id = p_listing_id;
  IF COALESCE(v_found, false) THEN
    IF v_pstatus NOT IN ('approved', 'pending') OR (v_pstatus = 'approved' AND NOT v_unit) THEN
      RAISE EXCEPTION 'listing is not publicly available' USING ERRCODE = '42501';
    END IF;
    v_source := 'property';
  ELSE
    SELECT true, l.status, l.is_available, l.owner_id INTO v_found, v_lstatus, v_lavail, v_landlord
    FROM public.listings l WHERE l.id = p_listing_id;
    IF NOT COALESCE(v_found, false) THEN
      RAISE EXCEPTION 'listing not found' USING ERRCODE = '22023';
    END IF;
    IF v_lstatus <> 'published' OR NOT v_lavail OR v_landlord IS NULL THEN
      RAISE EXCEPTION 'listing is not publicly available' USING ERRCODE = '42501';
    END IF;
    v_source := 'listing';
  END IF;

  IF v_landlord = v_user THEN
    RAISE EXCEPTION 'cannot message your own listing' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_landlord AND NOT is_suspended) THEN
    RAISE EXCEPTION 'landlord account is unavailable' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.blocker_id = v_user AND b.blocked_id = v_landlord) OR (b.blocker_id = v_landlord AND b.blocked_id = v_user)
  ) THEN
    RAISE EXCEPTION 'conversation is blocked' USING ERRCODE = '42501';
  END IF;

  SELECT c.* INTO v_conv FROM public.rental_conversations c
  WHERE c.listing_id = p_listing_id AND c.renter_id = v_user FOR UPDATE;
  IF FOUND AND v_conv.status <> 'active' THEN
    RAISE EXCEPTION 'conversation is closed' USING ERRCODE = '42501';
  END IF;

  IF FOUND THEN
    v_conv_id := v_conv.id;
    UPDATE public.rental_conversations SET
      renter_archived_at = NULL, landlord_archived_at = NULL,
      renter_last_read_at = pg_catalog.now(),
      renter_unread_count = 0,
      landlord_unread_count = landlord_unread_count + 1,
      last_message_at = pg_catalog.clock_timestamp(),
      last_message_preview = pg_catalog.left(v_trimmed, 200),
      updated_at = pg_catalog.now()
    WHERE id = v_conv_id;
  ELSE
    INSERT INTO public.rental_conversations(listing_source, listing_id, renter_id, landlord_id,
      landlord_unread_count, last_message_at, last_message_preview)
    VALUES (v_source, p_listing_id, v_user, v_landlord, 1, pg_catalog.clock_timestamp(), pg_catalog.left(v_trimmed, 200))
    RETURNING id INTO v_conv_id;
  END IF;

  INSERT INTO public.rental_messages(conversation_id, sender_id, operation_id, body)
  VALUES (v_conv_id, v_user, p_operation_id, v_trimmed)
  RETURNING * INTO v_msg;

  RETURN pg_catalog.jsonb_build_object('conversationId', v_conv_id, 'messageId', v_msg.id,
    'createdAt', v_msg.created_at, 'replayed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.send_initial_rental_inquiry(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_initial_rental_inquiry(uuid, uuid, text) TO authenticated;

COMMIT;
