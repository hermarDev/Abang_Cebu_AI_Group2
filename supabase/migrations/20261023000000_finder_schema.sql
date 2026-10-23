-- Standalone fresh-project bootstrap. Apply this file alone, NOT the legacy migrations.
-- Existing application objects/buckets/policies cause an atomic failure; nothing is replaced.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users) OR EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Fresh bootstrap requires no existing auth users or custom auth.users triggers';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    RAISE EXCEPTION 'Fresh bootstrap requires storage.objects without existing policies; review them first';
  END IF;
END;
$$;

CREATE TYPE public.user_role AS ENUM ('renter', 'landlord', 'admin');
CREATE TYPE public.kyc_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE public.kyc_id_type AS ENUM ('passport', 'philsys_id', 'drivers_license', 'umid', 'prc_id', 'postal_id');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'renter',
  full_name text NOT NULL CHECK (length(btrim(full_name)) BETWEEN 1 AND 200),
  phone_number text CHECK (phone_number IS NULL OR phone_number ~ '^\+?[0-9]{10,15}$'),
  avatar_url text,
  bio text CHECK (length(bio) <= 2000),
  is_suspended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kyc_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  id_type public.kyc_id_type NOT NULL,
  -- These are private bucket object paths, never public or signed URLs.
  id_document_url text NOT NULL CHECK (id_document_url LIKE landlord_id::text || '/%'
    AND id_document_url !~ '(^|/)\.\.?(/|$)'),
  proof_of_ownership_url text CHECK (proof_of_ownership_url LIKE landlord_id::text || '/%'
    AND proof_of_ownership_url !~ '(^|/)\.\.?(/|$)'),
  status public.kyc_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND rejection_reason IS NULL)
    OR (status IN ('verified', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
  CHECK (status <> 'rejected' OR length(btrim(rejection_reason)) > 0 AND rejection_reason IS NOT NULL)
);
CREATE INDEX finder_kyc_landlord ON public.kyc_verifications(landlord_id);
CREATE INDEX finder_kyc_queue ON public.kyc_verifications(status, created_at);
CREATE INDEX finder_kyc_reviewer ON public.kyc_verifications(reviewed_by);

CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  description text CHECK (length(description) <= 10000),
  price numeric(12,2) NOT NULL CHECK (price >= 0 AND price < 10000000000),
  currency text NOT NULL DEFAULT 'PHP' CHECK (currency ~ '^[A-Z]{3}$'),
  rental_period text NOT NULL DEFAULT 'monthly' CHECK (rental_period IN ('daily', 'weekly', 'monthly', 'yearly')),
  property_type text NOT NULL DEFAULT 'apartment' CHECK (property_type IN
    ('bedspace', 'boarding_house', 'private_room', 'shared_room', 'studio', 'apartment', 'condo', 'house')),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  address text NOT NULL CHECK (length(btrim(address)) BETWEEN 1 AND 1000),
  city text NOT NULL DEFAULT 'Cebu City' CHECK (length(btrim(city)) BETWEEN 1 AND 200),
  is_available boolean NOT NULL DEFAULT true,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_urls text[] NOT NULL DEFAULT '{}' CHECK (cardinality(image_urls) <= 20 AND array_position(image_urls, NULL) IS NULL),
  -- Unknown filter values stay NULL, never an invented false or verified value.
  max_occupants integer CHECK (max_occupants BETWEEN 1 AND 1000),
  bathroom_type text CHECK (bathroom_type IN ('private', 'shared')),
  cooking_allowed boolean,
  laundry_allowed boolean,
  curfew_type text CHECK (curfew_type IN ('none', 'fixed', 'conditional')),
  wifi_available boolean,
  aircon boolean,
  water_included boolean,
  electricity_included boolean,
  motorcycle_parking boolean,
  car_parking boolean,
  verification_status text CHECK (verification_status IN ('unverified', 'identity_verified', 'property_verified', 'fully_verified')),
  direct_landlord boolean,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'published' AND published_at IS NOT NULL) OR (status <> 'published' AND published_at IS NULL))
);
CREATE INDEX finder_listings_owner ON public.listings(owner_id);
CREATE INDEX finder_listings_public_price ON public.listings(price, id) WHERE status = 'published' AND is_available;
CREATE INDEX finder_listings_public_type ON public.listings(property_type) WHERE status = 'published' AND is_available;

CREATE TABLE public.favorites (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);
CREATE INDEX finder_favorites_listing ON public.favorites(listing_id);

CREATE FUNCTION public.get_current_user_role() RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND NOT is_suspended;
$$;
CREATE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(public.get_current_user_role() = 'admin', false);
$$;
CREATE FUNCTION public.finder_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.finder_listing_edit() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  -- Owner edits require moderation again; grants prevent owner-written trust fields.
  IF current_user = 'authenticated' THEN
    NEW.status := 'draft';
    NEW.published_at := NULL;
    NEW.verification_status := NULL;
    NEW.direct_landlord := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.finder_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles(id, role, full_name, phone_number)
  VALUES (NEW.id,
    CASE WHEN lower(NEW.raw_user_meta_data->>'role') = 'landlord'
      THEN 'landlord'::public.user_role ELSE 'renter'::public.user_role END,
    left(coalesce(nullif(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
      nullif(btrim(NEW.raw_user_meta_data->>'name'), ''), 'AbangCebu User'), 200),
    CASE WHEN NEW.raw_user_meta_data->>'phone_number' ~ '^\+?[0-9]{10,15}$'
      THEN NEW.raw_user_meta_data->>'phone_number' ELSE NULL END);
  RETURN NEW;
END;
$$;
CREATE TRIGGER finder_auth_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.finder_new_user();
CREATE TRIGGER finder_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.finder_updated_at();
CREATE TRIGGER finder_kyc_updated BEFORE UPDATE ON public.kyc_verifications FOR EACH ROW EXECUTE FUNCTION public.finder_updated_at();
CREATE TRIGGER finder_listings_updated BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.finder_listing_edit();

REVOKE ALL ON FUNCTION public.get_current_user_role(), public.is_admin(), public.finder_updated_at(), public.finder_listing_edit(), public.finder_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role(), public.is_admin() TO authenticated, service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles, public.kyc_verifications, public.listings, public.favorites FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.profiles, public.kyc_verifications, public.listings, public.favorites TO service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone_number, avatar_url, bio) ON public.profiles TO authenticated;
CREATE POLICY finder_profile_read ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY finder_profile_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() AND NOT is_suspended) WITH CHECK (id = auth.uid() AND NOT is_suspended);

GRANT SELECT ON public.kyc_verifications TO authenticated;
GRANT INSERT (landlord_id, id_type, id_document_url, proof_of_ownership_url) ON public.kyc_verifications TO authenticated;
CREATE POLICY finder_kyc_read ON public.kyc_verifications FOR SELECT TO authenticated USING (landlord_id = auth.uid());
CREATE POLICY finder_kyc_submit ON public.kyc_verifications FOR INSERT TO authenticated
  WITH CHECK (landlord_id = auth.uid() AND public.get_current_user_role() = 'landlord' AND status = 'pending');

GRANT SELECT ON public.listings TO anon, authenticated;
GRANT INSERT (title, description, price, currency, rental_period, property_type, latitude, longitude, address, city,
  is_available, owner_id, image_urls, max_occupants, bathroom_type, cooking_allowed, laundry_allowed, curfew_type,
  wifi_available, aircon, water_included, electricity_included, motorcycle_parking, car_parking) ON public.listings TO authenticated;
GRANT UPDATE (title, description, price, currency, rental_period, property_type, latitude, longitude, address, city,
  is_available, image_urls, max_occupants, bathroom_type, cooking_allowed, laundry_allowed, curfew_type,
  wifi_available, aircon, water_included, electricity_included, motorcycle_parking, car_parking) ON public.listings TO authenticated;
GRANT DELETE ON public.listings TO authenticated;
CREATE POLICY finder_listing_public ON public.listings FOR SELECT TO anon, authenticated
  USING (is_available AND status = 'published');
CREATE POLICY finder_listing_own_read ON public.listings FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY finder_listing_insert ON public.listings FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.get_current_user_role() = 'landlord' AND status = 'draft'
    AND verification_status IS NULL AND direct_landlord IS NULL);
CREATE POLICY finder_listing_update ON public.listings FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND public.get_current_user_role() = 'landlord')
  WITH CHECK (owner_id = auth.uid() AND public.get_current_user_role() = 'landlord');
CREATE POLICY finder_listing_delete ON public.listings FOR DELETE TO authenticated
  USING (owner_id = auth.uid() AND public.get_current_user_role() = 'landlord');

GRANT SELECT, DELETE ON public.favorites TO authenticated;
GRANT INSERT (user_id, listing_id) ON public.favorites TO authenticated;
CREATE POLICY finder_favorite_read ON public.favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY finder_favorite_delete ON public.favorites FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY finder_favorite_insert ON public.favorites FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.get_current_user_role() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.status = 'published' AND l.is_available));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('property-images', 'property-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('kyc-documents', 'kyc-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf']);
-- Public images are intentionally retrievable even before/after a listing is published.
CREATE POLICY finder_images_read ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'property-images');
CREATE POLICY finder_kyc_objects_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY finder_objects_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('property-images', 'kyc-documents') AND (storage.foldername(name))[1] = auth.uid()::text
    AND name !~ '(^|/)\.\.?(/|$)' AND public.get_current_user_role() = 'landlord');
-- KYC evidence is immutable to clients after upload; only trusted review/retention tooling can remove it.
CREATE POLICY finder_images_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'property-images' AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.get_current_user_role() = 'landlord')
  WITH CHECK (bucket_id = 'property-images' AND (storage.foldername(name))[1] = auth.uid()::text
    AND name !~ '(^|/)\.\.?(/|$)' AND public.get_current_user_role() = 'landlord');
CREATE POLICY finder_images_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'property-images' AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.get_current_user_role() = 'landlord');

COMMIT;
