-- SCRUM-143: bounded PostGIS searches for approved rental inventory.
-- SECURITY INVOKER deliberately preserves caller RLS. No public SELECT policies
-- are added here; public access is default-deny until the RLS ticket defines it.
BEGIN;

CREATE OR REPLACE FUNCTION public.search_listings_in_viewport(
    p_min_lng double precision,
    p_min_lat double precision,
    p_max_lng double precision,
    p_max_lat double precision,
    p_min_rent numeric DEFAULT NULL,
    p_max_rent numeric DEFAULT NULL,
    p_property_types text[] DEFAULT NULL,
    p_amenities text[] DEFAULT NULL,
    p_limit integer DEFAULT 200
)
RETURNS TABLE (
    property_id uuid, title text, property_type text, city text, barangay text,
    latitude double precision, longitude double precision, min_rent numeric,
    max_rent numeric, available_units bigint, cluster_count bigint
)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_envelope extensions.geometry;
BEGIN
    IF p_min_lng IS NULL OR p_min_lat IS NULL OR p_max_lng IS NULL OR p_max_lat IS NULL
       OR NOT (p_min_lng BETWEEN -180 AND 180) OR NOT (p_max_lng BETWEEN -180 AND 180)
       OR NOT (p_min_lat BETWEEN -90 AND 90) OR NOT (p_max_lat BETWEEN -90 AND 90)
       OR p_min_lng >= p_max_lng OR p_min_lat >= p_max_lat THEN
        RAISE EXCEPTION 'Invalid viewport bounds' USING ERRCODE = '22023';
    END IF;
    IF p_max_lng - p_min_lng > 180 THEN
        RAISE EXCEPTION 'Viewport longitude span is too wide' USING ERRCODE = '22023';
    END IF;
    IF (p_min_rent IS NOT NULL AND p_min_rent < 0) OR (p_max_rent IS NOT NULL AND p_max_rent < 0)
       OR (p_min_rent IS NOT NULL AND p_max_rent IS NOT NULL AND p_min_rent > p_max_rent) THEN
        RAISE EXCEPTION 'Invalid rent range' USING ERRCODE = '22023';
    END IF;
    IF p_limit IS NULL OR p_limit < 1 OR p_limit > 500 THEN
        RAISE EXCEPTION 'Limit must be between 1 and 500' USING ERRCODE = '22023';
    END IF;

    v_envelope := extensions.ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326);
    RETURN QUERY
    WITH candidate_properties AS MATERIALIZED (
        SELECT p.id AS property_id, p.title, p.property_type, p.city, p.barangay,
               extensions.ST_Y(p.coordinates::extensions.geometry) AS latitude,
               extensions.ST_X(p.coordinates::extensions.geometry) AS longitude
        FROM public.properties AS p
        JOIN public.profiles AS host ON host.id = p.landlord_id
        WHERE p.status = 'approved'
          AND host.is_suspended = FALSE
          AND p.coordinates OPERATOR(extensions.&&) v_envelope::extensions.geography
          AND extensions.ST_Intersects(p.coordinates::extensions.geometry, v_envelope)
          AND (p_property_types IS NULL OR cardinality(p_property_types) = 0 OR p.property_type = ANY(p_property_types))
          AND (p_amenities IS NULL OR cardinality(p_amenities) = 0 OR NOT EXISTS (
              SELECT 1 FROM unnest(p_amenities) AS requested(name)
              WHERE NOT EXISTS (
                  SELECT 1 FROM public.property_amenities AS pa
                  JOIN public.amenities AS a ON a.id = pa.amenity_id
                  WHERE pa.property_id = p.id AND a.name = requested.name
              )
          ))
    ), matching AS MATERIALIZED (
        SELECT p.property_id, p.title, p.property_type, p.city, p.barangay,
               p.latitude, p.longitude, u.monthly_rent
        FROM candidate_properties AS p
        JOIN public.rental_units AS u ON u.property_id = p.property_id
        WHERE u.is_available
          AND (p_min_rent IS NULL OR u.monthly_rent >= p_min_rent)
          AND (p_max_rent IS NULL OR u.monthly_rent <= p_max_rent)
    ), grouped AS (
        SELECT m.property_id, min(m.title) AS title, min(m.property_type) AS property_type,
               min(m.city) AS city, min(m.barangay) AS barangay,
               min(m.latitude) AS latitude, min(m.longitude) AS longitude,
               min(m.monthly_rent) AS min_rent, max(m.monthly_rent) AS max_rent,
               count(*)::bigint AS available_units
        FROM matching AS m GROUP BY m.property_id
    ), ranked AS (
        SELECT g.*, count(*) OVER ()::bigint AS cluster_count
        FROM grouped AS g ORDER BY g.property_id LIMIT p_limit
    )
    SELECT r.property_id, r.title, r.property_type, r.city, r.barangay,
           r.latitude, r.longitude, r.min_rent, r.max_rent, r.available_units, r.cluster_count
    FROM ranked AS r ORDER BY r.property_id;
END;
$$;

COMMENT ON FUNCTION public.search_listings_in_viewport(double precision,double precision,double precision,double precision,numeric,numeric,text[],text[],integer)
IS 'Returns bounded approved/available listings intersecting a WGS84 viewport. SECURITY INVOKER preserves RLS.';

CREATE OR REPLACE FUNCTION public.search_listings_near_landmark(
    p_landmark_lng double precision, p_landmark_lat double precision, p_radius_meters double precision,
    p_min_rent numeric DEFAULT NULL, p_max_rent numeric DEFAULT NULL,
    p_property_types text[] DEFAULT NULL, p_amenities text[] DEFAULT NULL, p_limit integer DEFAULT 200
)
RETURNS TABLE (
    property_id uuid, title text, property_type text, city text, barangay text,
    latitude double precision, longitude double precision, distance_meters double precision,
    min_rent numeric, max_rent numeric, available_units bigint
)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
    IF p_landmark_lng IS NULL OR p_landmark_lat IS NULL
       OR NOT (p_landmark_lng BETWEEN -180 AND 180) OR NOT (p_landmark_lat BETWEEN -90 AND 90)
       OR p_radius_meters IS NULL OR NOT (p_radius_meters > 0 AND p_radius_meters <= 50000) THEN
        RAISE EXCEPTION 'Invalid landmark coordinates or radius' USING ERRCODE = '22023';
    END IF;
    IF (p_min_rent IS NOT NULL AND p_min_rent < 0) OR (p_max_rent IS NOT NULL AND p_max_rent < 0)
       OR (p_min_rent IS NOT NULL AND p_max_rent IS NOT NULL AND p_min_rent > p_max_rent) THEN
        RAISE EXCEPTION 'Invalid rent range' USING ERRCODE = '22023';
    END IF;
    IF p_limit IS NULL OR p_limit < 1 OR p_limit > 500 THEN
        RAISE EXCEPTION 'Limit must be between 1 and 500' USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    WITH origin AS (
        SELECT extensions.ST_SetSRID(extensions.ST_MakePoint(p_landmark_lng,p_landmark_lat),4326)::extensions.geography AS point
    ), candidate_properties AS MATERIALIZED (
        SELECT p.id AS property_id, p.title, p.property_type, p.city, p.barangay,
               extensions.ST_Y(p.coordinates::extensions.geometry) AS latitude,
               extensions.ST_X(p.coordinates::extensions.geometry) AS longitude,
               extensions.ST_Distance(p.coordinates,origin.point) AS distance_meters
        FROM public.properties AS p
        CROSS JOIN origin
        JOIN public.profiles AS host ON host.id = p.landlord_id
        WHERE p.status = 'approved'
          AND host.is_suspended = FALSE
          AND extensions.ST_DWithin(p.coordinates,origin.point,p_radius_meters)
          AND (p_property_types IS NULL OR cardinality(p_property_types) = 0 OR p.property_type = ANY(p_property_types))
          AND (p_amenities IS NULL OR cardinality(p_amenities) = 0 OR NOT EXISTS (
              SELECT 1 FROM unnest(p_amenities) AS requested(name)
              WHERE NOT EXISTS (
                  SELECT 1 FROM public.property_amenities AS pa
                  JOIN public.amenities AS a ON a.id = pa.amenity_id
                  WHERE pa.property_id = p.id AND a.name = requested.name
              )
          ))
    ), matching AS (
        SELECT p.property_id, p.title, p.property_type, p.city, p.barangay,
               p.latitude, p.longitude, p.distance_meters, u.monthly_rent
        FROM candidate_properties AS p
        JOIN public.rental_units AS u ON u.property_id = p.property_id
        WHERE u.is_available
          AND (p_min_rent IS NULL OR u.monthly_rent >= p_min_rent)
          AND (p_max_rent IS NULL OR u.monthly_rent <= p_max_rent)
    )
    SELECT m.property_id,min(m.title),min(m.property_type),min(m.city),min(m.barangay),
           min(m.latitude),min(m.longitude),min(m.distance_meters),
           min(m.monthly_rent),max(m.monthly_rent),count(*)::bigint
    FROM matching AS m GROUP BY m.property_id
    ORDER BY min(m.distance_meters),m.property_id LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.search_listings_near_landmark(double precision,double precision,double precision,numeric,numeric,text[],text[],integer)
IS 'Returns bounded approved/available listings within a WGS84 radius. SECURITY INVOKER preserves RLS.';

REVOKE ALL ON FUNCTION public.search_listings_in_viewport(double precision,double precision,double precision,double precision,numeric,numeric,text[],text[],integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_listings_near_landmark(double precision,double precision,double precision,numeric,numeric,text[],text[],integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_listings_in_viewport(double precision,double precision,double precision,double precision,numeric,numeric,text[],text[],integer) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.search_listings_near_landmark(double precision,double precision,double precision,numeric,numeric,text[],text[],integer) TO anon,authenticated;

COMMIT;
