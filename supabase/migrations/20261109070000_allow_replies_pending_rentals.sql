-- Migration: 20261109070000_allow_replies_pending_rentals.sql
-- Allow replies and compose for pending properties in send_rental_message and _rental_thread_json

BEGIN;

CREATE OR REPLACE FUNCTION public.send_rental_message(p_conversation_id uuid, p_operation_id uuid, p_body text)
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
    SELECT EXISTS (SELECT 1 FROM public.properties p WHERE p.id = v_conv.listing_id AND p.status IN ('approved', 'pending')) INTO v_listing_ok;
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
    last_message_at = pg_catalog.clock_timestamp(),
    last_message_preview = pg_catalog.left(v_trimmed, 200),
    updated_at = pg_catalog.now()
  WHERE id = v_conv.id;

  RETURN pg_catalog.jsonb_build_object(
    'id', v_msg.id, 'conversationId', v_conv.id, 'senderId', v_user,
    'operationId', p_operation_id, 'body', v_msg.body, 'createdAt', v_msg.created_at, 'replayed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.send_rental_message(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_rental_message(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public._rental_thread_json(p_conversation_id uuid, p_viewer uuid)
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
      COALESCE((p.status = 'approved' OR p.status = 'pending') AND COALESCE(u.is_available, true), false) AS available,
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
    'canSend', r.status = 'active' AND NOT r.cp_suspended AND NOT v_blocked AND v_status IN ('approved', 'pending', 'published'),
    'lastMessagePreview', r.last_message_preview,
    'lastMessageAt', r.last_message_at,
    'createdAt', r.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public._rental_thread_json(uuid, uuid) FROM PUBLIC, anon, authenticated;

COMMIT;
