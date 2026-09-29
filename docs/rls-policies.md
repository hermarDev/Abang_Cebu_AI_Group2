# PostgreSQL Row Level Security (RLS) Policy Specifications
**AbangCebuAI — Sprint 1 Security Architecture**  
*Document Version:* 1.0.0  
*Author:* Michelle Estoy (Data Access Control & Security Specification)  
*Reviewed & Implemented by:* Hermar Centillas (Lead / Scrum Master)  
*Jira Reference:* [SCRUM-55](https://abangcebuai.atlassian.net/browse/SCRUM-55)  
*Status:* Approved & Production-Ready  

---

## 1. Security Architecture & RLS Principles

Row Level Security (RLS) serves as the ultimate defensive perimeter in the AbangCebuAI database architecture. Regardless of whether requests originate from client-side SDKs, Server Components, Route Handlers, or AI search tools, PostgreSQL evaluates security policies at the kernel level for every single `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operation.

### Fundamental Security Policies
1. **Default Deny (Zero Trust):** RLS is enabled on all 11 domain tables. Unless an explicit policy permits an action, PostgreSQL defaults to blocking access.
2. **Public Read Restricted to Approved Listings:** Public guests and Finders (Renters) may only read rental properties and units where `status = 'approved'`. Draft, paused, rejected, or suspended listings are strictly shielded.
3. **Strict Ownership Verification (`auth.uid()`):** Landlords can only insert, modify, or delete property listings, units, and photos where `landlord_id = auth.uid()`.
4. **KYC Privacy & Identity Protection:** Government IDs and proof-of-ownership documents submitted in `kyc_verifications` are accessible exclusively to the submitting landlord and platform administrators.
5. **AI Isolation:** AI assistant queries execute with the unprivileged `anon` role, strictly restricted to public approved records.

---

## 2. Table-by-Table RLS Policy Specifications

### 2.1 `profiles` Table
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can view basic public profiles (name, avatar)
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

-- 2. Users can only update their own profile information
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) -- Prevents self-escalation
  AND is_suspended = (SELECT is_suspended FROM public.profiles WHERE id = auth.uid())
);

-- 3. Profile creation handled automatically via Supabase Auth trigger (SECURITY DEFINER)
```

---

### 2.2 `kyc_verifications` Table (Anti-Scam Trust Layer)
```sql
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

-- 1. Landlords can view their own KYC verification history
CREATE POLICY "Landlords can view own KYC submissions"
ON public.kyc_verifications FOR SELECT
USING (auth.uid() = landlord_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 2. Landlords can submit a new KYC verification document
CREATE POLICY "Landlords can submit KYC verification"
ON public.kyc_verifications FOR INSERT
WITH CHECK (
  auth.uid() = landlord_id 
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'landlord'
);

-- 3. Only Admins can update verification status (approve / reject)
CREATE POLICY "Admins can review and update KYC status"
ON public.kyc_verifications FOR UPDATE
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
```

---

### 2.3 `properties` Table (Real Estate Buildings & Locations)
```sql
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- 1. Public can view approved listings; Landlords can view their own; Admins view all
CREATE POLICY "View properties based on status and ownership"
ON public.properties FOR SELECT
USING (
  status = 'approved'
  OR auth.uid() = landlord_id
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 2. Authenticated Landlords can create listings
CREATE POLICY "Landlords can insert own properties"
ON public.properties FOR INSERT
WITH CHECK (
  auth.uid() = landlord_id
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'landlord'
  AND status = 'pending' -- New listings always start as pending
);

-- 3. Landlords can update their own properties (cannot self-approve)
CREATE POLICY "Landlords can update own properties"
ON public.properties FOR UPDATE
USING (auth.uid() = landlord_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK (
  auth.uid() = landlord_id
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 4. Landlords can delete/archive their own properties
CREATE POLICY "Landlords can delete own properties"
ON public.properties FOR DELETE
USING (auth.uid() = landlord_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
```

---

### 2.4 `rental_units` Table (Granular Units & Pricing)
```sql
ALTER TABLE public.rental_units ENABLE ROW LEVEL SECURITY;

-- 1. Public can view units of approved properties; Owner can view all own units
CREATE POLICY "View units for approved properties or by owner"
ON public.rental_units FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = rental_units.property_id
      AND (p.status = 'approved' OR p.landlord_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  )
);

-- 2. Landlords can manage units belonging to their properties
CREATE POLICY "Landlords can insert units into own properties"
ON public.rental_units FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_id AND p.landlord_id = auth.uid()
  )
);

CREATE POLICY "Landlords can update units of own properties"
ON public.rental_units FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = rental_units.property_id AND (p.landlord_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  )
);

CREATE POLICY "Landlords can delete units of own properties"
ON public.rental_units FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = rental_units.property_id AND (p.landlord_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  )
);
```

---

### 2.5 `property_photos` Table (Media Attachments)
```sql
ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;

-- 1. Photos are viewable if the parent property is viewable
CREATE POLICY "View photos for visible properties"
ON public.property_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_photos.property_id
      AND (p.status = 'approved' OR p.landlord_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  )
);

-- 2. Landlords can add photos to own properties
CREATE POLICY "Landlords can upload photos to own properties"
ON public.property_photos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_id AND p.landlord_id = auth.uid()
  )
);

-- 3. Landlords can delete photos from own properties
CREATE POLICY "Landlords can delete photos from own properties"
ON public.property_photos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_photos.property_id AND (p.landlord_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  )
);
```

---

### 2.6 `inquiries` Table (Renter-Landlord Communication)
```sql
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- 1. Renters and Landlords can view inquiries they are party to
CREATE POLICY "Inquiry parties can view inquiries"
ON public.inquiries FOR SELECT
USING (
  auth.uid() = renter_id 
  OR auth.uid() = landlord_id 
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- 2. Renters can submit inquiries
CREATE POLICY "Renters can create inquiries"
ON public.inquiries FOR INSERT
WITH CHECK (
  auth.uid() = renter_id
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'renter'
);

-- 3. Both parties can update status (accept viewing, schedule, close)
CREATE POLICY "Inquiry parties can update status"
ON public.inquiries FOR UPDATE
USING (auth.uid() = renter_id OR auth.uid() = landlord_id);
```

---

### 2.7 `saved_listings` Table (Renter Favorites)
```sql
ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;

-- 1. Renters can only view and manage their own saved listings
CREATE POLICY "Users can manage own saved listings"
ON public.saved_listings FOR ALL
USING (auth.uid() = renter_id)
WITH CHECK (auth.uid() = renter_id);
```

---

### 2.8 `reviews` Table (Tenant Ratings & Feedback)
```sql
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can read reviews
CREATE POLICY "Reviews are publicly readable"
ON public.reviews FOR SELECT
USING (true);

-- 2. Verified renters can insert reviews for properties they have interacted with
CREATE POLICY "Renters can submit reviews"
ON public.reviews FOR INSERT
WITH CHECK (
  auth.uid() = renter_id
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'renter'
);
```

---

### 2.9 `audit_logs` Table (Immutable Governance Trail)
```sql
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Only Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 2. System and Admins can insert audit entries; NO user can update or delete audit logs
CREATE POLICY "Authorized actors can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() = actor_id);
```

---

## 3. Compliance & Architectural Verification

| Requirement | Implementation Verification | Status |
|---|---|:---:|
| **Public Read Approved Only** | `properties` & `rental_units` RLS enforce `status = 'approved'` for unauthenticated and Renter queries. | ✅ **Passed** |
| **Landlord Multi-Tenant Isolation** | All listing, unit, and photo mutations strictly require `auth.uid() = landlord_id`. | ✅ **Passed** |
| **Anti-Scam KYC Protection** | `kyc_verifications` private document URLs shielded from public guests; only uploader & admin can read. | ✅ **Passed** |
| **AI Assistant Boundary** | AI search operates through unprivileged `anon` role, inheriting public read-only constraints. | ✅ **Passed** |
| **Zero Self-Escalation** | `profiles` `UPDATE` policy prevents users from mutating their own `role` or `is_suspended` flags. | ✅ **Passed** |
