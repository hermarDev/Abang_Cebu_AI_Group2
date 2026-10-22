-- SCRUM-142: least-privilege RLS policies for the current public schema.
-- Public listing reads are column-limited; ownership and admin actions are row-scoped.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT p.role FROM public.profiles AS p WHERE p.id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles AS p
        WHERE p.id = auth.uid() AND p.role = 'admin'::public.user_role
    );
$function$;

REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.rls_public_property(p_property_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.properties AS p
        JOIN public.profiles AS host ON host.id = p.landlord_id
        WHERE p.id = $1 AND p.status = 'approved' AND host.is_suspended = false
    );
$function$;
REVOKE ALL ON FUNCTION public.rls_public_property(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_public_property(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
BEGIN
    IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_suspended IS DISTINCT FROM OLD.is_suspended)
       AND current_user NOT IN ('postgres', 'service_role')
       AND COALESCE(auth.role(), '') <> 'service_role'
       AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins may change profile role or suspension state'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$function$;
CREATE TRIGGER guard_profile_role_change
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role_change();

-- Replace permissive profile/KYC policies from the bootstrap migration.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Landlords and Admins can view KYC submissions" ON public.kyc_verifications;
DROP POLICY IF EXISTS "Landlords can submit KYC verification" ON public.kyc_verifications;
DROP POLICY IF EXISTS "Admins can review and update KYC status" ON public.kyc_verifications;

REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, full_name, avatar_url) ON public.profiles TO anon;
GRANT SELECT (id, role, full_name, phone_number, avatar_url, bio, is_suspended, created_at, updated_at)
    ON public.profiles TO authenticated;
GRANT SELECT (role, is_suspended) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone_number, avatar_url, bio) ON public.profiles TO authenticated;
CREATE POLICY profiles_public_read ON public.profiles
    FOR SELECT TO anon USING (true);
CREATE POLICY profiles_self_admin_read ON public.profiles
    FOR SELECT TO authenticated USING (id = (SELECT auth.uid()) OR public.is_admin());
CREATE POLICY profiles_self_update ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid()))
    WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY profiles_admin_all ON public.profiles
    FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

REVOKE ALL ON TABLE public.kyc_verifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.kyc_verifications TO authenticated;
GRANT INSERT (landlord_id, id_type, id_document_url, proof_of_ownership_url)
    ON public.kyc_verifications TO authenticated;
GRANT UPDATE (status, reviewed_by, reviewed_at, rejection_reason)
    ON public.kyc_verifications TO authenticated;
CREATE POLICY kyc_owner_admin_read ON public.kyc_verifications
    FOR SELECT TO authenticated
    USING (landlord_id = (SELECT auth.uid()) OR public.is_admin());
CREATE POLICY kyc_landlord_pending_insert ON public.kyc_verifications
    FOR INSERT TO authenticated
    WITH CHECK (
        landlord_id = (SELECT auth.uid())
        AND public.get_current_user_role() = 'landlord'::public.user_role
        AND status = 'pending'::public.kyc_status
        AND reviewed_by IS NULL AND reviewed_at IS NULL
    );
CREATE POLICY kyc_admin_review ON public.kyc_verifications
    FOR UPDATE TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

REVOKE ALL ON TABLE public.properties FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, landlord_id, title, property_type, city, barangay, coordinates,
              latitude, longitude, status, created_at, updated_at)
    ON public.properties TO anon;
GRANT SELECT (id, landlord_id, title, description, property_type, street_address,
              barangay, city, postal_code, coordinates, latitude, longitude, status,
              created_at, updated_at)
    ON public.properties TO authenticated;
GRANT INSERT (id, landlord_id, title, description, property_type, street_address,
              barangay, city, postal_code, coordinates, status)
    ON public.properties TO authenticated;
GRANT UPDATE (title, description, property_type, street_address, barangay, city,
              postal_code, coordinates)
    ON public.properties TO authenticated;
GRANT DELETE ON public.properties TO authenticated;
CREATE POLICY properties_public_approved_read ON public.properties
    FOR SELECT TO anon, authenticated USING (public.rls_public_property(id));
CREATE POLICY properties_owner_read ON public.properties
    FOR SELECT TO authenticated USING (landlord_id = (SELECT auth.uid()));
CREATE POLICY properties_admin_read ON public.properties
    FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY properties_landlord_pending_insert ON public.properties
    FOR INSERT TO authenticated
    WITH CHECK (
        landlord_id = (SELECT auth.uid())
        AND public.get_current_user_role() = 'landlord'::public.user_role
        AND status = 'pending'
    );
CREATE POLICY properties_owner_update ON public.properties
    FOR UPDATE TO authenticated
    USING (landlord_id = (SELECT auth.uid()))
    WITH CHECK (landlord_id = (SELECT auth.uid()));
CREATE POLICY properties_admin_update ON public.properties
    FOR UPDATE TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY properties_owner_admin_delete ON public.properties
    FOR DELETE TO authenticated
    USING (landlord_id = (SELECT auth.uid()) OR public.is_admin());

REVOKE ALL ON TABLE public.rental_units FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, property_id, rental_type, monthly_rent, is_available)
    ON public.rental_units TO anon;
GRANT SELECT (id, property_id, unit_number, rental_type, monthly_rent, bedrooms,
              bathrooms, floor_area_sqm, max_occupants, furnished_status,
              is_available, available_from, minimum_lease_months, created_at, updated_at)
    ON public.rental_units TO authenticated;
GRANT INSERT (id, property_id, unit_number, rental_type, monthly_rent, security_deposit,
              advance_rent, bedrooms, bathrooms, floor_area_sqm, max_occupants,
              furnished_status, is_available, available_from, minimum_lease_months)
    ON public.rental_units TO authenticated;
GRANT UPDATE (unit_number, rental_type, monthly_rent, security_deposit, advance_rent,
              bedrooms, bathrooms, floor_area_sqm, max_occupants, furnished_status,
              is_available, available_from, minimum_lease_months)
    ON public.rental_units TO authenticated;
GRANT DELETE ON public.rental_units TO authenticated;
CREATE POLICY rental_units_public_available_read ON public.rental_units
    FOR SELECT TO anon, authenticated
    USING (
        is_available
        AND EXISTS (
            SELECT 1 FROM public.properties AS p
            WHERE p.id = rental_units.property_id AND p.status = 'approved'
              AND public.rls_public_property(p.id)
        )
    );
CREATE POLICY rental_units_owner_admin_read ON public.rental_units
    FOR SELECT TO authenticated
    USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.properties AS p
            WHERE p.id = rental_units.property_id AND p.landlord_id = (SELECT auth.uid())
        )
    );
CREATE POLICY rental_units_owner_insert ON public.rental_units
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.properties AS p
        WHERE p.id = rental_units.property_id AND p.landlord_id = (SELECT auth.uid())
    ));
CREATE POLICY rental_units_owner_admin_update ON public.rental_units
    FOR UPDATE TO authenticated
    USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.properties AS p
            WHERE p.id = rental_units.property_id AND p.landlord_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.properties AS p
            WHERE p.id = rental_units.property_id AND p.landlord_id = (SELECT auth.uid())
        )
    );
CREATE POLICY rental_units_owner_admin_delete ON public.rental_units
    FOR DELETE TO authenticated
    USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.properties AS p
            WHERE p.id = rental_units.property_id AND p.landlord_id = (SELECT auth.uid())
        )
    );

REVOKE ALL ON TABLE public.property_photos FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, property_id, unit_id, public_url, caption, display_order, is_cover, created_at)
    ON public.property_photos TO anon;
GRANT SELECT (id, property_id, unit_id, storage_path, public_url, caption,
              display_order, is_cover, created_at)
    ON public.property_photos TO authenticated;
GRANT INSERT (id, property_id, unit_id, storage_path, public_url, caption, display_order, is_cover)
    ON public.property_photos TO authenticated;
GRANT DELETE ON public.property_photos TO authenticated;
CREATE POLICY property_photos_public_read ON public.property_photos
    FOR SELECT TO anon, authenticated
    USING (public.rls_public_property(property_id));
CREATE POLICY property_photos_owner_admin_read ON public.property_photos
    FOR SELECT TO authenticated
    USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.properties AS p
            WHERE p.id = property_photos.property_id AND p.landlord_id = (SELECT auth.uid())
        )
    );
CREATE POLICY property_photos_owner_insert ON public.property_photos
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.properties AS p
        WHERE p.id = property_photos.property_id AND p.landlord_id = (SELECT auth.uid())
    ));
CREATE POLICY property_photos_owner_admin_delete ON public.property_photos
    FOR DELETE TO authenticated
    USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.properties AS p
            WHERE p.id = property_photos.property_id AND p.landlord_id = (SELECT auth.uid())
        )
    );

REVOKE ALL ON TABLE public.amenities FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.amenities TO anon, authenticated;
CREATE POLICY amenities_public_read ON public.amenities
    FOR SELECT TO anon, authenticated USING (true);

REVOKE ALL ON TABLE public.property_amenities FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.property_amenities TO anon, authenticated;
GRANT INSERT (property_id, amenity_id) ON public.property_amenities TO authenticated;
GRANT DELETE ON public.property_amenities TO authenticated;
CREATE POLICY property_amenities_public_read ON public.property_amenities
    FOR SELECT TO anon, authenticated
    USING (EXISTS (
        SELECT 1 FROM public.properties AS p
        WHERE p.id = property_amenities.property_id
          AND public.rls_public_property(p.id)
    ));
CREATE POLICY property_amenities_owner_admin_read ON public.property_amenities
    FOR SELECT TO authenticated
    USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.properties AS p
            WHERE p.id = property_amenities.property_id AND p.landlord_id = (SELECT auth.uid())
        )
    );
CREATE POLICY property_amenities_owner_insert ON public.property_amenities
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.properties AS p
        WHERE p.id = property_amenities.property_id AND p.landlord_id = (SELECT auth.uid())
    ));
CREATE POLICY property_amenities_owner_admin_delete ON public.property_amenities
    FOR DELETE TO authenticated
    USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.properties AS p
            WHERE p.id = property_amenities.property_id AND p.landlord_id = (SELECT auth.uid())
        )
    );

REVOKE ALL ON TABLE public.inquiries FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.inquiries TO authenticated;
GRANT INSERT (id, property_id, unit_id, renter_id, landlord_id, message, preferred_move_in_date)
    ON public.inquiries TO authenticated;
GRANT UPDATE (status, viewing_date) ON public.inquiries TO authenticated;
CREATE POLICY inquiries_party_admin_read ON public.inquiries
    FOR SELECT TO authenticated
    USING (renter_id = (SELECT auth.uid()) OR landlord_id = (SELECT auth.uid()) OR public.is_admin());
CREATE POLICY inquiries_renter_insert ON public.inquiries
    FOR INSERT TO authenticated
    WITH CHECK (
        renter_id = (SELECT auth.uid())
        AND public.get_current_user_role() = 'renter'::public.user_role
        AND status = 'pending'
        AND EXISTS (
            SELECT 1 FROM public.properties AS p
            WHERE p.id = inquiries.property_id
              AND p.landlord_id = inquiries.landlord_id
              AND p.status = 'approved'
              AND public.rls_public_property(p.id)
        )
    );
CREATE POLICY inquiries_party_admin_update ON public.inquiries
    FOR UPDATE TO authenticated
    USING (renter_id = (SELECT auth.uid()) OR landlord_id = (SELECT auth.uid()) OR public.is_admin())
    WITH CHECK (renter_id = (SELECT auth.uid()) OR landlord_id = (SELECT auth.uid()) OR public.is_admin());

REVOKE ALL ON TABLE public.saved_listings FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.saved_listings TO authenticated;
GRANT INSERT (id, renter_id, property_id) ON public.saved_listings TO authenticated;
CREATE POLICY saved_listings_renter_all ON public.saved_listings
    FOR ALL TO authenticated
    USING (renter_id = (SELECT auth.uid()) AND public.get_current_user_role() = 'renter'::public.user_role)
    WITH CHECK (renter_id = (SELECT auth.uid()) AND public.get_current_user_role() = 'renter'::public.user_role);

REVOKE ALL ON TABLE public.reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT (id, property_id, renter_id, rating, comment) ON public.reviews TO authenticated;
CREATE POLICY reviews_public_read ON public.reviews
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY reviews_renter_insert ON public.reviews
    FOR INSERT TO authenticated
    WITH CHECK (
        renter_id = (SELECT auth.uid())
        AND public.get_current_user_role() = 'renter'::public.user_role
        AND is_verified_tenant = false
    );

REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT (id, actor_id, action, target_type, target_id, details, ip_address)
    ON public.audit_logs TO authenticated;
REVOKE TRUNCATE ON public.audit_logs FROM PUBLIC, anon, authenticated;
CREATE POLICY audit_logs_admin_read ON public.audit_logs
    FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY audit_logs_admin_insert ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (actor_id = (SELECT auth.uid()) AND public.is_admin());

COMMIT;
