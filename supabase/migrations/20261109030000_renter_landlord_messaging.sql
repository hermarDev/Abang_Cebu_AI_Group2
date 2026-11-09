BEGIN;

-- Renter–landlord messaging + blocking. Tables are read-only to participants via RLS;
-- every mutation and enriched read goes through SECURITY DEFINER RPCs. Admins get no direct read.

CREATE TABLE public.rental_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_source text NOT NULL CHECK (listing_source IN ('property', 'listing')),
  listing_id uuid NOT NULL,
  renter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  landlord_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  renter_archived_at timestamptz,
  landlord_archived_at timestamptz,
  renter_last_read_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  landlord_last_read_at timestamptz,
  renter_unread_count integer NOT NULL DEFAULT 0 CHECK (renter_unread_count >= 0),
  landlord_unread_count integer NOT NULL DEFAULT 0 CHECK (landlord_unread_count >= 0),
  last_message_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  last_message_preview text NOT NULL DEFAULT '' CHECK (length(last_message_preview) <= 200),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  UNIQUE (listing_id, renter_id),
  CHECK (renter_id <> landlord_id)
);

CREATE INDEX idx_rental_conversations_renter_activity
  ON public.rental_conversations(renter_id, last_message_at DESC) WHERE renter_archived_at IS NULL;
CREATE INDEX idx_rental_conversations_landlord_activity
  ON public.rental_conversations(landlord_id, last_message_at DESC) WHERE landlord_archived_at IS NULL;
CREATE INDEX idx_rental_conversations_listing ON public.rental_conversations(listing_id);

CREATE TABLE public.rental_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.rental_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE (sender_id, operation_id)
);

CREATE INDEX idx_rental_messages_thread_time
  ON public.rental_messages(conversation_id, created_at DESC, id DESC);

CREATE TABLE public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text CHECK (reason IS NULL OR length(btrim(reason)) <= 500),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX idx_user_blocks_blocked ON public.user_blocks(blocked_id);

ALTER TABLE public.rental_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.rental_conversations, public.rental_messages, public.user_blocks FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.rental_conversations, public.rental_messages, public.user_blocks TO service_role;
GRANT SELECT ON public.rental_conversations, public.rental_messages, public.user_blocks TO authenticated;

CREATE POLICY rental_conversations_participant_read ON public.rental_conversations
  FOR SELECT TO authenticated
  USING ((renter_id = auth.uid() OR landlord_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND NOT p.is_suspended));

CREATE POLICY rental_messages_participant_read ON public.rental_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rental_conversations c
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE c.id = conversation_id AND (c.renter_id = auth.uid() OR c.landlord_id = auth.uid()) AND NOT p.is_suspended));

CREATE POLICY user_blocks_participant_read ON public.user_blocks
  FOR SELECT TO authenticated
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

-- Internal: enriched thread projection. Only safe participant fields (never email/phone).
-- Left joins + coalesce so a deleted/unpublished listing yields 'removed' instead of breaking the thread.
CREATE FUNCTION public._rental_thread_json(p_conversation_id uuid, p_viewer uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  r record;
  v_blocked boolean;
  v_blocked_by_viewer boolean;
  v_status text;
BEGIN
  SELECT c.*, cp.id AS cp_id, cp.full_name AS cp_name, cp.avatar_url AS cp_avatar, cp.role AS cp_role,
         cp.is_suspended AS cp_suspended,
         li.title, li.price, li.address, li.city, li.status AS li_status, li.available, li.photo
    INTO r
  FROM public.rental_conversations c
  JOIN public.profiles cp ON cp.id = CASE WHEN c.renter_id = p_viewer THEN c.landlord_id ELSE c.renter_id END
  LEFT JOIN LATERAL (
    SELECT p.title, u.monthly_rent AS price, p.street_address AS address, p.city, p.status,
      COALESCE(p.status = 'approved' AND u.is_available, false) AS available,
      COALESCE(
        (SELECT e.elem->>'object_path'
           FROM public.property_submissions s,
             pg_catalog.jsonb_array_elements(CASE WHEN pg_catalog.jsonb_typeof(s.snapshot_media) = 'array' THEN s.snapshot_media ELSE '[]'::jsonb END)
               WITH ORDINALITY AS e(elem, ord)
          WHERE s.property_id = p.id AND s.superseded_by IS NULL AND e.elem->>'kind' = 'photo'
          ORDER BY s.created_at DESC, e.ord LIMIT 1),
        (SELECT m.object_path
           FROM public.property_submissions s
           JOIN public.property_draft_media m ON m.draft_id = s.draft_id
          WHERE s.property_id = p.id AND s.superseded_by IS NULL
            AND m.confirmed AND m.released_at IS NULL AND m.kind = 'photo'
          ORDER BY s.created_at DESC, m.created_at LIMIT 1)
      ) AS photo
    FROM public.properties p
    LEFT JOIN LATERAL (
      SELECT u2.monthly_rent, u2.is_available FROM public.rental_units u2 WHERE u2.property_id = p.id
      ORDER BY u2.is_available DESC, u2.created_at, u2.id LIMIT 1
    ) u ON true
    WHERE c.listing_source = 'property' AND p.id = c.listing_id
    UNION ALL
    SELECT l.title, l.price, l.address, l.city, l.status,
      (l.status = 'published' AND l.is_available) AS available, l.image_urls[1] AS photo
    FROM public.listings l
    WHERE c.listing_source = 'listing' AND l.id = c.listing_id
  ) li ON true
  WHERE c.id = p_conversation_id;

  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(pg_catalog.bool_or(true), false),
         COALESCE(pg_catalog.bool_or(b.blocker_id = p_viewer), false)
    INTO v_blocked, v_blocked_by_viewer
  FROM public.user_blocks b
  WHERE (b.blocker_id = r.renter_id AND b.blocked_id = r.landlord_id)
     OR (b.blocker_id = r.landlord_id AND b.blocked_id = r.renter_id);

  v_status := COALESCE(r.li_status, 'removed');

  RETURN pg_catalog.jsonb_build_object(
    'id', r.id,
    'listingSource', r.listing_source,
    'listingId', r.listing_id,
    'listingTitle', COALESCE(r.title, 'Listing unavailable'),
    'listingPrice', r.price,
    'listingAddress', r.address,
    'listingCity', r.city,
    'listingStatus', v_status,
    'listingAvailable', COALESCE(r.available, false),
    'listingPhotoPath', r.photo,
    'counterpart', pg_catalog.jsonb_build_object(
      'id', r.cp_id, 'fullName', r.cp_name, 'avatarUrl', r.cp_avatar, 'role', r.cp_role, 'isSuspended', r.cp_suspended),
    'unreadCount', CASE WHEN r.renter_id = p_viewer THEN r.renter_unread_count ELSE r.landlord_unread_count END,
    'isArchived', (CASE WHEN r.renter_id = p_viewer THEN r.renter_archived_at ELSE r.landlord_archived_at END) IS NOT NULL,
    'isBlocked', v_blocked,
    'blockedByViewer', v_blocked_by_viewer,
    'canSend', r.status = 'active' AND NOT r.cp_suspended AND NOT v_blocked AND v_status IN ('approved', 'published'),
    'lastMessagePreview', r.last_message_preview,
    'lastMessageAt', r.last_message_at,
    'createdAt', r.created_at
  );
END;
$$;

CREATE FUNCTION public.send_initial_rental_inquiry(p_listing_id uuid, p_operation_id uuid, p_body text)
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
    IF v_pstatus <> 'approved' OR NOT v_unit THEN
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

CREATE FUNCTION public.send_rental_message(p_conversation_id uuid, p_operation_id uuid, p_body text)
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
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user AND role IN ('renter', 'landlord') AND NOT is_suspended
  ) THEN
    RAISE EXCEPTION 'only active renters and landlords can send messages' USING ERRCODE = '42501';
  END IF;
  IF p_conversation_id IS NULL OR p_operation_id IS NULL OR length(v_trimmed) NOT BETWEEN 1 AND 2000 THEN
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
    RETURN pg_catalog.jsonb_build_object('id', v_msg.id, 'conversationId', v_conv.id, 'senderId', v_user,
      'operationId', p_operation_id, 'body', v_msg.body, 'createdAt', v_msg.created_at, 'replayed', true);
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
    SELECT EXISTS (SELECT 1 FROM public.properties p WHERE p.id = v_conv.listing_id AND p.status = 'approved') INTO v_listing_ok;
  ELSE
    SELECT EXISTS (SELECT 1 FROM public.listings l WHERE l.id = v_conv.listing_id AND l.status = 'published') INTO v_listing_ok;
  END IF;
  IF NOT v_listing_ok THEN
    RAISE EXCEPTION 'listing is no longer available' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.rental_messages(conversation_id, sender_id, operation_id, body)
  VALUES (v_conv.id, v_user, p_operation_id, v_trimmed)
  RETURNING * INTO v_msg;

  UPDATE public.rental_conversations SET
    renter_unread_count = CASE WHEN v_is_renter THEN 0 ELSE renter_unread_count + 1 END,
    landlord_unread_count = CASE WHEN v_is_renter THEN landlord_unread_count + 1 ELSE 0 END,
    renter_last_read_at = CASE WHEN v_is_renter THEN pg_catalog.now() ELSE renter_last_read_at END,
    landlord_last_read_at = CASE WHEN v_is_renter THEN landlord_last_read_at ELSE pg_catalog.now() END,
    renter_archived_at = NULL, landlord_archived_at = NULL,
    last_message_at = v_msg.created_at,
    last_message_preview = pg_catalog.left(v_trimmed, 200),
    updated_at = pg_catalog.now()
  WHERE id = v_conv.id;

  RETURN pg_catalog.jsonb_build_object('id', v_msg.id, 'conversationId', v_conv.id, 'senderId', v_user,
    'operationId', p_operation_id, 'body', v_msg.body, 'createdAt', v_msg.created_at, 'replayed', false);
END;
$$;

CREATE FUNCTION public.mark_rental_conversation_read(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_hit integer;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user AND role IN ('renter', 'landlord') AND NOT is_suspended
  ) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.rental_conversations SET
    renter_unread_count = CASE WHEN renter_id = v_user THEN 0 ELSE renter_unread_count END,
    landlord_unread_count = CASE WHEN landlord_id = v_user THEN 0 ELSE landlord_unread_count END,
    renter_last_read_at = CASE WHEN renter_id = v_user THEN pg_catalog.now() ELSE renter_last_read_at END,
    landlord_last_read_at = CASE WHEN landlord_id = v_user THEN pg_catalog.now() ELSE landlord_last_read_at END
  WHERE id = p_conversation_id AND (renter_id = v_user OR landlord_id = v_user);
  GET DIAGNOSTICS v_hit = ROW_COUNT;
  IF v_hit = 0 THEN
    RAISE EXCEPTION 'conversation not found or access denied' USING ERRCODE = '42501';
  END IF;

  RETURN pg_catalog.jsonb_build_object('conversationId', p_conversation_id, 'unreadCount', 0);
END;
$$;

CREATE FUNCTION public.set_rental_conversation_archived(p_conversation_id uuid, p_archived boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_hit integer;
  v_at timestamptz := CASE WHEN COALESCE(p_archived, false) THEN pg_catalog.now() ELSE NULL END;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user AND role IN ('renter', 'landlord') AND NOT is_suspended
  ) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.rental_conversations SET
    renter_archived_at = CASE WHEN renter_id = v_user THEN v_at ELSE renter_archived_at END,
    landlord_archived_at = CASE WHEN landlord_id = v_user THEN v_at ELSE landlord_archived_at END,
    renter_unread_count = CASE WHEN renter_id = v_user AND v_at IS NOT NULL THEN 0 ELSE renter_unread_count END,
    landlord_unread_count = CASE WHEN landlord_id = v_user AND v_at IS NOT NULL THEN 0 ELSE landlord_unread_count END
  WHERE id = p_conversation_id AND (renter_id = v_user OR landlord_id = v_user);
  GET DIAGNOSTICS v_hit = ROW_COUNT;
  IF v_hit = 0 THEN
    RAISE EXCEPTION 'conversation not found or access denied' USING ERRCODE = '42501';
  END IF;

  RETURN pg_catalog.jsonb_build_object('conversationId', p_conversation_id, 'archived', COALESCE(p_archived, false));
END;
$$;

-- p_include_archived = false: caller's non-archived threads; true: all caller's threads (isArchived marks them).
CREATE FUNCTION public.list_rental_conversations(p_include_archived boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user AND role IN ('renter', 'landlord') AND NOT is_suspended
  ) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- shortcut: capped at 200 threads, no cursor; upgrade when inboxes outgrow it.
  SELECT COALESCE(pg_catalog.jsonb_agg(public._rental_thread_json(t.id, v_user) ORDER BY t.last_message_at DESC, t.id), '[]'::jsonb)
    INTO v_result
  FROM (
    SELECT c.id, c.last_message_at FROM public.rental_conversations c
    WHERE (
      COALESCE(p_include_archived, false)
      AND (c.renter_id = v_user OR c.landlord_id = v_user)
    )
    OR (
      NOT COALESCE(p_include_archived, false)
      AND (
        (c.renter_id = v_user AND c.renter_archived_at IS NULL)
        OR (c.landlord_id = v_user AND c.landlord_archived_at IS NULL)
      )
    )
    ORDER BY c.last_message_at DESC, c.id LIMIT 200
  ) t;
  RETURN v_result;
END;
$$;

CREATE FUNCTION public.get_rental_conversation_detail(p_conversation_id uuid, p_before timestamptz DEFAULT NULL, p_limit integer DEFAULT 50)
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

  -- Fetch one extra (oldest) row to detect further pages; it is excluded from the page.
  SELECT COALESCE(pg_catalog.jsonb_agg(x.j ORDER BY x.created_at, x.id) FILTER (WHERE x.rn <= v_limit), '[]'::jsonb),
         COALESCE(pg_catalog.max(x.rn), 0)
    INTO v_messages, v_count
  FROM (
    SELECT m.id, m.created_at,
      pg_catalog.row_number() OVER (ORDER BY m.created_at DESC, m.id DESC) AS rn,
      pg_catalog.jsonb_build_object('id', m.id, 'conversationId', m.conversation_id,
        'senderId', m.sender_id, 'operationId', m.operation_id, 'body', m.body, 'createdAt', m.created_at) AS j
    FROM public.rental_messages m
    WHERE m.conversation_id = p_conversation_id AND (p_before IS NULL OR m.created_at < p_before)
    ORDER BY m.created_at DESC, m.id DESC LIMIT v_limit + 1
  ) x;

  RETURN pg_catalog.jsonb_build_object(
    'thread', public._rental_thread_json(p_conversation_id, v_user),
    'messages', v_messages,
    'hasMore', v_count > v_limit);
END;
$$;

CREATE FUNCTION public.get_unread_rental_message_count()
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user AND role IN ('renter', 'landlord') AND NOT is_suspended
  ) THEN
    RETURN 0;
  END IF;
  RETURN (
    SELECT COALESCE(SUM(CASE
      WHEN c.renter_id = v_user AND c.renter_archived_at IS NULL THEN c.renter_unread_count
      WHEN c.landlord_id = v_user AND c.landlord_archived_at IS NULL THEN c.landlord_unread_count
      ELSE 0 END), 0)::integer
    FROM public.rental_conversations c
    WHERE c.renter_id = v_user OR c.landlord_id = v_user);
END;
$$;

CREATE FUNCTION public.set_user_block(p_target_user_id uuid, p_blocked boolean, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user AND role IN ('renter', 'landlord') AND NOT is_suspended
  ) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_target_user_id IS NULL OR p_target_user_id = v_user THEN
    RAISE EXCEPTION 'invalid block target' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.rental_conversations c
    WHERE (c.renter_id = v_user AND c.landlord_id = p_target_user_id)
       OR (c.landlord_id = v_user AND c.renter_id = p_target_user_id)
  ) THEN
    RAISE EXCEPTION 'can only block conversation counterparts' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(p_blocked, false) THEN
    INSERT INTO public.user_blocks(blocker_id, blocked_id, reason)
    VALUES (v_user, p_target_user_id, NULLIF(pg_catalog.btrim(p_reason), ''))
    ON CONFLICT (blocker_id, blocked_id) DO UPDATE SET reason = EXCLUDED.reason;
  ELSE
    DELETE FROM public.user_blocks WHERE blocker_id = v_user AND blocked_id = p_target_user_id;
  END IF;

  RETURN pg_catalog.jsonb_build_object('targetUserId', p_target_user_id, 'blocked', COALESCE(p_blocked, false));
END;
$$;

REVOKE ALL ON FUNCTION public._rental_thread_json(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_initial_rental_inquiry(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_rental_message(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_rental_conversation_read(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_rental_conversation_archived(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_rental_conversations(boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_rental_conversation_detail(uuid, timestamptz, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_unread_rental_message_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_user_block(uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_initial_rental_inquiry(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_rental_message(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_rental_conversation_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_rental_conversation_archived(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_rental_conversations(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rental_conversation_detail(uuid, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_rental_message_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_block(uuid, boolean, text) TO authenticated;

COMMIT;
