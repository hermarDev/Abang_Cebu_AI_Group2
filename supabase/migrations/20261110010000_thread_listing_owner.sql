-- Migration: 20261110010000_thread_listing_owner.sql
-- Expose the listing owner (rental_conversations.landlord_id) explicitly on thread JSON.
-- `counterpart` stays "the other participant" (used for chat UI); it must not be used as the listing owner,
-- because for a landlord viewer it is the renter.

BEGIN;

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
         lo.id AS lo_id, lo.full_name AS lo_name, lo.avatar_url AS lo_avatar, lo.role AS lo_role,
         lo.is_suspended AS lo_suspended,
         li.title, li.price, li.address, li.city, li.status AS li_status, li.available, li.photo
    INTO r
  FROM public.rental_conversations c
  JOIN public.profiles cp ON cp.id = CASE WHEN c.renter_id = p_viewer THEN c.landlord_id ELSE c.renter_id END
  LEFT JOIN public.profiles lo ON lo.id = c.landlord_id
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
    'listingOwner', CASE WHEN r.lo_id IS NULL THEN NULL ELSE pg_catalog.jsonb_build_object(
      'id', r.lo_id, 'fullName', r.lo_name, 'avatarUrl', r.lo_avatar, 'role', r.lo_role, 'isSuspended', r.lo_suspended) END,
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
