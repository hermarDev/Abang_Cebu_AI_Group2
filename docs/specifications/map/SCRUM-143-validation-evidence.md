# SCRUM-143 Verification Evidence

Date: 2026-10-19
Repository: `Abang_Cebu_AI_Group2`
Branch / Worktree: `feat/SCRUM-143-search-db` (`.worktrees/scrum-143-search-db`)
Scope: Local-only verification of viewport and landmark search RPCs. No production database or remote deployment was used.

---

## 1. Implemented Behavior Inspected

- `supabase/migrations/20261019000143_search_functions.sql` defines viewport and landmark RPCs as `SECURITY INVOKER` with an empty `search_path` and grants execution to `anon` and `authenticated`.
- Both queries explicitly filter `properties.status = 'approved'`, `host.is_suspended = FALSE` (joining `public.profiles` per TC-RBAC-026), and `rental_units.is_available`.
- Both queries employ a candidate-first materialized CTE that filters spatial bounds, landlord suspension status, and property types before joining units or amenities, preventing catastrophic nested loops.
- Result limits and input ranges are strictly validated (WGS84 lat/lng ranges, rent bounds >= 0, limit between 1 and 500, radius <= 50 km).
- `supabase/migrations/20261019000140_listings.sql` enables RLS on listing tables. Client-role policies are defined in the dedicated RLS migration (SCRUM-142, assigned to Michelle Estoy).

---

## 2. Checks Run & Verified Results

| Check | Command | Result |
| --- | --- | --- |
| Database pgTAP Suite | `supabase test db --local` | **PASS — 21 pgTAP assertions** (includes TC-RBAC-026 verification for suspended landlord exclusion across viewport & landmark search) |
| Static Analysis Validator | `node --test scripts/validate_scrum143.mjs` | **PASS — 3 static checks** (invoker safety, PostGIS distance indexing, boundary/filter checks) |
| Syntax Checks | `node --check scripts/benchmark_scrum143.mjs && node --check scripts/validate_scrum143.mjs` | **PASS** |
| Performance Benchmark (10,000 synthetic listings) | `node scripts/benchmark_scrum143.mjs` | **PASS — 500 rows returned in 54.566 ms** (41,290 shared buffer hits, target <200 ms). Fixtures cleanly rolled back (0 rows remain). |
| Diff Syntax Check | `git diff --check` | **PASS (clean diff)** |
| Anonymous PostgREST RPC Access | Direct PostgREST curl | BLOCKED pending SCRUM-142 RLS policies landing on base tables (SQLSTATE `42501`) |
| Production / Remote DB Check | N/A | NOT RUN — explicitly out of scope |

---

## 3. Verified Architecture & Access Design

1. **TC-RBAC-026 Compliance:** The RPCs now join `public.profiles AS host ON host.id = p.landlord_id` and require `host.is_suspended = FALSE`. Both viewport and landmark pgTAP tests assert that suspended landlords' approved properties are completely excluded from search results.
2. **Performance SLA (<200 ms):** With 10,000 synthetic properties and units, default PostgreSQL planner returns 500 rows in **54.566 ms**, well below the 200 ms latency requirement.
3. **Security Boundary:** The RPCs remain `SECURITY INVOKER` as designed in `docs/security/rls-policies.md`. Client access (`anon` and `authenticated`) will execute seamlessly once SCRUM-142's public SELECT policies on approved listings and units are merged.
