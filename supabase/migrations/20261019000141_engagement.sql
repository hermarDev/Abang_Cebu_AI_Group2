-- =============================================================================
-- SCRUM-141: renter engagement and audit schema
-- Source of truth: docs/database/database-erd.md (PostgreSQL 15+, Supabase).
--
-- Rollback: Supabase migrations are forward-only. Use a reviewed compensating
-- migration; dropping tables/types is destructive and loses user/audit data.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    property_id UUID NOT NULL,
    unit_id UUID,
    renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    preferred_move_in_date DATE,
    status TEXT NOT NULL DEFAULT 'pending',
    viewing_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT inquiries_property_landlord_fkey
        FOREIGN KEY (property_id, landlord_id)
        REFERENCES public.properties(id, landlord_id) ON DELETE CASCADE,
    CONSTRAINT inquiries_unit_property_fkey
        FOREIGN KEY (unit_id, property_id)
        REFERENCES public.rental_units(id, property_id) ON DELETE SET NULL (unit_id),
    CONSTRAINT inquiries_message_nonempty CHECK (btrim(message) <> ''),
    CONSTRAINT inquiries_status_check CHECK (
        status IN ('pending', 'accepted', 'declined', 'scheduled_viewing', 'closed')
    )
);

CREATE INDEX IF NOT EXISTS idx_inquiries_landlord_inbox
    ON public.inquiries (landlord_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_renter_history
    ON public.inquiries (renter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status
    ON public.inquiries (status);

DROP TRIGGER IF EXISTS set_inquiries_updated_at ON public.inquiries;
CREATE TRIGGER set_inquiries_updated_at
    BEFORE UPDATE ON public.inquiries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.saved_listings (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT saved_listings_renter_property_key UNIQUE (renter_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_listings_renter_created
    ON public.saved_listings (renter_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    comment TEXT,
    is_verified_tenant BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT reviews_property_renter_key UNIQUE (property_id, renter_id),
    CONSTRAINT reviews_rating_range_check CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_reviews_property_created
    ON public.reviews (property_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT audit_logs_action_nonempty CHECK (btrim(action) <> ''),
    CONSTRAINT audit_logs_target_type_nonempty CHECK (btrim(target_type) <> '')
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
    ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target
    ON public.audit_logs (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created
    ON public.audit_logs (created_at DESC);

-- Audit records are append-only, including for service-role writers.
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    -- Permit only the FK's referential action when a profile is deleted. At
    -- deeper trigger depth, PostgreSQL invokes this while applying ON DELETE
    -- SET NULL to actor_id; direct row mutation remains rejected.
    IF TG_OP = 'UPDATE'
       AND pg_trigger_depth() > 1
       AND OLD.actor_id IS NOT NULL
       AND NEW.actor_id IS NULL
       AND (to_jsonb(NEW) - 'actor_id') = (to_jsonb(OLD) - 'actor_id') THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'audit_logs rows are append-only'
        USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_append_only ON public.audit_logs;
CREATE TRIGGER audit_logs_append_only
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- No client-role access policies are introduced here; SCRUM-142 owns policy
-- definitions. Until that migration is applied, enabled RLS is default-deny.
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

COMMIT;
