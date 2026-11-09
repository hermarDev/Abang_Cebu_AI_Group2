-- Migration: Fix send_rental_message table reference from blocks to user_blocks
-- and allow pending properties in addition to approved properties.

CREATE OR REPLACE FUNCTION public.send_rental_message(
  p_conversation_id uuid,
  p_operation_id uuid,
  p_body text,
  p_reply_to_message_id uuid,
  p_attachments jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_trimmed text := pg_catalog.btrim(COALESCE(p_body, ''));
  v_conv public.rental_conversations%ROWTYPE;
  v_msg public.rental_messages%ROWTYPE;
  v_counterpart uuid;
  v_is_renter boolean;
  v_listing_ok boolean;
  v_reply_msg public.rental_messages%ROWTYPE;
  v_reply_author text;
  v_reply_json jsonb := NULL;
  v_att_elem jsonb;
  v_attachments_result jsonb := '[]'::jsonb;
  v_has_attachments boolean := false;
  v_preview text;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user AND role IN ('renter', 'landlord') AND NOT is_suspended
  ) THEN
    RAISE EXCEPTION 'only active renters and landlords can send messages' USING ERRCODE = '42501';
  END IF;

  v_has_attachments := p_attachments IS NOT NULL AND jsonb_typeof(p_attachments) = 'array' AND jsonb_array_length(p_attachments) > 0;

  IF p_conversation_id IS NULL OR p_operation_id IS NULL THEN
    RAISE EXCEPTION 'invalid message' USING ERRCODE = '22023';
  END IF;

  IF length(v_trimmed) = 0 AND NOT v_has_attachments THEN
    RAISE EXCEPTION 'message body or attachment required' USING ERRCODE = '22023';
  END IF;

  IF length(v_trimmed) > 2000 THEN
    RAISE EXCEPTION 'message exceeds 2000 characters' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_conv FROM public.rental_conversations WHERE id = p_conversation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'conversation not found' USING ERRCODE = '42501';
  END IF;

  IF v_conv.status <> 'active' THEN
    RAISE EXCEPTION 'conversation is not active' USING ERRCODE = '42501';
  END IF;

  IF v_conv.renter_id = v_user THEN
    v_is_renter := true;
    v_counterpart := v_conv.landlord_id;
  ELSIF v_conv.landlord_id = v_user THEN
    v_is_renter := false;
    v_counterpart := v_conv.renter_id;
  ELSE
    RAISE EXCEPTION 'not a participant in this conversation' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.blocker_id = v_user AND b.blocked_id = v_counterpart)
       OR (b.blocker_id = v_counterpart AND b.blocked_id = v_user)
  ) THEN
    RAISE EXCEPTION 'cannot message blocked user' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = v_conv.listing_id
      AND l.status = 'published'
      AND l.is_available = true
    UNION ALL
    SELECT 1 FROM public.properties p
    JOIN public.rental_units u ON u.property_id = p.id
    WHERE p.id = v_conv.listing_id
      AND p.status IN ('approved', 'pending')
      AND u.is_available = true
  ) INTO v_listing_ok;

  IF NOT v_listing_ok THEN
    RAISE EXCEPTION 'listing is no longer available' USING ERRCODE = '42501';
  END IF;

  -- Idempotency check: replay existing message with attachments if operation_id matches
  SELECT * INTO v_msg FROM public.rental_messages WHERE operation_id = p_operation_id;
  IF FOUND THEN
    IF v_msg.conversation_id <> v_conv.id OR v_msg.sender_id <> v_user THEN
      RAISE EXCEPTION 'operation_id belongs to another conversation or sender' USING ERRCODE = '23505';
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', a.id, 'storagePath', a.storage_path, 'fileName', a.file_name,
      'fileSize', a.file_size, 'mimeType', a.mime_type
    )), '[]'::jsonb)
    INTO v_attachments_result
    FROM public.rental_message_attachments a
    WHERE a.message_id = v_msg.id;

    IF v_msg.reply_to_message_id IS NOT NULL THEN
      SELECT rm.* INTO v_reply_msg FROM public.rental_messages rm WHERE rm.id = v_msg.reply_to_message_id;
      IF FOUND THEN
        SELECT COALESCE(p.full_name, 'User') INTO v_reply_author FROM public.profiles p WHERE p.id = v_reply_msg.sender_id;
        v_reply_json := jsonb_build_object(
          'id', v_reply_msg.id,
          'senderId', v_reply_msg.sender_id,
          'senderName', v_reply_author,
          'body', pg_catalog.left(v_reply_msg.body, 150)
        );
      ELSE
        v_reply_json := jsonb_build_object('id', v_msg.reply_to_message_id, 'isUnavailable', true, 'body', 'Original message unavailable');
      END IF;
    END IF;

    RETURN pg_catalog.jsonb_build_object(
      'id', v_msg.id, 'conversationId', v_conv.id, 'senderId', v_user,
      'operationId', p_operation_id, 'body', v_msg.body,
      'replyTo', v_reply_json,
      'attachments', v_attachments_result,
      'createdAt', v_msg.created_at, 'replayed', true
    );
  END IF;

  -- Validate reply_to_message_id if provided
  IF p_reply_to_message_id IS NOT NULL THEN
    SELECT * INTO v_reply_msg FROM public.rental_messages WHERE id = p_reply_to_message_id;
    IF NOT FOUND OR v_reply_msg.conversation_id <> v_conv.id THEN
      RAISE EXCEPTION 'reply message does not belong to this conversation' USING ERRCODE = '22023';
    END IF;

    SELECT COALESCE(p.full_name, 'User') INTO v_reply_author FROM public.profiles p WHERE p.id = v_reply_msg.sender_id;
    v_reply_json := jsonb_build_object(
      'id', v_reply_msg.id,
      'senderId', v_reply_msg.sender_id,
      'senderName', v_reply_author,
      'body', pg_catalog.left(v_reply_msg.body, 150)
    );
  END IF;

  -- Insert message
  INSERT INTO public.rental_messages(conversation_id, sender_id, operation_id, body, reply_to_message_id)
  VALUES (v_conv.id, v_user, p_operation_id, v_trimmed, p_reply_to_message_id)
  RETURNING * INTO v_msg;

  -- Insert attachments if provided
  IF v_has_attachments THEN
    FOR v_att_elem IN SELECT * FROM jsonb_array_elements(p_attachments) LIMIT 5 LOOP
      -- Path validation: must be scoped to v_conv.id / v_user / <filename>, no traversal
      IF v_att_elem->>'storagePath' IS NULL
         OR NOT (v_att_elem->>'storagePath' LIKE (v_conv.id::text || '/' || v_user::text || '/%'))
         OR (v_att_elem->>'storagePath' LIKE '%..%') THEN
        RAISE EXCEPTION 'invalid attachment storage path' USING ERRCODE = '22023';
      END IF;

      INSERT INTO public.rental_message_attachments(
        message_id, conversation_id, uploader_id, storage_path, file_name, file_size, mime_type
      )
      VALUES (
        v_msg.id,
        v_conv.id,
        v_user,
        v_att_elem->>'storagePath',
        COALESCE(pg_catalog.left(v_att_elem->>'fileName', 100), 'photo.jpg'),
        GREATEST(COALESCE((v_att_elem->>'fileSize')::integer, 1024), 1),
        CASE WHEN v_att_elem->>'mimeType' IN ('image/jpg', 'image/jpeg') THEN 'image/jpeg'
             WHEN v_att_elem->>'mimeType' = 'image/png' THEN 'image/png'
             WHEN v_att_elem->>'mimeType' = 'image/webp' THEN 'image/webp'
             ELSE 'image/jpeg' END
      );
    END LOOP;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', a.id, 'storagePath', a.storage_path, 'fileName', a.file_name,
      'fileSize', a.file_size, 'mimeType', a.mime_type
    )), '[]'::jsonb)
    INTO v_attachments_result
    FROM public.rental_message_attachments a
    WHERE a.message_id = v_msg.id;
  END IF;

  -- Determine preview text for conversation list
  IF length(v_trimmed) > 0 THEN
    v_preview := pg_catalog.left(v_trimmed, 200);
  ELSE
    v_preview := '📷 Photo';
  END IF;

  UPDATE public.rental_conversations SET
    renter_unread_count = CASE WHEN v_is_renter THEN 0 ELSE renter_unread_count + 1 END,
    landlord_unread_count = CASE WHEN v_is_renter THEN landlord_unread_count + 1 ELSE 0 END,
    renter_last_read_at = CASE WHEN v_is_renter THEN pg_catalog.now() ELSE renter_last_read_at END,
    landlord_last_read_at = CASE WHEN v_is_renter THEN landlord_last_read_at ELSE pg_catalog.now() END,
    renter_archived_at = NULL, landlord_archived_at = NULL,
    last_message_at = pg_catalog.clock_timestamp(),
    last_message_preview = v_preview,
    updated_at = pg_catalog.now()
  WHERE id = v_conv.id;

  RETURN pg_catalog.jsonb_build_object(
    'id', v_msg.id, 'conversationId', v_conv.id, 'senderId', v_user,
    'operationId', p_operation_id, 'body', v_msg.body,
    'replyTo', v_reply_json,
    'attachments', v_attachments_result,
    'createdAt', v_msg.created_at, 'replayed', false
  );
END;
$$;

-- Overload for backwards compatibility (send_rental_message with 3 args)
CREATE OR REPLACE FUNCTION public.send_rental_message(p_conversation_id uuid, p_operation_id uuid, p_body text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.send_rental_message(p_conversation_id, p_operation_id, p_body, NULL, '[]'::jsonb);
$$;

GRANT EXECUTE ON FUNCTION public.send_rental_message(uuid, uuid, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_rental_message(uuid, uuid, text) TO authenticated;
