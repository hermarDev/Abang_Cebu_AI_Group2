import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20261019000143_search_functions.sql", "utf8");

test("viewport RPC is invoker-safe, indexed, bounded, and approved-only", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.search_listings_in_viewport\(/);
  assert.match(migration, /LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = ''/);
  assert.match(migration, /ST_MakeEnvelope\(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326\)/);
  assert.match(migration, /p\.coordinates OPERATOR\(extensions\.&&\) v_envelope::extensions\.geography/);
  assert.match(migration, /p\.status = 'approved'/);
  assert.match(migration, /u\.is_available/);
  assert.match(migration, /LIMIT p_limit/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.search_listings_in_viewport[\s\S]*?FROM PUBLIC/);
});

test("landmark RPC uses PostGIS geography distance with validated radius", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.search_listings_near_landmark\(/);
  assert.match(migration, /ST_DWithin\(p\.coordinates,origin\.point,p_radius_meters\)/);
  assert.match(migration, /p_radius_meters <= 50000/);
  assert.match(migration, /p\.status = 'approved'/);
  assert.match(migration, /u\.is_available/);
});

test("both RPCs validate filters and bound result sizes", () => {
  assert.equal((migration.match(/Invalid rent range/g) ?? []).length, 2);
  assert.equal((migration.match(/p_limit < 1 OR p_limit > 500/g) ?? []).length, 2);
  assert.equal((migration.match(/NOT EXISTS \([\s\S]*?unnest\(p_amenities\)/g) ?? []).length, 2);
});
