\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id, raw_user_meta_data, email, phone) VALUES
 ('a6000000-0000-4000-8000-000000000001', '{"role":"renter","full_name":"Renter One"}', 'r1-secret@example.com', '+639170000001'),
 ('a6000000-0000-4000-8000-000000000002', '{"role":"renter","full_name":"Renter Two"}', 'r2-secret@example.com', '+639170000002'),
 ('a6000000-0000-4000-8000-000000000003', '{"role":"landlord","full_name":"Landlord Three"}', 'l3-secret@example.com', '+639170000003'),
 ('a6000000-0000-4000-8000-000000000004', '{"role":"landlord","full_name":"Landlord Four"}', 'l4-secret@example.com', '+639170000004'),
 ('a6000000-0000-4000-8000-000000000005', '{"role":"admin","full_name":"Admin Five"}', 'a5-secret@example.com', '+639170000005');
UPDATE public.profiles SET role = 'admin' WHERE id = 'a6000000-0000-4000-8000-000000000005';
UPDATE public.profiles SET phone_number = '+639170000003' WHERE id = 'a6000000-0000-4000-8000-000000000003';

INSERT INTO public.properties(id, landlord_id, title, description, property_type, street_address, barangay, city, coordinates, status) VALUES
 ('b6000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000003', 'Approved A', 'Description', 'house', 'Street', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326), 'approved'),
 ('b6000000-0000-4000-8000-000000000002', 'a6000000-0000-4000-8000-000000000003', 'Pending B', 'Description', 'house', 'Street', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326), 'pending'),
 ('b6000000-0000-4000-8000-000000000003', 'a6000000-0000-4000-8000-000000000003', 'Rejected C', 'Description', 'house', 'Street', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326), 'rejected'),
 ('b6000000-0000-4000-8000-000000000004', 'a6000000-0000-4000-8000-000000000003', 'Archived D', 'Description', 'house', 'Street', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326), 'archived'),
 ('b6000000-0000-4000-8000-000000000005', 'a6000000-0000-4000-8000-000000000004', 'Approved E', 'Description', 'house', 'Street', 'Apas', 'Cebu City', extensions.ST_SetSRID(extensions.ST_MakePoint(123.9,10.3),4326), 'approved');
INSERT INTO public.rental_units(property_id, rental_type, monthly_rent)
SELECT id, 'private_room', 5000 FROM public.properties WHERE id::text LIKE 'b6000000-0000-4000-8000-0000000000%';
INSERT INTO public.listings(id, title, price, latitude, longitude, address, owner_id, status, published_at) VALUES
 ('c6000000-0000-4000-8000-000000000001', 'Published L', 3000, 10.3, 123.9, 'Addr', 'a6000000-0000-4000-8000-000000000003', 'published', now()),
 ('c6000000-0000-4000-8000-000000000002', 'Draft L', 3000, 10.3, 123.9, 'Addr', 'a6000000-0000-4000-8000-000000000003', 'draft', NULL);

-- Test helper: lookup bypassing RLS (rolled back with the transaction).
CREATE FUNCTION public.test_conv(p uuid) RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ SELECT id FROM public.rental_conversations WHERE listing_id = p $$;
GRANT EXECUTE ON FUNCTION public.test_conv(uuid) TO authenticated;

SET LOCAL ROLE authenticated;

-- 0. Table privileges: no direct writes, admin has no read of others' threads.
SELECT set_config('request.jwt.claim.sub', 'a6000000-0000-4000-8000-000000000001', true);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.rental_messages(conversation_id, sender_id, operation_id, body) VALUES (gen_random_uuid(), 'a6000000-0000-4000-8000-000000000001', gen_random_uuid(), 'x');
    RAISE EXCEPTION 'direct insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.user_blocks;
    RAISE EXCEPTION 'direct delete allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- 1-3. Initial inquiry on approved property + published listing; replay; reuse.
DO $$
DECLARE
  r1 uuid := 'a6000000-0000-4000-8000-000000000001'; l3 uuid := 'a6000000-0000-4000-8000-000000000003';
  p uuid := 'b6000000-0000-4000-8000-000000000001'; op1 uuid := 'e6000000-0000-4000-8000-000000000001';
  r jsonb; r2 jsonb; r3 jsonb; n int; c public.rental_conversations%ROWTYPE;
BEGIN
  r := public.send_initial_rental_inquiry(p, op1, '  Is it available?  ');
  IF (r->>'replayed')::boolean THEN RAISE EXCEPTION 'first send flagged replay'; END IF;
  SELECT * INTO c FROM public.rental_conversations WHERE id = (r->>'conversationId')::uuid;
  IF c.landlord_unread_count <> 1 OR c.renter_unread_count <> 0 OR c.listing_source <> 'property' OR c.landlord_id <> l3
     OR c.last_message_preview <> 'Is it available?' THEN
    RAISE EXCEPTION 'bad conversation %', to_jsonb(c);
  END IF;
  -- 2. replay
  r2 := public.send_initial_rental_inquiry(p, op1, 'Is it available?');
  IF NOT (r2->>'replayed')::boolean OR r2->>'messageId' <> r->>'messageId' OR r2->>'conversationId' <> r->>'conversationId' THEN
    RAISE EXCEPTION 'bad replay %', r2;
  END IF;
  SELECT count(*) INTO n FROM public.rental_messages WHERE conversation_id = c.id;
  IF n <> 1 THEN RAISE EXCEPTION 'replay duplicated message'; END IF;
  SELECT * INTO c FROM public.rental_conversations WHERE id = c.id;
  IF c.landlord_unread_count <> 1 THEN RAISE EXCEPTION 'replay double-incremented unread'; END IF;
  BEGIN
    PERFORM public.send_initial_rental_inquiry(p, op1, 'Different body');
    RAISE EXCEPTION 'op reuse with different body accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  -- 3. second inquiry reuses conversation
  r3 := public.send_initial_rental_inquiry(p, 'e6000000-0000-4000-8000-000000000002', 'Follow up');
  IF r3->>'conversationId' <> r->>'conversationId' THEN RAISE EXCEPTION 'new conversation created for same listing'; END IF;
  SELECT * INTO c FROM public.rental_conversations WHERE id = c.id;
  IF c.landlord_unread_count <> 2 THEN RAISE EXCEPTION 'unread should be 2, got %', c.landlord_unread_count; END IF;
  -- published listing source
  r := public.send_initial_rental_inquiry('c6000000-0000-4000-8000-000000000001', 'e6000000-0000-4000-8000-000000000003', 'Listing hello');
  SELECT * INTO c FROM public.rental_conversations WHERE id = (r->>'conversationId')::uuid;
  IF c.listing_source <> 'listing' OR c.landlord_unread_count <> 1 THEN RAISE EXCEPTION 'bad listing conversation'; END IF;

  -- 3b. Inquiry on pending property is allowed
  r := public.send_initial_rental_inquiry('b6000000-0000-4000-8000-000000000002', 'e6000000-0000-4000-8000-000000000004', 'Is pending property available?');
  SELECT * INTO c FROM public.rental_conversations WHERE id = (r->>'conversationId')::uuid;
  IF c.listing_source <> 'property' OR c.landlord_unread_count <> 1 THEN RAISE EXCEPTION 'bad pending property conversation'; END IF;
END $$;

-- 4. Non-public targets, own listing, landlord/admin callers, bad input are rejected.
DO $$
DECLARE s text; id uuid;
BEGIN
  FOREACH id IN ARRAY ARRAY['b6000000-0000-4000-8000-000000000003','b6000000-0000-4000-8000-000000000004','c6000000-0000-4000-8000-000000000002']::uuid[] LOOP
    BEGIN
      PERFORM public.send_initial_rental_inquiry(id, gen_random_uuid(), 'hi');
      RAISE EXCEPTION 'inquiry on non-public % allowed', id;
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  END LOOP;
  BEGIN
    PERFORM public.send_initial_rental_inquiry(gen_random_uuid(), gen_random_uuid(), 'hi');
    RAISE EXCEPTION 'unknown listing accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.send_initial_rental_inquiry('b6000000-0000-4000-8000-000000000001', gen_random_uuid(), '   ');
    RAISE EXCEPTION 'blank body accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.send_initial_rental_inquiry('b6000000-0000-4000-8000-000000000001', gen_random_uuid(), repeat('x', 2001));
    RAISE EXCEPTION 'overlong body accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub', 'a6000000-0000-4000-8000-000000000003', true);
  BEGIN
    PERFORM public.send_initial_rental_inquiry('b6000000-0000-4000-8000-000000000005', gen_random_uuid(), 'landlord inquiry');
    RAISE EXCEPTION 'landlord initiated inquiry';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub', 'a6000000-0000-4000-8000-000000000005', true);
  BEGIN
    PERFORM public.list_rental_conversations();
    RAISE EXCEPTION 'admin list allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF public.get_unread_rental_message_count() <> 0 THEN RAISE EXCEPTION 'admin unread not 0'; END IF;
  IF (SELECT count(*) FROM public.rental_conversations) <> 0 OR (SELECT count(*) FROM public.rental_messages) <> 0 THEN
    RAISE EXCEPTION 'admin can read conversations directly';
  END IF;
END $$;

-- 5. Non-participants are rejected; RLS hides rows.
DO $$
DECLARE conv uuid; u text;
BEGIN
  conv := public.test_conv('b6000000-0000-4000-8000-000000000001');
  FOREACH u IN ARRAY ARRAY['a6000000-0000-4000-8000-000000000002','a6000000-0000-4000-8000-000000000004'] LOOP
    PERFORM set_config('request.jwt.claim.sub', u, true);
    BEGIN PERFORM public.get_rental_conversation_detail(conv); RAISE EXCEPTION 'detail allowed for %', u;
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN PERFORM public.send_rental_message(conv, gen_random_uuid(), 'intrude'); RAISE EXCEPTION 'send allowed for %', u;
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN PERFORM public.mark_rental_conversation_read(conv); RAISE EXCEPTION 'mark read allowed for %', u;
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN PERFORM public.set_rental_conversation_archived(conv, true); RAISE EXCEPTION 'archive allowed for %', u;
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN PERFORM public.set_user_block('a6000000-0000-4000-8000-000000000001', true, NULL); RAISE EXCEPTION 'block of non-counterpart allowed for %', u;
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    IF (SELECT count(*) FROM public.rental_conversations) <> 0 OR (SELECT count(*) FROM public.rental_messages) <> 0 THEN
      RAISE EXCEPTION 'RLS leak for %', u;
    END IF;
    IF jsonb_array_length(public.list_rental_conversations(true)) <> 0 THEN RAISE EXCEPTION 'list leak for %', u; END IF;
  END LOOP;
END $$;

-- 6. No email/phone leakage; unread/read/archive flows; landlord reply.
DO $$
DECLARE conv uuid; d jsonb; l jsonb; t jsonb; txt text; k text;
BEGIN
  conv := public.test_conv('b6000000-0000-4000-8000-000000000001');
  PERFORM set_config('request.jwt.claim.sub', 'a6000000-0000-4000-8000-000000000003', true);
  IF public.get_unread_rental_message_count() <> 3 THEN RAISE EXCEPTION 'landlord unread expected 3, got %', public.get_unread_rental_message_count(); END IF;
  l := public.list_rental_conversations();
  d := public.get_rental_conversation_detail(conv);
  txt := l::text || d::text;
  IF txt ~* 'secret@example|phone|email|\+6391700000' THEN RAISE EXCEPTION 'PII leaked: %', txt; END IF;
  t := d->'thread';
  FOR k IN SELECT jsonb_object_keys(t->'counterpart') LOOP
    IF k NOT IN ('id','fullName','avatarUrl','role','isSuspended') THEN RAISE EXCEPTION 'unexpected counterpart key %', k; END IF;
  END LOOP;
  IF t->'counterpart'->>'fullName' <> 'Renter One' OR t->>'listingTitle' <> 'Approved A' OR t->>'listingStatus' <> 'approved'
     OR NOT (t->>'listingAvailable')::boolean OR NOT (t->>'canSend')::boolean OR (t->>'unreadCount')::int <> 2 THEN
    RAISE EXCEPTION 'bad thread %', t;
  END IF;
  IF jsonb_array_length(d->'messages') <> 2 OR d->'messages'->0->>'body' <> 'Is it available?' OR (d->>'hasMore')::boolean THEN
    RAISE EXCEPTION 'bad messages %', d->'messages';
  END IF;
  -- pagination
  d := public.get_rental_conversation_detail(conv, NULL, 1);
  IF jsonb_array_length(d->'messages') <> 1 OR d->'messages'->0->>'body' <> 'Follow up' OR NOT (d->>'hasMore')::boolean THEN
    RAISE EXCEPTION 'bad pagination %', d;
  END IF;
  PERFORM public.mark_rental_conversation_read(conv);
  IF public.get_unread_rental_message_count() <> 1 THEN RAISE EXCEPTION 'unread after read expected 1 (listing thread)'; END IF;
  -- landlord reply bumps renter unread, resets landlord unread
  PERFORM public.send_rental_message(conv, 'e6000000-0000-4000-8000-0000000000a1', 'Yes it is');
  PERFORM public.set_rental_conversation_archived(conv, true);
  IF jsonb_array_length(public.list_rental_conversations()) <> 1 OR jsonb_array_length(public.list_rental_conversations(true)) <> 2 THEN
    RAISE EXCEPTION 'archive filter wrong';
  END IF;
  PERFORM set_config('request.jwt.claim.sub', 'a6000000-0000-4000-8000-000000000001', true);
  IF public.get_unread_rental_message_count() <> 1 THEN RAISE EXCEPTION 'renter unread expected 1'; END IF;
  -- renter reply resurfaces landlord's archived thread
  PERFORM public.send_rental_message(conv, 'e6000000-0000-4000-8000-0000000000a2', 'Great');
  PERFORM set_config('request.jwt.claim.sub', 'a6000000-0000-4000-8000-000000000003', true);
  IF jsonb_array_length(public.list_rental_conversations()) <> 2 THEN RAISE EXCEPTION 'reply did not resurface thread'; END IF;
  -- send_rental_message replay
  IF NOT (public.send_rental_message(conv, 'e6000000-0000-4000-8000-0000000000a1', 'Yes it is')->>'replayed')::boolean THEN
    RAISE EXCEPTION 'send replay not flagged';
  END IF;
  BEGIN PERFORM public.send_rental_message(conv, 'e6000000-0000-4000-8000-0000000000a1', 'Other'); RAISE EXCEPTION 'op reuse accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;

-- 7. Blocking: sends fail both ways, history stays readable, unblock restores.
DO $$
DECLARE conv uuid; d jsonb;
BEGIN
  conv := public.test_conv('b6000000-0000-4000-8000-000000000001');
  PERFORM set_config('request.jwt.claim.sub', 'a6000000-0000-4000-8000-000000000001', true);
  PERFORM public.set_user_block('a6000000-0000-4000-8000-000000000003', true, 'Spam');
  BEGIN PERFORM public.send_rental_message(conv, gen_random_uuid(), 'blocked?'); RAISE EXCEPTION 'blocker send allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.send_initial_rental_inquiry('b6000000-0000-4000-8000-000000000001', gen_random_uuid(), 'blocked?'); RAISE EXCEPTION 'blocker inquiry allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  d := public.get_rental_conversation_detail(conv);
  IF jsonb_array_length(d->'messages') <> 4 OR NOT (d->'thread'->>'isBlocked')::boolean OR NOT (d->'thread'->>'blockedByViewer')::boolean
     OR (d->'thread'->>'canSend')::boolean THEN RAISE EXCEPTION 'bad blocked detail %', d; END IF;
  IF (SELECT count(*) FROM public.user_blocks) <> 1 THEN RAISE EXCEPTION 'blocker cannot read own block'; END IF;
  PERFORM set_config('request.jwt.claim.sub', 'a6000000-0000-4000-8000-000000000003', true);
  BEGIN PERFORM public.send_rental_message(conv, gen_random_uuid(), 'blocked?'); RAISE EXCEPTION 'blocked-party send allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  d := public.get_rental_conversation_detail(conv);
  IF jsonb_array_length(d->'messages') <> 4 OR (d->'thread'->>'blockedByViewer')::boolean THEN RAISE EXCEPTION 'bad blocked-party detail %', d; END IF;
  PERFORM set_config('request.jwt.claim.sub', 'a6000000-0000-4000-8000-000000000001', true);
  PERFORM public.set_user_block('a6000000-0000-4000-8000-000000000003', false, NULL);
  PERFORM public.send_rental_message(conv, gen_random_uuid(), 'unblocked');
END $$;

-- 8. Archived listing keeps thread readable; sends rejected; suspended landlord rejected.
RESET ROLE;
UPDATE public.properties SET status = 'archived' WHERE id = 'b6000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
DO $$
DECLARE conv uuid; d jsonb;
BEGIN
  conv := public.test_conv('b6000000-0000-4000-8000-000000000001');
  PERFORM set_config('request.jwt.claim.sub', 'a6000000-0000-4000-8000-000000000001', true);
  d := public.get_rental_conversation_detail(conv);
  IF d->'thread'->>'listingStatus' <> 'archived' OR (d->'thread'->>'listingAvailable')::boolean OR (d->'thread'->>'canSend')::boolean
     OR jsonb_array_length(d->'messages') <> 5 THEN RAISE EXCEPTION 'bad archived-listing detail %', d; END IF;
  BEGIN PERFORM public.send_rental_message(conv, gen_random_uuid(), 'late'); RAISE EXCEPTION 'send on archived listing allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- Deleted listing: thread stays readable with 'removed' fallback.
RESET ROLE;
DELETE FROM public.listings WHERE id = 'c6000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
DO $$
DECLARE conv uuid; t jsonb;
BEGIN
  conv := public.test_conv('c6000000-0000-4000-8000-000000000001');
  PERFORM set_config('request.jwt.claim.sub', 'a6000000-0000-4000-8000-000000000001', true);
  t := public.get_rental_conversation_detail(conv)->'thread';
  IF t->>'listingStatus' <> 'removed' OR (t->>'listingAvailable')::boolean OR (t->>'canSend')::boolean THEN RAISE EXCEPTION 'bad removed listing %', t; END IF;
END $$;

RESET ROLE;
UPDATE public.properties SET status = 'approved' WHERE id = 'b6000000-0000-4000-8000-000000000001';
UPDATE public.profiles SET is_suspended = true WHERE id = 'a6000000-0000-4000-8000-000000000003';
SET LOCAL ROLE authenticated;
DO $$
DECLARE conv uuid; t jsonb;
BEGIN
  conv := public.test_conv('b6000000-0000-4000-8000-000000000001');
  PERFORM set_config('request.jwt.claim.sub', 'a6000000-0000-4000-8000-000000000001', true);
  BEGIN PERFORM public.send_rental_message(conv, gen_random_uuid(), 'to suspended'); RAISE EXCEPTION 'send to suspended landlord allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.send_initial_rental_inquiry('b6000000-0000-4000-8000-000000000001', gen_random_uuid(), 'x'); RAISE EXCEPTION 'inquiry to suspended landlord allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  t := public.get_rental_conversation_detail(conv)->'thread';
  IF (t->>'canSend')::boolean OR NOT (t->'counterpart'->>'isSuspended')::boolean THEN RAISE EXCEPTION 'bad suspended thread %', t; END IF;
  -- suspended caller is locked out entirely
  PERFORM set_config('request.jwt.claim.sub', 'a6000000-0000-4000-8000-000000000003', true);
  BEGIN PERFORM public.get_rental_conversation_detail(conv); RAISE EXCEPTION 'suspended caller read allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF (SELECT count(*) FROM public.rental_conversations) <> 0 THEN RAISE EXCEPTION 'suspended caller RLS read'; END IF;
END $$;

-- Anonymous cannot call RPCs.
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN PERFORM public.list_rental_conversations(); RAISE EXCEPTION 'anon execute allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
