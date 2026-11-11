BEGIN;

-- 1. Ensure public.notifications is added to supabase_realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END $$;

-- 2. Update rental message trigger: distinguish first inquiry from subsequent messages
CREATE OR REPLACE FUNCTION public.trg_notify_on_rental_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_conv public.rental_conversations%ROWTYPE;
  v_recipient uuid;
  v_type text;
  v_title text;
  v_link text;
  v_body text;
BEGIN
  SELECT * INTO v_conv FROM public.rental_conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_id = v_conv.renter_id THEN
    v_recipient := v_conv.landlord_id;
    -- If previous messages exist in this thread, title as 'New message' instead of 'New inquiry'
    IF EXISTS (
      SELECT 1 FROM public.rental_messages 
      WHERE conversation_id = NEW.conversation_id AND id != NEW.id
    ) THEN
      v_type := 'message';
      v_title := 'New message';
    ELSE
      v_type := 'inquiry';
      v_title := 'New inquiry';
    END IF;
    v_link := '/landlord/messages?thread=' || v_conv.id::text;
  ELSE
    v_recipient := v_conv.renter_id;
    v_type := 'message';
    v_title := 'New message';
    v_link := '/messages?thread=' || v_conv.id::text;
  END IF;

  v_body := pg_catalog.btrim(NEW.body);
  IF length(v_body) = 0 THEN
    v_body := 'Sent an attachment';
  ELSIF length(v_body) > 120 THEN
    v_body := pg_catalog.substr(v_body, 1, 117) || '...';
  END IF;

  INSERT INTO public.notifications (recipient_id, actor_id, type, title, body, link, entity_type, entity_id)
  VALUES (v_recipient, NEW.sender_id, v_type, v_title, v_body, v_link, 'conversation', v_conv.id);

  RETURN NEW;
END;
$$;

-- 3. Update property review trigger: deep-link to landlord properties status & highlight
CREATE OR REPLACE FUNCTION public.trg_notify_on_property_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_owner uuid;
  v_prop_title text;
  v_title text;
  v_body text;
  v_link text;
BEGIN
  SELECT landlord_id, title INTO v_owner, v_prop_title FROM public.properties WHERE id = NEW.property_id;
  IF NOT FOUND OR v_owner IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.decision = 'approved' THEN
    v_title := 'Listing approved';
    v_body := 'Your property "' || COALESCE(v_prop_title, 'Listing') || '" has been approved and is now live.';
    v_link := '/landlord/properties?status=approved&highlight=' || NEW.property_id::text;
  ELSE
    v_title := 'Listing review update';
    v_body := 'Your property "' || COALESCE(v_prop_title, 'Listing') || '" requires changes: ' || COALESCE(NEW.note, 'Please see review notes.');
    IF length(v_body) > 180 THEN
      v_body := pg_catalog.substr(v_body, 1, 177) || '...';
    END IF;
    v_link := '/landlord/properties?status=rejected&highlight=' || NEW.property_id::text;
  END IF;

  INSERT INTO public.notifications (recipient_id, actor_id, type, title, body, link, entity_type, entity_id)
  VALUES (v_owner, NEW.admin_id, 'listing_review', v_title, v_body, v_link, 'property', NEW.property_id);

  RETURN NEW;
END;
$$;

COMMIT;
