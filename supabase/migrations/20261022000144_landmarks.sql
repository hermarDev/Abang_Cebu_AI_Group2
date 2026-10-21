-- SCRUM-144: seedable public landmark registry and local draft listings.
BEGIN;

ALTER TABLE public.properties
    DROP CONSTRAINT properties_status_check;
ALTER TABLE public.properties
    ADD CONSTRAINT properties_status_check
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'archived'));

CREATE TABLE public.landmarks (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('university', 'business_hub', 'commercial')),
    coordinates extensions.geography(Point, 4326) NOT NULL,
    default_radius_meters INTEGER NOT NULL CHECK (default_radius_meters BETWEEN 1 AND 50000),
    aliases TEXT[] NOT NULL DEFAULT '{}',
    CONSTRAINT landmarks_slug_nonempty CHECK (btrim(slug) <> ''),
    CONSTRAINT landmarks_name_nonempty CHECK (btrim(name) <> ''),
    CONSTRAINT landmarks_aliases_nonnull CHECK (array_position(aliases, NULL) IS NULL),
    CONSTRAINT landmarks_coordinates_range_check CHECK (
        extensions.ST_X(coordinates::extensions.geometry) BETWEEN -180 AND 180
        AND extensions.ST_Y(coordinates::extensions.geometry) BETWEEN -90 AND 90
    )
);

CREATE INDEX landmarks_coordinates_gist ON public.landmarks USING GIST (coordinates);
ALTER TABLE public.landmarks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.landmarks FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.landmarks TO anon, authenticated;
CREATE POLICY landmarks_public_read ON public.landmarks
    FOR SELECT TO anon, authenticated USING (true);

COMMIT;
