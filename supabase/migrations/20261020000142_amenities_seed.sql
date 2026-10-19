-- =============================================================================
-- SCRUM-140: seed the standard amenities catalog from database-erd.md.
-- Reapplying this migration preserves amenity IDs and reconciles catalog data.
-- =============================================================================

BEGIN;

INSERT INTO public.amenities (id, name, category, icon_name)
VALUES
    ('14000000-0000-4000-8000-000000000101', 'Sub-metered Electricity', 'utility', 'zap'),
    ('14000000-0000-4000-8000-000000000102', 'Sub-metered Water', 'utility', 'droplets'),
    ('14000000-0000-4000-8000-000000000103', 'Deep Well Backup', 'utility', 'waves'),
    ('14000000-0000-4000-8000-000000000104', 'Generator Backup', 'utility', 'power'),
    ('14000000-0000-4000-8000-000000000105', 'Air Conditioning', 'comfort', 'air-vent'),
    ('14000000-0000-4000-8000-000000000106', 'High-speed Fiber WiFi', 'comfort', 'wifi'),
    ('14000000-0000-4000-8000-000000000107', 'Hot Shower', 'comfort', 'shower-head'),
    ('14000000-0000-4000-8000-000000000108', 'Kitchenette', 'comfort', 'cooking-pot'),
    ('14000000-0000-4000-8000-000000000109', 'Balcony', 'comfort', 'building-2'),
    ('14000000-0000-4000-8000-000000000110', '24/7 Security Guard', 'security', 'shield-check'),
    ('14000000-0000-4000-8000-000000000111', 'CCTV', 'security', 'cctv'),
    ('14000000-0000-4000-8000-000000000112', 'Gated Community', 'security', 'fence'),
    ('14000000-0000-4000-8000-000000000113', 'Swimming Pool', 'security', 'waves'),
    ('14000000-0000-4000-8000-000000000114', 'Fitness Gym', 'security', 'dumbbell'),
    ('14000000-0000-4000-8000-000000000115', 'Motorcycle Parking', 'security', 'bike'),
    ('14000000-0000-4000-8000-000000000116', 'Car Parking', 'security', 'car-front'),
    ('14000000-0000-4000-8000-000000000117', 'Pet Friendly', 'policy', 'paw-print'),
    ('14000000-0000-4000-8000-000000000118', 'Visitors Allowed', 'policy', 'users'),
    ('14000000-0000-4000-8000-000000000119', 'Cooking Allowed', 'policy', 'chef-hat')
ON CONFLICT (name) DO UPDATE
SET category = EXCLUDED.category,
    icon_name = EXCLUDED.icon_name;

COMMIT;
