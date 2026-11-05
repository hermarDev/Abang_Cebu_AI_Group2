-- Add private property and unit storage without changing existing finder listings.
-- Writes and public discovery remain disabled until their reviewed workflows exist.
BEGIN;

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 10000),
  property_type text NOT NULL CHECK (property_type IN ('apartment', 'condominium', 'house', 'townhouse', 'commercial', 'boarding_house')),
  street_address text NOT NULL CHECK (length(btrim(street_address)) BETWEEN 1 AND 1000),
  barangay text NOT NULL CHECK (length(btrim(barangay)) BETWEEN 1 AND 200),
  city text NOT NULL CHECK (length(btrim(city)) BETWEEN 1 AND 200),
  postal_code text CHECK (postal_code IS NULL OR length(btrim(postal_code)) BETWEEN 1 AND 20),
  coordinates extensions.geometry(Point, 4326) NOT NULL CHECK (NOT extensions.ST_IsEmpty(coordinates)
    AND extensions.ST_X(coordinates) BETWEEN -180 AND 180 AND extensions.ST_Y(coordinates) BETWEEN -90 AND 90),
  latitude numeric(10,7) GENERATED ALWAYS AS (extensions.ST_Y(coordinates)::numeric) STORED,
  longitude numeric(10,7) GENERATED ALWAYS AS (extensions.ST_X(coordinates)::numeric) STORED,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  moderation_note text,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX property_landlord_idx ON public.properties(landlord_id);
CREATE INDEX property_coordinates_idx ON public.properties USING GIST (coordinates);

CREATE TABLE public.rental_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number text,
  rental_type text NOT NULL CHECK (rental_type IN ('entire_place', 'private_room', 'shared_room', 'bedspace')),
  monthly_rent numeric(10,2) NOT NULL CHECK (monthly_rent > 0),
  security_deposit numeric(10,2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
  advance_rent numeric(10,2) NOT NULL DEFAULT 0 CHECK (advance_rent >= 0),
  bedrooms integer NOT NULL DEFAULT 1 CHECK (bedrooms >= 0),
  bathrooms numeric(3,1) NOT NULL DEFAULT 1 CHECK (bathrooms >= 0),
  floor_area_sqm numeric(6,2) CHECK (floor_area_sqm > 0),
  max_occupants integer NOT NULL DEFAULT 1 CHECK (max_occupants > 0),
  furnished_status text NOT NULL DEFAULT 'unfurnished' CHECK (furnished_status IN ('unfurnished', 'semi_furnished', 'fully_furnished')),
  is_available boolean NOT NULL DEFAULT true,
  available_from date NOT NULL DEFAULT current_date,
  minimum_lease_months integer NOT NULL DEFAULT 6 CHECK (minimum_lease_months >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rental_unit_property_idx ON public.rental_units(property_id);
CREATE TRIGGER property_updated BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.finder_updated_at();
CREATE TRIGGER rental_unit_updated BEFORE UPDATE ON public.rental_units FOR EACH ROW EXECUTE FUNCTION public.finder_updated_at();

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_units ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.properties, public.rental_units FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, landlord_id, title, description, property_type, street_address, barangay, city, postal_code,
  latitude, longitude, status, approved_by, approved_at, created_at, updated_at) ON public.properties TO authenticated;
GRANT SELECT ON public.rental_units TO authenticated;
CREATE POLICY property_owner_read ON public.properties FOR SELECT TO authenticated
  USING (landlord_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles profile
    WHERE profile.id = auth.uid() AND profile.role = 'landlord' AND NOT profile.is_suspended));
CREATE POLICY rental_unit_owner_read ON public.rental_units FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p JOIN public.profiles profile ON profile.id = p.landlord_id
    WHERE p.id = property_id AND p.landlord_id = auth.uid() AND profile.role = 'landlord' AND NOT profile.is_suspended));

COMMIT;
