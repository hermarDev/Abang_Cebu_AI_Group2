# Database Specification: Users, Profiles & Anti-Scam KYC Architecture
**AbangCebuAI — Sprint 1 Core Infrastructure**  
*Document Version:* 1.0.0  
*Jira Ticket Reference:* [SCRUM-54](https://abangcebuai.atlassian.net/browse/SCRUM-54) — *Define Users & Profiles Table Schema Specification*  
*Author:* Dency Marie Bosque (Database Architect)  
*Reviewed & Audited by:* Hermar Centillas (Lead / Scrum Master)  
*Database Engine:* PostgreSQL 15+ (Hosted on Supabase)  
*Status:* Approved & Production-Ready  

---

## 1. Architectural Overview & Design Pillars

In the AbangCebuAI platform, the identity and trust infrastructure forms the foundation for every downstream real estate operation, including listing creation, AI rental search, landlord verification, and booking inquiries. 

The architecture strictly adheres to five core engineering principles:

```
                      +-----------------------------+
                      |     Supabase Auth Engine    |
                      |         (auth.users)        |
                      +--------------+--------------+
                                     |
                       AFTER INSERT Trigger (SECURITY DEFINER)
                       [handle_new_user() with search_path safety]
                                     |
                                     v
                      +-----------------------------+
                      |       public.profiles       |
                      |   (Role: renter/landlord)   |
                      +--------------+--------------+
                                     |
                                     | (1-to-many)
                                     v
                      +-----------------------------+
                      |   public.kyc_verifications  |
                      |  (Anti-Scam Trust Engine)   |
                      +-----------------------------+
```

### Core Architectural Pillars
1. **Strict Auth/Domain Separation (Zero-Trust Identity)**:  
   Supabase's internal `auth.users` holds credentials, password hashes, and session tokens. The public application domain interacts solely with `public.profiles`. The link between `auth.users.id` and `public.profiles.id` is a 1-to-1 foreign key enforced with `ON DELETE CASCADE`.
2. **Anti-Privilege Escalation by Design**:  
   Admins cannot be self-provisioned through public onboarding. Any attempt to pass `role: 'admin'` in `auth.users.raw_user_meta_data` is systematically intercepted by `handle_new_user()` and coerced to `'renter'`. User self-updates on `profiles` are guarded by PostgreSQL RLS with `WITH CHECK` conditions that prevent altering `role` or `is_suspended`.
3. **Anti-Scam Trust Layer (Landlord KYC Verification)**:  
   Renters in Metro Cebu face rampant fake listing scams on unverified social channels. The `kyc_verifications` table requires landlords to submit verified government IDs (`philsys_id`, `passport`, `drivers_license`, etc.) and optional proof-of-ownership documents before their listings can be transitioned to `approved`.
4. **Search Path Sanitization on `SECURITY DEFINER` Functions**:  
   To prevent CVE-class schema hijacking attacks, all `SECURITY DEFINER` trigger and helper functions explicitly set `SET search_path = public, auth, extensions`.
5. **Deterministic TypeScript Contracts**:  
   Database schemas are mirrored in `src/types/database.ts`, ensuring full compile-time type safety across Next.js 15 Server Components, Route Handlers, and client hooks.

---

## 2. PostgreSQL Schema & Data Dictionary

### 2.1 Custom Enumerations

#### `public.user_role`
Categorizes platform actors into distinct authorization tiers:
```sql
CREATE TYPE public.user_role AS ENUM ('renter', 'landlord', 'admin');
```

#### `public.kyc_status`
Tracks the verification lifecycle of landlord identification:
```sql
CREATE TYPE public.kyc_status AS ENUM ('pending', 'verified', 'rejected');
```

#### `public.kyc_id_type`
Approved Philippine government-issued identification cards:
```sql
CREATE TYPE public.kyc_id_type AS ENUM (
    'passport',
    'philsys_id',
    'drivers_license',
    'umid',
    'prc_id',
    'postal_id'
);
```

---

### 2.2 Table Specification: `public.profiles`

Extends `auth.users` with application profile data, display attributes, and role governance.

| Column | Type | Nullable | Default | Description & Constraints |
|---|---|:---:|---|---|
| `id` | `uuid` | NO | - | Primary Key. References `auth.users(id)` `ON DELETE CASCADE`. |
| `role` | `public.user_role` | NO | `'renter'` | User role enum: `'renter'`, `'landlord'`, `'admin'`. |
| `full_name` | `text` | NO | - | User display name. Sanitized during registration trigger. |
| `phone_number` | `text` | YES | `NULL` | Philippine phone format (`CHECK (phone_number ~ '^\+?[0-9]{10,15}$')`). |
| `avatar_url` | `text` | YES | `NULL` | CDN URL for profile image. |
| `bio` | `text` | YES | `NULL` | Biography or landlord business introduction. |
| `is_suspended` | `boolean` | NO | `false` | Administrative lock. If `true`, all mutations are blocked. |
| `created_at` | `timestamptz` | NO | `now()` | Immutable timestamp of profile creation. |
| `updated_at` | `timestamptz` | NO | `now()` | Auto-updated via `handle_updated_at()` trigger. |

#### Constraints & Indexes:
```sql
-- Role filtering index (for admin queries and role lookups)
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Partial index for fast suspended user checks
CREATE INDEX idx_profiles_suspended ON public.profiles(is_suspended) WHERE is_suspended = TRUE;

-- Phone number format constraint
CONSTRAINT phone_format_check CHECK (
    phone_number IS NULL OR phone_number ~ '^\+?[0-9]{10,15}$'
);
```

---

### 2.3 Table Specification: `public.kyc_verifications`

Stores identity verification packages submitted by landlords to achieve verified badge status.

| Column | Type | Nullable | Default | Description & Constraints |
|---|---|:---:|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary Key (UUID v4). |
| `landlord_id` | `uuid` | NO | - | Foreign Key referencing `public.profiles(id)` `ON DELETE CASCADE`. |
| `id_type` | `public.kyc_id_type` | NO | - | Type of submitted Philippine government ID. |
| `id_document_url` | `text` | NO | - | Private Supabase Storage bucket path. |
| `proof_of_ownership_url` | `text` | YES | `NULL` | Private Storage path to land title, tax declaration, or utility bill. |
| `status` | `public.kyc_status` | NO | `'pending'` | Verification status: `'pending'`, `'verified'`, `'rejected'`. |
| `reviewed_by` | `uuid` | YES | `NULL` | Foreign Key referencing `public.profiles(id)` (Admin reviewer). |
| `reviewed_at` | `timestamptz` | YES | `NULL` | Timestamp of admin decision. |
| `rejection_reason` | `text` | YES | `NULL` | Mandatory feedback provided if status is `'rejected'`. |
| `created_at` | `timestamptz` | NO | `now()` | Record creation timestamp. |
| `updated_at` | `timestamptz` | NO | `now()` | Auto-updated via `handle_updated_at()` trigger. |

#### Architectural Integrity Constraints:
```sql
-- Ensures review metadata is synchronized with status transition
CONSTRAINT kyc_review_consistency CHECK (
    (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR
    (status IN ('verified', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
);

-- Guarantees explanatory feedback if a landlord submission is declined
CONSTRAINT kyc_rejection_reason_check CHECK (
    (status = 'rejected' AND rejection_reason IS NOT NULL AND rejection_reason <> '')
    OR
    (status <> 'rejected')
);

-- Performance & Queue Indexes
CREATE INDEX idx_kyc_landlord_id ON public.kyc_verifications(landlord_id);
CREATE INDEX idx_kyc_status ON public.kyc_verifications(status);
CREATE INDEX idx_kyc_reviewed_by ON public.kyc_verifications(reviewed_by) WHERE reviewed_by IS NOT NULL;
```

---

## 3. Automated Triggers & Security Definer Functions

### 3.1 `handle_new_user()` — Automatic Profile Provisioning
Fires immediately `AFTER INSERT ON auth.users`.

```sql
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
    
    -- Privilege escalation firewall: block self-assigning 'admin'
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
        RAISE LOG 'Error executing public.handle_new_user() for auth user ID %: %', NEW.id, SQLERRM;
        RAISE;
END;
$$;
```

### 3.2 Security Helper Functions
These helper functions avoid expensive and recursive subqueries in RLS policies:
- `public.get_current_user_role()`: Returns the calling user's enum role.
- `public.is_admin()`: Returns `true` if `auth.uid()` corresponds to an active admin profile.
- `public.handle_updated_at()`: Deterministic timestamp mutator.

---

## 4. Row Level Security (RLS) Policy Specifications

### 4.1 Permission Matrix (Kernel-Enforced)

| Action | Target Table | Actor | Condition / Rule | Policy Name |
|---|---|---|---|---|
| `SELECT` | `profiles` | Anyone (`anon`, `renter`, `landlord`, `admin`) | `USING (TRUE)` | *Public profiles are viewable by everyone* |
| `UPDATE` | `profiles` | Self (`auth.uid() = id`) | User cannot alter own `role` or `is_suspended` | *Users can update own profile* |
| `ALL` | `profiles` | Admin | `USING (public.is_admin())` | *Admins have full access to profiles* |
| `SELECT` | `kyc_verifications` | Owner (`landlord_id = auth.uid()`) OR Admin | `USING (auth.uid() = landlord_id OR public.is_admin())` | *Landlords and Admins can view KYC submissions* |
| `INSERT` | `kyc_verifications` | Landlord | `WITH CHECK (auth.uid() = landlord_id AND role = 'landlord' AND status = 'pending')` | *Landlords can submit KYC verification* |
| `UPDATE` | `kyc_verifications` | Admin only | `USING (public.is_admin()) WITH CHECK (public.is_admin())` | *Admins can review and update KYC status* |
| `DELETE` | `kyc_verifications` | Admin only | Implicitly denied to all regular users | *Default Deny* |

---

## 5. TypeScript Database Types Mapping

The database schema is mapped in [`src/types/database.ts`](../../src/types/database.ts) and exported through [`src/types/index.ts`](../../src/types/index.ts).

### Key Type Definitions:
- `UserRole = 'renter' | 'landlord' | 'admin'`
- `KycStatus = 'pending' | 'verified' | 'rejected'`
- `KycIdType = 'passport' | 'philsys_id' | 'drivers_license' | 'umid' | 'prc_id' | 'postal_id'`
- `Profile = Database['public']['Tables']['profiles']['Row']`
- `KycVerification = Database['public']['Tables']['kyc_verifications']['Row']`

---

## 6. Migration & Verification Checklist

- [x] Custom enums (`user_role`, `kyc_status`, `kyc_id_type`) created idempotently.
- [x] Primary Key on `profiles.id` linked to `auth.users(id) ON DELETE CASCADE`.
- [x] Check constraint on phone numbers (`phone_format_check`).
- [x] Anti-privilege escalation logic built into `handle_new_user()` trigger.
- [x] Search path sanitized on all `SECURITY DEFINER` functions.
- [x] KYC verification table equipped with review consistency and rejection reason constraints.
- [x] Complete RLS policies covering `SELECT`, `INSERT`, `UPDATE`, and `ALL`.
- [x] TypeScript contracts defined in `src/types/database.ts` with 100% clean `tsc --noEmit`.
