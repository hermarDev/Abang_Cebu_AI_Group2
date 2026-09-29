-- ==============================================================================
-- AbangCebuAI Database Migration: Users, Profiles & Anti-Scam KYC Schema
-- Migration: 20260929000001_users_and_profiles.sql
-- Jira Reference: SCRUM-54
-- Author: Lead Tech Architect & Engineering Manager
-- Reviewer: Senior Dev Auditor
-- Database: PostgreSQL 15+ (Supabase)
-- ==============================================================================

-- 1. Custom Enumerations
-- ------------------------------------------------------------------------------

-- Role governance: Unauthenticated is handled via 'anon' role.
-- Authenticated actors map strictly to 'renter', 'landlord', or 'admin'.
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('renter', 'landlord', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Anti-Scam Landlord KYC review status
DO $$ BEGIN
    CREATE TYPE public.kyc_status AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Acceptable government and professional IDs for Cebu landlord verification
DO $$ BEGIN
    CREATE TYPE public.kyc_id_type AS ENUM (
        'passport',
        'philsys_id',
        'drivers_license',
        'umid',
        'prc_id',
        'postal_id'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Core Helper Functions (Security Definer with Search Path Sanitization)
-- ------------------------------------------------------------------------------

-- Standard timestamp updater
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Secure helper: Retrieve role of current authenticated user
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Secure helper: Check if caller is platform admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'::public.user_role
  );
$$;

-- 3. Profiles Table (Extends Supabase auth.users)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'renter'::public.user_role,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    avatar_url TEXT,
    bio TEXT,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT phone_format_check CHECK (
        phone_number IS NULL OR phone_number ~ '^\+?[0-9]{10,15}$'
    )
);

-- Performance & filtering indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON public.profiles(is_suspended) WHERE is_suspended = TRUE;

-- Automatically refresh updated_at on record mutation
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. KYC Verifications Table (Anti-Scam Trust Layer)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.kyc_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    id_type public.kyc_id_type NOT NULL,
    id_document_url TEXT NOT NULL,
    proof_of_ownership_url TEXT,
    status public.kyc_status NOT NULL DEFAULT 'pending'::public.kyc_status,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT kyc_review_consistency CHECK (
        (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
        OR
        (status IN ('verified', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    ),
    CONSTRAINT kyc_rejection_reason_check CHECK (
        (status = 'rejected' AND rejection_reason IS NOT NULL AND rejection_reason <> '')
        OR
        (status <> 'rejected')
    )
);

-- Indexes for landlord submission lookup and admin moderation queue
CREATE INDEX IF NOT EXISTS idx_kyc_landlord_id ON public.kyc_verifications(landlord_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON public.kyc_verifications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_reviewed_by ON public.kyc_verifications(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- Automatically refresh updated_at on KYC record mutation
DROP TRIGGER IF EXISTS set_kyc_updated_at ON public.kyc_verifications;
CREATE TRIGGER set_kyc_updated_at
    BEFORE UPDATE ON public.kyc_verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Automated User Onboarding Trigger (auth.users -> public.profiles)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    assigned_role public.user_role;
    raw_role text;
    extracted_name text;
BEGIN
    -- Extract requested role from raw_user_meta_data
    raw_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'renter'));
    
    -- Anti-Privilege Escalation Protection:
    -- Only 'renter' and 'landlord' can be registered during public onboarding.
    -- Any attempt to request 'admin' is strictly forced down to 'renter'.
    IF raw_role = 'landlord' THEN
        assigned_role := 'landlord'::public.user_role;
    ELSE
        assigned_role := 'renter'::public.user_role;
    END IF;

    -- Extract full name with robust fallbacks
    extracted_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        SPLIT_PART(NEW.email, '@', 1),
        'AbangCebu User'
    );

    INSERT INTO public.profiles (
        id,
        role,
        full_name,
        phone_number,
        avatar_url,
        bio,
        is_suspended,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        assigned_role,
        extracted_name,
        NULLIF(TRIM(NEW.raw_user_meta_data->>'phone_number'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'bio'), ''),
        FALSE,
        now(),
        now()
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Defensive logging: ensure unexpected trigger failures are surfaced
        RAISE LOG 'Error executing public.handle_new_user() for auth user ID %: %', NEW.id, SQLERRM;
        RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 6. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------

-- Enable RLS on core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

-- 6.1 profiles Table Policies

-- Public read access: Anyone (including unauthenticated guests) can view basic public profile info
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (TRUE);

-- Self-update access: Users can only update their own profile, with strict role/suspension lock
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id
    -- Anti-privilege escalation: user cannot modify their own role
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    -- Anti-tampering: user cannot unsuspended themselves
    AND is_suspended = (SELECT p.is_suspended FROM public.profiles p WHERE p.id = auth.uid())
);

-- Admin full access to profiles
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles"
ON public.profiles FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6.2 kyc_verifications Table Policies

-- Landlords can view their own KYC submissions; Admins can view all submissions
DROP POLICY IF EXISTS "Landlords and Admins can view KYC submissions" ON public.kyc_verifications;
CREATE POLICY "Landlords and Admins can view KYC submissions"
ON public.kyc_verifications FOR SELECT
USING (
    auth.uid() = landlord_id
    OR public.is_admin()
);

-- Landlords can submit a new KYC verification document
DROP POLICY IF EXISTS "Landlords can submit KYC verification" ON public.kyc_verifications;
CREATE POLICY "Landlords can submit KYC verification"
ON public.kyc_verifications FOR INSERT
WITH CHECK (
    auth.uid() = landlord_id
    AND public.get_current_user_role() = 'landlord'::public.user_role
    AND status = 'pending'::public.kyc_status
);

-- Only Admins can review and update KYC status (approve / reject)
DROP POLICY IF EXISTS "Admins can review and update KYC status" ON public.kyc_verifications;
CREATE POLICY "Admins can review and update KYC status"
ON public.kyc_verifications FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());
