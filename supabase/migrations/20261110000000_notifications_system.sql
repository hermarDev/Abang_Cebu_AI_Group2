BEGIN;

-- Unified Notification System
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('message', 'inquiry', 'listing_update', 'listing_review', 'listing_pending', 'report', 'security')),
  title text NOT NULL,
  body text NOT NULL,
  link text NOT NULL,
  entity_type text CHECK (entity_type IS NULL OR entity_type IN ('conversation', 'property', 'report', 'account')),
  entity_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications (recipient_id) WHERE NOT is_read;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can update own notification read status"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (recipient_id = auth.uid());

-- Trigger function for rental messages
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
    v_type := 'inquiry';
    v_title := 'New inquiry';
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

DROP TRIGGER IF EXISTS trg_notify_rental_message ON public.rental_messages;
CREATE TRIGGER trg_notify_rental_message
  AFTER INSERT ON public.rental_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_on_rental_message();

-- Trigger function for property reviews (notifying landlord)
CREATE OR REPLACE FUNCTION public.trg_notify_on_property_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_owner uuid;
  v_prop_title text;
  v_title text;
  v_body text;
BEGIN
  SELECT landlord_id, title INTO v_owner, v_prop_title FROM public.properties WHERE id = NEW.property_id;
  IF NOT FOUND OR v_owner IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.decision = 'approved' THEN
    v_title := 'Listing approved';
    v_body := 'Your property "' || COALESCE(v_prop_title, 'Listing') || '" has been approved and is now live.';
  ELSE
    v_title := 'Listing review update';
    v_body := 'Your property "' || COALESCE(v_prop_title, 'Listing') || '" requires changes: ' || COALESCE(NEW.note, 'Please see review notes.');
    IF length(v_body) > 180 THEN
      v_body := pg_catalog.substr(v_body, 1, 177) || '...';
    END IF;
  END IF;

  INSERT INTO public.notifications (recipient_id, actor_id, type, title, body, link, entity_type, entity_id)
  VALUES (v_owner, NEW.admin_id, 'listing_review', v_title, v_body, '/landlord/dashboard', 'property', NEW.property_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_property_review ON public.property_reviews;
CREATE TRIGGER trg_notify_property_review
  AFTER INSERT ON public.property_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_on_property_review();

-- Trigger function for abuse reports (notifying admins)
CREATE OR REPLACE FUNCTION public.trg_notify_on_abuse_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin_id uuid;
  v_body text;
BEGIN
  v_body := 'New report submitted under ' || COALESCE(NEW.category, 'general') || '.';
  FOR v_admin_id IN
    SELECT id FROM public.profiles WHERE role = 'admin' AND NOT is_suspended
  LOOP
    INSERT INTO public.notifications (recipient_id, actor_id, type, title, body, link, entity_type, entity_id)
    VALUES (v_admin_id, NEW.reporter_id, 'report', 'New report submitted', v_body, '/admin/reports', 'report', NEW.id);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_abuse_report ON public.abuse_reports;
CREATE TRIGGER trg_notify_abuse_report
  AFTER INSERT ON public.abuse_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_on_abuse_report();

COMMIT;
