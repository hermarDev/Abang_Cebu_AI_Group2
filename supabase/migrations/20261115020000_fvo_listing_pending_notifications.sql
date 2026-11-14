-- FVO notification triggers for field verification workflow
BEGIN;

-- Extend notifications type & entity_type constraints safely (if needed)
DO $$
DECLARE
  v_con record;
BEGIN
  FOR v_con IN
    SELECT c.conname
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class r ON r.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public' AND r.relname = 'notifications' AND c.contype = 'c'
      AND (pg_catalog.pg_get_constraintdef(c.oid) ILIKE '%type%' OR pg_catalog.pg_get_constraintdef(c.oid) ILIKE '%entity_type%')
  LOOP
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', v_con.conname);
  END LOOP;

  ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check CHECK (type IN (
      'message', 'inquiry', 'listing_update', 'listing_review', 'listing_pending', 'report', 'security', 'support'
    )),
    ADD CONSTRAINT notifications_entity_type_check CHECK (
      entity_type IS NULL OR entity_type IN ('conversation', 'property', 'report', 'account', 'support_ticket')
    );
END $$;

-- 1. Trigger function: Notify FVOs when a new property submission needs field verification
CREATE OR REPLACE FUNCTION public.trg_notify_fvo_on_property_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_prop_title text;
  v_prop_barangay text;
  v_prop_city text;
  v_location text;
  v_body text;
  v_link text;
  v_fvo_id uuid;
BEGIN
  IF NEW.review_status <> 'pending'
     OR NEW.field_verification_status <> 'pending_verification'
     OR NEW.superseded_by IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.title, p.barangay, p.city
  INTO v_prop_title, v_prop_barangay, v_prop_city
  FROM public.properties p
  WHERE p.id = NEW.property_id;

  IF NOT FOUND OR v_prop_title IS NULL THEN
    v_prop_title := NEW.snapshot_payload->'property'->>'title';
    v_prop_barangay := NEW.snapshot_payload->'property'->>'barangay';
    v_prop_city := NEW.snapshot_payload->'property'->>'city';
  END IF;

  v_prop_title := COALESCE(NULLIF(pg_catalog.btrim(v_prop_title), ''), 'Property');
  v_location := COALESCE(
    NULLIF(pg_catalog.concat_ws(', ', NULLIF(pg_catalog.btrim(v_prop_barangay), ''), NULLIF(pg_catalog.btrim(v_prop_city), '')), ''),
    'Unknown location'
  );

  v_body := 'New listing "' || v_prop_title || '" in ' || v_location || ' needs field verification.';
  IF length(v_body) > 180 THEN
    v_body := pg_catalog.substr(v_body, 1, 177) || '...';
  END IF;

  v_link := '/verification/queue?status=pending_verification&propertyId=' || NEW.property_id::text;

  FOR v_fvo_id IN
    SELECT p.id FROM public.profiles p
    WHERE p.role = 'verification_officer' AND NOT p.is_suspended
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.recipient_id = v_fvo_id
        AND n.type = 'listing_pending'
        AND n.entity_type = 'property'
        AND n.entity_id = NEW.property_id
        AND NOT n.is_read
    ) THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, title, body, link, entity_type, entity_id)
      VALUES (v_fvo_id, NEW.owner_id, 'listing_pending', 'New listing needs field verification', v_body, v_link, 'property', NEW.property_id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 2. Trigger: AFTER INSERT on property_submissions
DROP TRIGGER IF EXISTS trg_notify_fvo_property_submission ON public.property_submissions;
CREATE TRIGGER trg_notify_fvo_property_submission
  AFTER INSERT ON public.property_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_fvo_on_property_submission();

-- 3. Trigger function: Mark FVO alerts read and notify admins on field verification completion
CREATE OR REPLACE FUNCTION public.trg_notify_on_field_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id uuid;
  v_prop_title text;
  v_body text;
  v_link text;
  v_title text;
  v_type text;
BEGIN
  UPDATE public.notifications n
  SET is_read = true, read_at = pg_catalog.now()
  WHERE n.entity_type = 'property'
    AND n.entity_id = NEW.property_id
    AND n.type = 'listing_pending'
    AND NOT n.is_read
    AND EXISTS (
      SELECT 1 FROM public.profiles vp
      WHERE vp.id = n.recipient_id AND vp.role = 'verification_officer'
    );

  SELECT COALESCE(NULLIF(pg_catalog.btrim(p.title), ''), 'Property')
  INTO v_prop_title
  FROM public.properties p
  WHERE p.id = NEW.property_id;

  v_prop_title := COALESCE(v_prop_title, 'Property');

  IF NEW.status = 'verified' THEN
    v_title := 'Listing field-verified';
    v_body := '"' || v_prop_title || '" was field-verified and is ready for admin review.';
    v_type := 'listing_pending';
    v_link := '/admin/reviews?status=pending';
  ELSIF NEW.status = 'flagged' THEN
    v_title := 'Field verification flagged listing';
    v_body := '"' || v_prop_title || '" was flagged during field verification. Review required.';
    v_type := 'report';
    v_link := '/admin/reviews?status=pending';
  ELSE
    RETURN NEW;
  END IF;

  IF length(v_body) > 180 THEN
    v_body := pg_catalog.substr(v_body, 1, 177) || '...';
  END IF;

  FOR v_admin_id IN
    SELECT p.id FROM public.profiles p
    WHERE p.role = 'admin' AND NOT p.is_suspended
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.recipient_id = v_admin_id
        AND n.type = v_type
        AND n.entity_type = 'property'
        AND n.entity_id = NEW.property_id
        AND NOT n.is_read
    ) THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, title, body, link, entity_type, entity_id)
      VALUES (v_admin_id, NEW.officer_id, v_type, v_title, v_body, v_link, 'property', NEW.property_id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 4. Trigger: AFTER INSERT on property_field_verifications
DROP TRIGGER IF EXISTS trg_notify_field_verification ON public.property_field_verifications;
CREATE TRIGGER trg_notify_field_verification
  AFTER INSERT ON public.property_field_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_on_field_verification();

COMMIT;
