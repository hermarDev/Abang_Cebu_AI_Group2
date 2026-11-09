-- Migration: 20261109090000_messaging_replies_and_attachments.sql
-- Add quoted replies, swipe-to-reply persistence, and photo attachments to rental messaging

BEGIN;

-- 1. Create storage bucket for rental message attachments (private)
LOCK TABLE storage.buckets IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'rental-message-attachments') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'rental-message-attachments',
      'rental-message-attachments',
      false,
      10485760, -- 10 MB limit
      ARRAY['image/jpeg', 'image/png', 'image/webp']
    );
  END IF;
END $$;

-- 2. Storage RLS policies for rental-message-attachments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'rental_attachments_read'
  ) THEN
    CREATE POLICY rental_attachments_read ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'rental-message-attachments'
        AND EXISTS (
          SELECT 1 FROM public.rental_conversations c
          WHERE c.id::text = (storage.foldername(name))[1]
            AND (c.renter_id = auth.uid() OR c.landlord_id = auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'rental_attachments_insert'
  ) THEN
    CREATE POLICY rental_attachments_insert ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'rental-message-attachments'
        AND (storage.foldername(name))[2] = auth.uid()::text
        AND name !~ '(^|/)\.\.(/|$)'
        AND EXISTS (
          SELECT 1 FROM public.rental_conversations c
          WHERE c.id::text = (storage.foldername(name))[1]
            AND (c.renter_id = auth.uid() OR c.landlord_id = auth.uid())
            AND c.status = 'active'
        )
      );
  END IF;
END $$;

-- 3. Add reply_to_message_id column to rental_messages
ALTER TABLE public.rental_messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id uuid
  REFERENCES public.rental_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rental_messages_reply_to
  ON public.rental_messages(reply_to_message_id)
  WHERE reply_to_message_id IS NOT NULL;

-- 4. Create rental_message_attachments table
CREATE TABLE IF NOT EXISTS public.rental_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.rental_messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.rental_conversations(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL CHECK (length(storage_path) <= 500),
  file_name text NOT NULL CHECK (length(pg_catalog.btrim(file_name)) BETWEEN 1 AND 255),
  file_size integer NOT NULL CHECK (file_size BETWEEN 1 AND 10485760),
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_rental_message_attachments_msg
  ON public.rental_message_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_rental_message_attachments_conv
  ON public.rental_message_attachments(conversation_id);

ALTER TABLE public.rental_message_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rental_message_attachments FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.rental_message_attachments TO service_role;
GRANT SELECT ON public.rental_message_attachments TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'rental_message_attachments' AND policyname = 'rental_message_attachments_read'
  ) THEN
    CREATE POLICY rental_message_attachments_read ON public.rental_message_attachments
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.rental_conversations c
        WHERE c.id = conversation_id AND (c.renter_id = auth.uid() OR c.landlord_id = auth.uid())
      ));
  END IF;
END $$;

-- 5. Relax body constraint on rental_messages to allow photo-only messages (empty string allowed if attachments present)
ALTER TABLE public.rental_messages DROP CONSTRAINT IF EXISTS rental_messages_body_check;
ALTER TABLE public.rental_messages ADD CONSTRAINT rental_messages_body_check
  CHECK (length(pg_catalog.btrim(body)) <= 2000);

-- 6. Replace send_rental_message function supporting reply_to and attachments
CREATE OR REPLACE FUNCTION public.send_rental_message(
  p_conversation_id uuid,
  p_operation_id uuid,
  p_body text,
  p_reply_to_message_id uuid DEFAULT NULL,
  p_attachments jsonb DEFAULT '[]'::jsonb
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
    RAISE EXCEPTION 'invalid message' USING ERRCODE = '22023';
  END IF;

  IF length(v_trimmed) > 2000 THEN
    RAISE EXCEPTION 'invalid message' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_conv FROM public.rental_conversations WHERE id = p_conversation_id FOR UPDATE;
  IF NOT FOUND OR (v_conv.renter_id <> v_user AND v_conv.landlord_id <> v_user) THEN
    RAISE EXCEPTION 'conversation not found or access denied' USING ERRCODE = '42501';
  END IF;

  SELECT m.* INTO v_msg FROM public.rental_messages m WHERE m.sender_id = v_user AND m.operation_id = p_operation_id;
  IF FOUND THEN
    IF v_msg.conversation_id <> p_conversation_id OR v_msg.body <> v_trimmed THEN
      RAISE EXCEPTION 'operation id already used for a different message' USING ERRCODE = '23505';
    END IF;

    -- Return replayed message
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

  IF v_conv.status <> 'active' THEN
    RAISE EXCEPTION 'conversation is closed' USING ERRCODE = '42501';
  END IF;

  v_is_renter := v_conv.renter_id = v_user;
  v_counterpart := CASE WHEN v_is_renter THEN v_conv.landlord_id ELSE v_conv.renter_id END;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_counterpart AND NOT is_suspended) THEN
    RAISE EXCEPTION 'counterpart account is unavailable' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.blocker_id = v_conv.renter_id AND b.blocked_id = v_conv.landlord_id)
       OR (b.blocker_id = v_conv.landlord_id AND b.blocked_id = v_conv.renter_id)
  ) THEN
    RAISE EXCEPTION 'conversation is blocked' USING ERRCODE = '42501';
  END IF;

  IF v_conv.listing_source = 'property' THEN
    SELECT EXISTS (SELECT 1 FROM public.properties p WHERE p.id = v_conv.listing_id AND p.status IN ('approved', 'pending')) INTO v_listing_ok;
  ELSE
    SELECT EXISTS (SELECT 1 FROM public.listings l WHERE l.id = v_conv.listing_id AND l.status = 'published') INTO v_listing_ok;
  END IF;
  IF NOT v_listing_ok THEN
    RAISE EXCEPTION 'listing is no longer available' USING ERRCODE = '42501';
  END IF;

  -- Validate reply_to belongs to same conversation
  IF p_reply_to_message_id IS NOT NULL THEN
    SELECT * INTO v_reply_msg FROM public.rental_messages WHERE id = p_reply_to_message_id;
    IF NOT FOUND OR v_reply_msg.conversation_id <> p_conversation_id THEN
      RAISE EXCEPTION 'reply target not found' USING ERRCODE = '22023';
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
      INSERT INTO public.rental_message_attachments(
        message_id, conversation_id, uploader_id, storage_path, file_name, file_size, mime_type
      )
      VALUES (
        v_msg.id,
        v_conv.id,
        v_user,
        v_att_elem->>'storagePath',
        COALESCE(v_att_elem->>'fileName', 'photo.jpg'),
        COALESCE((v_att_elem->>'fileSize')::integer, 0),
        COALESCE(v_att_elem->>'mimeType', 'image/jpeg')
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
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public.send_rental_message(p_conversation_id, p_operation_id, p_body, NULL, '[]'::jsonb);
$$;

REVOKE ALL ON FUNCTION public.send_rental_message(uuid, uuid, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_rental_message(uuid, uuid, text, uuid, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.send_rental_message(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_rental_message(uuid, uuid, text) TO authenticated;

-- 7. Update get_rental_conversation_detail to return replyTo and attachments
CREATE OR REPLACE FUNCTION public.get_rental_conversation_detail(p_conversation_id uuid, p_before timestamptz DEFAULT NULL, p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
  v_messages jsonb;
  v_count integer;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user AND role IN ('renter', 'landlord') AND NOT is_suspended
  ) OR NOT EXISTS (
    SELECT 1 FROM public.rental_conversations c WHERE c.id = p_conversation_id AND (c.renter_id = v_user OR c.landlord_id = v_user)
  ) THEN
    RAISE EXCEPTION 'conversation not found or access denied' USING ERRCODE = '42501';
  END IF;

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

  RETURN pg_catalog.jsonb_build_object(
    'thread', public._rental_thread_json(p_conversation_id, v_user),
    'messages', v_messages,
    'hasMore', v_count > v_limit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_rental_conversation_detail(uuid, timestamptz, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_rental_conversation_detail(uuid, timestamptz, integer) TO authenticated;

COMMIT;
