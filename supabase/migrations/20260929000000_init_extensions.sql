-- ==============================================================================
-- AbangCebuAI Initial Database Migration: Core PostgreSQL Extensions
-- Migration: 20260929000000_init_extensions.sql
-- ==============================================================================

-- 1. PostGIS Extension
-- Essential for spatial indexing, location queries, and proximity search
-- (e.g. ST_DWithin for finding boarding houses/rentals near Cebu IT Park, Ayala, etc.)
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- 2. UUID Generation Extension
-- Generates standard RFC 4122 compliant UUID v4 identifiers for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- 3. Cryptographic Functions
-- Provides gen_random_uuid(), hashing, and cryptographic helpers
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 4. Trigram Matching Extension
-- Enables fast fuzzy text search across rental titles, barangays, and landmark descriptions
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
