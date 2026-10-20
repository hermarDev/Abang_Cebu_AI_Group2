# SCRUM-143 Verification Evidence

Date: 2026-10-20 (local verification; command output was observed in this session, not saved as a committed execution artifact)
Repository: `Abang_Cebu_AI_Group2`
Branch / Worktree: `feat/SCRUM-143-search-db` (`.worktrees/scrum-143-search-db`)
The original search implementation was validated at code head `0fd9f0b53537b4d9ae7f5edeade97d5257b97627`; focused pending-listing regression tests were added in `f43af235a84b46dadf8dd5a60ea648ab175dbb4f`, with evidence and branch-scope wording refined in subsequent commits.
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
| Database pgTAP Suite | `supabase test db --local supabase/tests/search_functions_test.sql` after `supabase db reset --local` | **PASS — 23 pgTAP assertions**, including explicit matching pending-property exclusion for both viewport and landmark RPCs; SQL fixtures roll back. The migration reset and 23-test suite completed locally in the isolated SCRUM-143 Supabase project. |
| Static Analysis Validator | `node --test scripts/validate_scrum143.mjs` | **PASS — 3 static checks** (invoker safety, PostGIS distance indexing, boundary/filter checks) |
| Syntax Checks | `node --check scripts/benchmark_scrum143.mjs && node --check scripts/validate_scrum143.mjs` | **PASS** |
| Performance Benchmark (10,000 synthetic properties and units) | `node scripts/benchmark_scrum143.mjs` | **PASS — 500 rows returned in 57.066 ms** (41,032 shared buffer hits, target <200 ms). The script inserted the synthetic fixtures inside a transaction and explicitly rolled the transaction back; no fixture rows were retained. This run is recorded from local command output, not as a committed CI artifact. |
| Diff Syntax Check | `git diff --check` | **PASS (clean diff)** |
| Anonymous PostgREST RPC Access | Direct request as `anon` against the local Supabase REST API | **BLOCKED / FAIL — HTTP 401, SQLSTATE `42501`, `permission denied for table properties`. RPC EXECUTE is granted, but listing RLS policies are absent in the current schema (properties policies=0; rental_units policies=0). SCRUM-142 integration is required before client search works. |
| Fresh combined SCRUM-140/141 schema reset | `supabase db reset --local` in the SCRUM-140/141 worktree | **BLOCKED — confirmed migration-order failure:** `20260929000001_users_and_profiles.sql` calls `get_current_user_role()` before `public.profiles` exists (`SQLSTATE 42P01`). The SCRUM-143 branch also contains a tracked reorder of the profile-dependent helpers and overlapping tracked listings/engagement migrations; the listings file matches PR #7, but the engagement file differs by three deleted lines including the audit-log TRUNCATE revoke. These changes require independent review/reconciliation before merge. The SCRUM-140/141 owner's worktree was not edited. |
| Production / Remote DB Check | N/A | NOT RUN — explicitly out of scope |

---

## 3. Verified Architecture & Access Design

1. **TC-RBAC-026 Compliance:** The SCRUM-143 pgTAP suite asserts that suspended landlords' approved properties are excluded from both searches. Added explicit negative assertions verify that the matching `pending` fixture is excluded from both viewport and landmark search. The test suite passed 23/23 after a fresh local migration reset.
2. **Performance SLA (<200 ms):** The local benchmark seeded 10,000 synthetic properties and 10,000 units, returned the capped 500 rows in **57.066 ms** (41,032 shared buffer hits), and explicitly rolled back its fixture transaction.
3. **Security Boundary:** RPCs remain `SECURITY INVOKER`; tests establish the function definitions and EXECUTE ACL. A direct anon REST request currently fails with SQLSTATE `42501` because the current schema has no RLS policies on `properties` or `rental_units`. Do not treat the functions as client-usable until SCRUM-142 policies and integrated role tests are complete.
4. **Schema prerequisite:** A clean `supabase db reset --local` in the SCRUM-140/141 worktree failed at the historical users/profiles migration: `get_current_user_role()` references `public.profiles` before that table exists (`SQLSTATE 42P01`). The SCRUM-143 branch also contains a tracked reorder of both profile-dependent helpers and overlapping tracked SCRUM-140/141 listings/engagement migrations. The listings file matches PR #7, but the engagement file differs by three deleted lines including an audit-log TRUNCATE revoke. This branch divergence requires review/reconciliation before merge; the SCRUM-140/141 owner's worktree remains unchanged.
