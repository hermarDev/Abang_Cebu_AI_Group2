-- Unified Help Center & Contact Support: support_tickets, private bucket, RLS, audit & notification integration.
BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq START WITH 1001 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE DEFAULT ('SUP-' || pg_catalog.lpad(pg_catalog.nextval('public.support_ticket_seq')::text, 5, '0')),
  operation_id uuid NOT NULL UNIQUE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  requester_name text NOT NULL CHECK (length(pg_catalog.btrim(requester_name)) BETWEEN 2 AND 100),
  requester_email text NOT NULL CHECK (length(pg_catalog.btrim(requester_email)) BETWEEN 5 AND 254),
  requester_role text NOT NULL DEFAULT 'guest' CHECK (requester_role IN ('guest', 'renter', 'landlord', 'admin')),
  category text NOT NULL CHECK (category IN (
    'account_access',
    'rental_search',
    'listing_submission',
    'messaging_safety',
    'bug_report',
    'billing_or_policy',
    'other'
  )),
  subject text NOT NULL CHECK (length(pg_catalog.btrim(subject)) BETWEEN 5 AND 140),
  description text NOT NULL CHECK (length(pg_catalog.btrim(description)) BETWEEN 20 AND 3000),
  related_listing_id uuid,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (pg_catalog.jsonb_typeof(attachments) = 'array' AND pg_catalog.jsonb_array_length(attachments) <= 3),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  admin_response text CHECK (admin_response IS NULL OR length(pg_catalog.btrim(admin_response)) <= 2000),
  assigned_admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_access_token_hash text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_created
  ON public.support_tickets (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_status_created
  ON public.support_tickets (status, created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_tickets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT SELECT ON public.support_tickets TO authenticated;

DROP POLICY IF EXISTS support_tickets_owner_or_admin_read ON public.support_tickets;
CREATE POLICY support_tickets_owner_or_admin_read
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin' AND NOT p.is_suspended
    )
  );

-- Private storage bucket for support ticket attachments (accessed only via server routes).
LOCK TABLE storage.buckets IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE storage.objects IN SHARE ROW EXCLUSIVE MODE;

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments',
  'support-attachments',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS support_attachments_deny_clients ON storage.objects;
CREATE POLICY support_attachments_deny_clients
  ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (bucket_id <> 'support-attachments')
  WITH CHECK (bucket_id <> 'support-attachments');

-- Extend admin_audit_logs action_type & target_type constraints safely.
DO $$
DECLARE
  v_con record;
BEGIN
  FOR v_con IN
    SELECT c.conname
    FROM pg_catalog.pg_constraint c
    JOIN pg_catalog.pg_class r ON r.oid = c.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public' AND r.relname = 'admin_audit_logs' AND c.contype = 'c'
      AND (pg_catalog.pg_get_constraintdef(c.oid) ILIKE '%action_type%' OR pg_catalog.pg_get_constraintdef(c.oid) ILIKE '%target_type%')
  LOOP
    EXECUTE format('ALTER TABLE public.admin_audit_logs DROP CONSTRAINT %I', v_con.conname);
  END LOOP;

  ALTER TABLE public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_action_type_check CHECK (action_type IN (
      'property_approved', 'property_rejected', 'property_unpublished', 'property_restored',
      'account_suspended', 'account_reinstated', 'report_resolved', 'report_dismissed',
      'report_evidence_viewed', 'property_location_corrected', 'support_ticket_updated'
    )),
    ADD CONSTRAINT admin_audit_logs_target_type_check CHECK (target_type IN (
      'property', 'listing', 'account', 'report', 'support_ticket'
    ));
END $$;

-- Extend notifications type & entity_type constraints safely.
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

-- Notification triggers for support tickets.
CREATE OR REPLACE FUNCTION public.trg_notify_on_support_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id uuid;
  v_status_label text;
  v_body text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_body := NEW.ticket_number || ': ' || pg_catalog.left(NEW.subject, 100);
    FOR v_admin_id IN
      SELECT id FROM public.profiles WHERE role = 'admin' AND NOT is_suspended
    LOOP
      INSERT INTO public.notifications (recipient_id, actor_id, type, title, body, link, entity_type, entity_id)
      VALUES (v_admin_id, NEW.user_id, 'support', 'New support ticket', v_body, '/admin/support?ticket=' || NEW.id::text, 'support_ticket', NEW.id);
    END LOOP;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.user_id IS NOT NULL
     AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.admin_response IS DISTINCT FROM NEW.admin_response) THEN
    v_status_label := replace(NEW.status, '_', ' ');
    v_body := NEW.ticket_number || ' is now ' || v_status_label || '.';
    IF NEW.admin_response IS NOT NULL AND length(pg_catalog.btrim(NEW.admin_response)) > 0 THEN
      v_body := v_body || ' ' || pg_catalog.left(pg_catalog.btrim(NEW.admin_response), 90);
    END IF;
    INSERT INTO public.notifications (recipient_id, actor_id, type, title, body, link, entity_type, entity_id)
    VALUES (NEW.user_id, NEW.assigned_admin_id, 'support', 'Support ticket updated', v_body, '/support?ticket=' || NEW.id::text, 'support_ticket', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_support_ticket ON public.support_tickets;
CREATE TRIGGER trg_notify_support_ticket
  AFTER INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_on_support_ticket();

-- Submit support ticket RPC (server-only via service_role; supports guests and authenticated users safely).
CREATE OR REPLACE FUNCTION public.submit_support_ticket(
  p_operation_id uuid,
  p_requester_name text,
  p_requester_email text,
  p_category text,
  p_subject text,
  p_description text,
  p_related_listing_id uuid DEFAULT NULL,
  p_attachments jsonb DEFAULT '[]'::jsonb,
  p_ticket_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_guest_token_hash text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := COALESCE(auth.uid(), p_user_id);
  v_ticket_id uuid := COALESCE(p_ticket_id, gen_random_uuid());
  v_role text := 'guest';
  v_name text := pg_catalog.btrim(COALESCE(p_requester_name, ''));
  v_email text := lower(pg_catalog.btrim(COALESCE(p_requester_email, '')));
  v_subject text := pg_catalog.btrim(COALESCE(p_subject, ''));
  v_description text := pg_catalog.btrim(COALESCE(p_description, ''));
  v_attachments jsonb := COALESCE(p_attachments, '[]'::jsonb);
  v_guest_hash text := NULLIF(pg_catalog.btrim(COALESCE(p_guest_token_hash, '')), '');
  v_elem jsonb;
  v_path text;
  v_existing public.support_tickets%ROWTYPE;
  v_inserted public.support_tickets%ROWTYPE;
BEGIN
  IF p_operation_id IS NULL
     OR length(v_name) NOT BETWEEN 2 AND 100
     OR length(v_email) NOT BETWEEN 5 AND 254
     OR p_category IS NULL OR p_category NOT IN (
       'account_access', 'rental_search', 'listing_submission',
       'messaging_safety', 'bug_report', 'billing_or_policy', 'other'
     )
     OR length(v_subject) NOT BETWEEN 5 AND 140
     OR length(v_description) NOT BETWEEN 20 AND 3000
     OR pg_catalog.jsonb_typeof(v_attachments) <> 'array'
     OR pg_catalog.jsonb_array_length(v_attachments) > 3 THEN
    RAISE EXCEPTION 'invalid support ticket payload' USING ERRCODE = '22023';
  END IF;

  -- Authorize every attachment path: must belong to v_ticket_id prefix and exist in storage.objects.
  FOR v_elem IN SELECT value FROM pg_catalog.jsonb_array_elements(v_attachments)
  LOOP
    v_path := COALESCE(v_elem->>'storagePath', '');
    IF v_path = ''
       OR position('..' IN v_path) > 0
       OR left(v_path, length(v_ticket_id::text) + 1) <> (v_ticket_id::text || '/')
       OR NOT EXISTS (
         SELECT 1 FROM storage.objects o
         WHERE o.bucket_id = 'support-attachments' AND o.name = v_path
       ) THEN
      RAISE EXCEPTION 'unauthorized support attachment path' USING ERRCODE = '42501';
    END IF;
  END LOOP;

  IF v_user IS NOT NULL THEN
    v_guest_hash := NULL;
    SELECT COALESCE(p.role::text, 'renter') INTO v_role FROM public.profiles p WHERE p.id = v_user;
    IF NOT FOUND THEN
      v_role := 'renter';
    END IF;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('support-ticket:' || p_operation_id::text, 0));

  SELECT * INTO v_existing FROM public.support_tickets WHERE operation_id = p_operation_id;
  IF FOUND THEN
    IF v_existing.user_id IS DISTINCT FROM v_user
       OR v_existing.requester_name <> v_name
       OR v_existing.requester_email <> v_email
       OR v_existing.category <> p_category
       OR v_existing.subject <> v_subject
       OR v_existing.description <> v_description
       OR v_existing.related_listing_id IS DISTINCT FROM p_related_listing_id
       OR pg_catalog.jsonb_array_length(v_existing.attachments) <> pg_catalog.jsonb_array_length(v_attachments) THEN
      RAISE EXCEPTION 'operation id already used for a different support ticket' USING ERRCODE = '23505';
    END IF;
    RETURN pg_catalog.jsonb_build_object(
      'id', v_existing.id,
      'ticketNumber', v_existing.ticket_number,
      'status', v_existing.status,
      'attachments', v_existing.attachments,
      'createdAt', v_existing.created_at,
      'replayed', true
    );
  END IF;

  INSERT INTO public.support_tickets (
    id, operation_id, user_id, requester_name, requester_email, requester_role,
    category, subject, description, related_listing_id, attachments, guest_access_token_hash
  )
  VALUES (
    v_ticket_id,
    p_operation_id, v_user, v_name, v_email, v_role,
    p_category, v_subject, v_description, p_related_listing_id, v_attachments, v_guest_hash
  )
  RETURNING * INTO v_inserted;

  RETURN pg_catalog.jsonb_build_object(
    'id', v_inserted.id,
    'ticketNumber', v_inserted.ticket_number,
    'status', v_inserted.status,
    'attachments', v_inserted.attachments,
    'createdAt', v_inserted.created_at,
    'replayed', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_support_ticket(uuid, text, text, text, text, text, uuid, jsonb, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_support_ticket(uuid, text, text, text, text, text, uuid, jsonb, uuid, uuid, text) TO service_role;

-- Admin support ticket list RPC (returns paginated tickets + total count).
CREATE OR REPLACE FUNCTION public.admin_list_support_tickets(
  p_status text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_ticket_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_search text := lower(NULLIF(pg_catalog.btrim(p_search), ''));
  v_total integer := 0;
  v_tickets jsonb;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('open', 'in_progress', 'resolved', 'closed', 'all') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023';
  END IF;
  IF p_category IS NOT NULL AND p_category NOT IN (
    'all', 'account_access', 'rental_search', 'listing_submission',
    'messaging_safety', 'bug_report', 'billing_or_policy', 'other'
  ) THEN
    RAISE EXCEPTION 'invalid category' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::int INTO v_total
  FROM public.support_tickets st
  WHERE (p_ticket_id IS NULL OR st.id = p_ticket_id)
    AND (p_status IS NULL OR p_status = 'all' OR st.status = p_status)
    AND (p_category IS NULL OR p_category = 'all' OR st.category = p_category)
    AND (v_search IS NULL OR pg_catalog.strpos(lower(st.ticket_number || ' ' || st.requester_name || ' ' || st.requester_email || ' ' || st.subject || ' ' || st.description), v_search) > 0);

  SELECT COALESCE(pg_catalog.jsonb_agg(t.j ORDER BY t.created_at DESC, t.id ASC), '[]'::jsonb)
  INTO v_tickets
  FROM (
    SELECT st.created_at, st.id, pg_catalog.jsonb_build_object(
      'id', st.id,
      'ticketNumber', st.ticket_number,
      'userId', st.user_id,
      'requesterName', st.requester_name,
      'requesterEmail', st.requester_email,
      'requesterRole', st.requester_role,
      'category', st.category,
      'subject', st.subject,
      'description', st.description,
      'relatedListingId', st.related_listing_id,
      'attachments', st.attachments,
      'status', st.status,
      'priority', st.priority,
      'adminResponse', st.admin_response,
      'assignedAdminId', st.assigned_admin_id,
      'assignedAdminName', ap.full_name,
      'resolvedAt', st.resolved_at,
      'createdAt', st.created_at,
      'updatedAt', st.updated_at
    ) AS j
    FROM public.support_tickets st
    LEFT JOIN public.profiles ap ON ap.id = st.assigned_admin_id
    WHERE (p_ticket_id IS NULL OR st.id = p_ticket_id)
      AND (p_status IS NULL OR p_status = 'all' OR st.status = p_status)
      AND (p_category IS NULL OR p_category = 'all' OR st.category = p_category)
      AND (v_search IS NULL OR pg_catalog.strpos(lower(st.ticket_number || ' ' || st.requester_name || ' ' || st.requester_email || ' ' || st.subject || ' ' || st.description), v_search) > 0)
    ORDER BY st.created_at DESC, st.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) t;

  RETURN pg_catalog.jsonb_build_object('tickets', v_tickets, 'total', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_support_tickets(text, text, text, integer, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_support_tickets(text, text, text, integer, integer, uuid) TO authenticated, service_role;

-- Admin support ticket update RPC (audited + idempotent + optimistic concurrency).
CREATE OR REPLACE FUNCTION public.admin_update_support_ticket(
  p_ticket_id uuid,
  p_operation_id uuid,
  p_status text,
  p_priority text DEFAULT NULL,
  p_admin_response text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_expected_updated_at timestamptz DEFAULT NULL,
  p_clear_response boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_audit public.admin_audit_logs%ROWTYPE;
  v_ticket public.support_tickets%ROWTYPE;
  v_next_priority text;
  v_response text := NULLIF(pg_catalog.btrim(COALESCE(p_admin_response, '')), '');
  v_next_response text;
  v_reason text := NULLIF(pg_catalog.btrim(COALESCE(p_reason, '')), '');
  v_resolved_at timestamptz;
  v_now timestamptz := pg_catalog.now();
  v_result jsonb;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF p_ticket_id IS NULL OR p_operation_id IS NULL
     OR p_status IS NULL OR p_status NOT IN ('open', 'in_progress', 'resolved', 'closed')
     OR (p_priority IS NOT NULL AND p_priority NOT IN ('low', 'normal', 'high', 'urgent'))
     OR (v_response IS NOT NULL AND length(v_response) > 2000) THEN
    RAISE EXCEPTION 'invalid support ticket update' USING ERRCODE = '22023';
  END IF;

  v_reason := COALESCE(v_reason, v_response, 'Updated ticket status to ' || p_status);
  IF length(v_reason) > 1000 THEN
    v_reason := pg_catalog.left(v_reason, 1000);
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('support-ticket-update:' || p_ticket_id::text, 0));

  SELECT * INTO v_audit FROM public.admin_audit_logs WHERE admin_id = v_admin AND operation_id = p_operation_id;
  IF FOUND THEN
    IF v_audit.target_id IS DISTINCT FROM p_ticket_id OR v_audit.action_type IS DISTINCT FROM 'support_ticket_updated' THEN
      RAISE EXCEPTION 'operation already used for different change' USING ERRCODE = '23505';
    END IF;
    RETURN v_audit.new_state;
  END IF;

  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'support ticket not found' USING ERRCODE = '22023';
  END IF;

  IF p_expected_updated_at IS NOT NULL
     AND pg_catalog.date_trunc('milliseconds', v_ticket.updated_at) <> pg_catalog.date_trunc('milliseconds', p_expected_updated_at) THEN
    RAISE EXCEPTION 'support ticket changed concurrently' USING ERRCODE = '40001';
  END IF;

  v_next_priority := COALESCE(p_priority, v_ticket.priority);
  v_next_response := CASE
    WHEN COALESCE(p_clear_response, false) THEN NULL
    WHEN v_response IS NOT NULL THEN v_response
    ELSE v_ticket.admin_response
  END;
  v_resolved_at := CASE
    WHEN p_status IN ('resolved', 'closed') THEN COALESCE(v_ticket.resolved_at, v_now)
    ELSE NULL
  END;

  UPDATE public.support_tickets
  SET
    status = p_status,
    priority = v_next_priority,
    admin_response = v_next_response,
    assigned_admin_id = v_admin,
    resolved_at = v_resolved_at,
    updated_at = v_now
  WHERE id = p_ticket_id;

  v_result := pg_catalog.jsonb_build_object(
    'ticketId', p_ticket_id,
    'ticketNumber', v_ticket.ticket_number,
    'status', p_status,
    'priority', v_next_priority,
    'adminResponse', v_next_response,
    'resolvedAt', v_resolved_at,
    'updatedAt', v_now
  );

  INSERT INTO public.admin_audit_logs (
    operation_id, admin_id, action_type, target_type, target_id, previous_state, new_state, reason
  )
  VALUES (
    p_operation_id,
    v_admin,
    'support_ticket_updated',
    'support_ticket',
    p_ticket_id,
    pg_catalog.jsonb_build_object('status', v_ticket.status, 'priority', v_ticket.priority, 'adminResponse', v_ticket.admin_response),
    v_result,
    v_reason
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_support_ticket(uuid, uuid, text, text, text, text, timestamptz, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_support_ticket(uuid, uuid, text, text, text, text, timestamptz, boolean) TO authenticated, service_role;

-- Update admin_dashboard_overview to include openSupportTicketCount while keeping all existing fields intact.
CREATE OR REPLACE FUNCTION public.admin_dashboard_overview()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_open_reports integer := 0;
  v_open_support integer := 0;
BEGIN
  IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin' AND NOT p.is_suspended) THEN
    RAISE EXCEPTION 'active admin required' USING ERRCODE = '42501';
  END IF;
  IF pg_catalog.to_regclass('public.abuse_reports') IS NOT NULL THEN
    EXECUTE 'SELECT count(*)::int FROM public.abuse_reports WHERE status IN (''open'', ''in_review'')' INTO v_open_reports;
  END IF;
  IF pg_catalog.to_regclass('public.support_tickets') IS NOT NULL THEN
    EXECUTE 'SELECT count(*)::int FROM public.support_tickets WHERE status IN (''open'', ''in_progress'')' INTO v_open_support;
  END IF;
  RETURN pg_catalog.jsonb_build_object(
    'pendingReviewCount', (SELECT count(*)::int FROM public.properties WHERE status = 'pending'),
    'approvedLiveCount', (SELECT count(*)::int FROM public.properties p WHERE p.status = 'approved'
      AND EXISTS (SELECT 1 FROM public.rental_units u WHERE u.property_id = p.id AND u.is_available = true)),
    'changesRequestedCount', (SELECT count(*)::int FROM public.properties WHERE status = 'rejected'),
    'archivedListingCount', (SELECT count(*)::int FROM public.properties WHERE status = 'archived'),
    'activeRenterCount', (SELECT count(*)::int FROM public.profiles WHERE role = 'renter' AND NOT is_suspended),
    'activeLandlordCount', (SELECT count(*)::int FROM public.profiles WHERE role = 'landlord' AND NOT is_suspended),
    'suspendedAccountCount', (SELECT count(*)::int FROM public.profiles WHERE is_suspended = true),
    'openReportCount', v_open_reports,
    'openSupportTicketCount', v_open_support,
    'recentAuditEntries', public.admin_list_audit_logs(NULL, 10, 0)
  );
END;
$$;

COMMIT;
