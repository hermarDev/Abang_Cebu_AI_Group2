-- =============================================================================
-- SCRUM-140: core property and rental listing schema
-- Source of truth: docs/database/database-erd.md (PostgreSQL 15+, Supabase).
-- Existing schema history contains profiles/KYC only; this adds properties,
-- rental_units, property_photos, amenities, and property_amenities (not listings).
--
-- Rollback: Supabase migrations are forward-only. A rollback requires a reviewed,
-- compensating migration; dropping these tables/types is destructive and loses data.
-- =============================================================================

BEGIN;

DO $$ BEGIN
    CREATE TYPE public.rental_unit_type AS ENUM (
        'entire_place',
        'private_room',
        'shared_room',
        'bedspace'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    property_type TEXT NOT NULL,
    street_address TEXT NOT NULL,
    barangay TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Cebu City',
    postal_code TEXT,
    coordinates extensions.geography(Point, 4326) NOT NULL,
    latitude NUMERIC(10, 7) GENERATED ALWAYS AS (extensions.ST_Y(coordinates::extensions.geometry)) STORED,
    longitude NUMERIC(10, 7) GENERATED ALWAYS AS (extensions.ST_X(coordinates::extensions.geometry)) STORED,
    status TEXT NOT NULL DEFAULT 'pending',
    moderation_note TEXT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT properties_title_nonempty CHECK (btrim(title) <> ''),
    CONSTRAINT properties_description_nonempty CHECK (btrim(description) <> ''),
    CONSTRAINT properties_street_address_nonempty CHECK (btrim(street_address) <> ''),
    CONSTRAINT properties_barangay_nonempty CHECK (btrim(barangay) <> ''),
    CONSTRAINT properties_city_nonempty CHECK (btrim(city) <> ''),
    CONSTRAINT properties_type_check CHECK (
        property_type IN ('apartment', 'condominium', 'house', 'townhouse', 'commercial', 'boarding_house')
    ),
    CONSTRAINT properties_status_check CHECK (
        status IN ('pending', 'approved', 'rejected', 'archived')
    ),
    CONSTRAINT properties_coordinates_nonempty CHECK (
        NOT extensions.ST_IsEmpty(coordinates::extensions.geometry)
    ),
    CONSTRAINT properties_coordinates_range_check CHECK (
        extensions.ST_X(coordinates::extensions.geometry) BETWEEN -180 AND 180
        AND extensions.ST_Y(coordinates::extensions.geometry) BETWEEN -90 AND 90
    ),
    -- Supports composite FK checks that keep inquiry landlord ownership aligned.
    CONSTRAINT properties_id_landlord_id_key UNIQUE (id, landlord_id)
);

CREATE INDEX IF NOT EXISTS idx_properties_coordinates
    ON public.properties USING GIST (coordinates);
CREATE INDEX IF NOT EXISTS idx_properties_status
    ON public.properties (status);
CREATE INDEX IF NOT EXISTS idx_properties_landlord
    ON public.properties (landlord_id);
CREATE INDEX IF NOT EXISTS idx_properties_city_barangay
    ON public.properties (city, barangay);

CREATE TABLE IF NOT EXISTS public.rental_units (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_number TEXT,
    rental_type public.rental_unit_type NOT NULL,
    monthly_rent NUMERIC(10, 2) NOT NULL,
    security_deposit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    advance_rent NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    bedrooms INTEGER NOT NULL DEFAULT 1,
    bathrooms NUMERIC(3, 1) NOT NULL DEFAULT 1.0,
    floor_area_sqm NUMERIC(6, 2),
    max_occupants INTEGER NOT NULL DEFAULT 1,
    furnished_status TEXT NOT NULL DEFAULT 'unfurnished',
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    available_from DATE NOT NULL DEFAULT CURRENT_DATE,
    minimum_lease_months INTEGER NOT NULL DEFAULT 6,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT rental_units_id_property_id_key UNIQUE (id, property_id),
    CONSTRAINT rental_units_number_nonempty CHECK (unit_number IS NULL OR btrim(unit_number) <> ''),
    CONSTRAINT rental_units_monthly_rent_positive CHECK (monthly_rent > 0),
    CONSTRAINT rental_units_security_deposit_nonnegative CHECK (security_deposit >= 0),
    CONSTRAINT rental_units_advance_rent_nonnegative CHECK (advance_rent >= 0),
    CONSTRAINT rental_units_bedrooms_nonnegative CHECK (bedrooms >= 0),
    CONSTRAINT rental_units_bathrooms_nonnegative CHECK (bathrooms >= 0),
    CONSTRAINT rental_units_floor_area_positive CHECK (floor_area_sqm IS NULL OR floor_area_sqm > 0),
    CONSTRAINT rental_units_max_occupants_positive CHECK (max_occupants > 0),
    CONSTRAINT rental_units_furnished_status_check CHECK (
        furnished_status IN ('unfurnished', 'semi_furnished', 'fully_furnished')
    ),
    CONSTRAINT rental_units_minimum_lease_positive CHECK (minimum_lease_months > 0)
);

CREATE INDEX IF NOT EXISTS idx_rental_units_property
    ON public.rental_units (property_id);
CREATE INDEX IF NOT EXISTS idx_rental_units_price
    ON public.rental_units (monthly_rent);
CREATE INDEX IF NOT EXISTS idx_rental_units_available
    ON public.rental_units (is_available) WHERE is_available = TRUE;

CREATE TABLE IF NOT EXISTS public.property_photos (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_id UUID,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    caption TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT property_photos_unit_property_fkey
        FOREIGN KEY (unit_id, property_id)
        REFERENCES public.rental_units(id, property_id) ON DELETE CASCADE,
    CONSTRAINT property_photos_storage_path_nonempty CHECK (btrim(storage_path) <> ''),
    CONSTRAINT property_photos_public_url_nonempty CHECK (btrim(public_url) <> ''),
    CONSTRAINT property_photos_display_order_nonnegative CHECK (display_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_property_photos_property
    ON public.property_photos (property_id);
CREATE INDEX IF NOT EXISTS idx_property_photos_unit
    ON public.property_photos (unit_id) WHERE unit_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.amenities (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    icon_name TEXT,
    CONSTRAINT amenities_name_nonempty CHECK (btrim(name) <> ''),
    CONSTRAINT amenities_category_check CHECK (
        category IN ('utility', 'comfort', 'security', 'policy')
    )
);

CREATE TABLE IF NOT EXISTS public.property_amenities (
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
    CONSTRAINT property_amenities_pkey PRIMARY KEY (property_id, amenity_id)
);

CREATE INDEX IF NOT EXISTS idx_property_amenities_amenity
    ON public.property_amenities (amenity_id);

-- Reuse the shared timestamp trigger function established by migration 00001.
DROP TRIGGER IF EXISTS set_properties_updated_at ON public.properties;
CREATE TRIGGER set_properties_updated_at
    BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_rental_units_updated_at ON public.rental_units;
CREATE TRIGGER set_rental_units_updated_at
    BEFORE UPDATE ON public.rental_units
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS is enabled with no client-role policies in this schema-only slice. This is
-- intentionally default-deny until a separately reviewed access-policy change.
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_amenities ENABLE ROW LEVEL SECURITY;

COMMIT;
