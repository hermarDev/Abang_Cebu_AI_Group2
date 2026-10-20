# SCRUM-143 Verification Evidence

Date: 2026-10-20 (local verification; command output was observed in this session, not saved as a committed execution artifact)
Repository: `Abang_Cebu_AI_Group2`
Branch / Worktree: `feat/SCRUM-143-search-db` (`.worktrees/scrum-143-search-db`)
The search implementation and current regression coverage were revalidated locally at PR head `3e30dfe555fdd7779b69612a047f31ac2d6d2c9b` (local worktree HEAD matched `origin/feat/SCRUM-143-search-db` at test time). This report records the exact-head checks below; execution output was observed in the session and is not committed as a separate raw log artifact.
Scope: Local-only verification of viewport and landmark search RPCs. No production database or remote deployment was used.

---

## 1. Implemented Behavior Inspected

- `supabase/migrations/20261019000143_search_functions.sql` defines viewport and landmark RPCs as `SECURITY INVOKER` with an empty `search_path` and grants execution to `anon` and `authenticated`.
- Both queries explicitly filter `properties.status = 'approved'`, `host.is_suspended = FALSE` (joining `public.profiles` per TC-RBAC-026), and `rental_units.is_available`.
- Both queries use a materialized `candidate_properties` CTE that applies spatial bounds, landlord suspension, property-type, and amenity predicates; amenity checks run inside that CTE through correlated subqueries over `property_amenities` and `amenities`, before the later join to units. The local benchmark met the latency target, but no inner query plan was captured, so this evidence does not establish that catastrophic nested loops are prevented.
- Result limits and input ranges are strictly validated (WGS84 lat/lng ranges, rent bounds >= 0, limit between 1 and 500, radius <= 50 km).
- `supabase/migrations/20261019000140_listings.sql` enables RLS on listing tables, but this branch does not define client-role SELECT policies for those tables. Client RPC access remains blocked pending the SCRUM-142 policy/access work; local anon and authenticated calls below currently fail with SQLSTATE `42501`. Do not describe this as a completed or dedicated RLS migration.

---

## 2. Checks Run & Verified Results

| Check | Command | Result |
| --- | --- | --- |
| Database pgTAP suite | `supabase test db --local supabase/tests/search_functions_test.sql` | **PASS — 23/23 assertions** at PR head `3e30dfe555fdd7779b69612a047f31ac2d6d2c9b`. |
| Static validator | `node --test scripts/validate_scrum143.mjs` | **PASS — 3/3 tests** at PR head `3e30dfe555fdd7779b69612a047f31ac2d6d2c9b`; checks currently assert PUBLIC non-execution only for the viewport function and do not independently verify the anon/authenticated grants or landmark ACL. |
| Syntax and diff checks | `node --check scripts/benchmark_scrum143.mjs && node --check scripts/validate_scrum143.mjs`; `git diff --check` | **PASS** |
| Benchmark (10,000 synthetic properties and units) | `node scripts/benchmark_scrum143.mjs` | **PASS — 500 rows in 55.934 ms** (41,042 shared buffer hits; target <200 ms). Exact-head run; benchmark transaction rolled back. |
| Anonymous PostgREST access | Local SQL role probes (`SET LOCAL ROLE`) plus anon PostgREST POST to both RPCs | **BLOCKED — anon PostgREST: viewport HTTP 401 / `42501 permission denied for table properties`; landmark HTTP 401 / `42501 permission denied for table rental_units`.** |
| Authenticated role access | `SET LOCAL ROLE authenticated` then call viewport RPC | **BLOCKED — `SET LOCAL ROLE authenticated` viewport call fails SQLSTATE `42501`, permission denied for `properties`.** |
| Local database state | Existing isolated local SCRUM-143 stack inspected; no start/reset was performed in this verification | **PASS** — target stack was already healthy; no other project stack was changed. |
| Production / remote DB | N/A | NOT RUN; out of scope. |

---

## 3. Verified Architecture & Access Design

1. **TC-RBAC-026 Compliance:** The pgTAP suite asserts suspended landlords' approved properties are excluded from both searches, and added negative assertions verify that a matching pending-property fixture is excluded from both viewport and landmark results. The focused suite passed 23/23 at exact PR head `3e30dfe555fdd7779b69612a047f31ac2d6d2c9b`; the separate audit-log privilege suite passed 2/2 on the same head.
2. **Performance SLA (<200 ms):** The local benchmark seeded 10,000 synthetic properties and 10,000 units, returned the capped 500 rows in **55.934 ms** (41,042 shared buffer hits), and explicitly rolled back its fixture transaction.
3. **Security Boundary:** RPCs remain `SECURITY INVOKER`; pgTAP confirms both functions' invoker setting, while the static validator's PUBLIC non-execution assertion currently covers only the viewport function. Neither suite independently asserts the anon/authenticated EXECUTE grants or landmark PUBLIC ACL; the migration defines grants for both roles on both RPCs. Local `SET LOCAL ROLE anon` calls fail with SQLSTATE `42501` (`properties` for viewport, `rental_units` for landmark); a `SET LOCAL ROLE authenticated` SQL invocation also fails with `42501` on `properties`. Do not treat the RPCs as client-usable until SCRUM-142 policy/access work and role-based tests pass.
4. **Schema prerequisite:** An earlier local reset attempt was reported to fail at the users/profiles migration because `get_current_user_role()` referenced `public.profiles` before that table existed (`SQLSTATE 42P01`), but its raw command output was not retained for independent verification. A later fresh reset in a disposable isolated worktree at SCRUM-140 candidate `4b0eeb172da0c8d94e954c848169472da0335f67` passed, and `supabase/tests/schema_migrations_test.sql` passed 34/34; this validates that candidate, not its integration into PR #7. The SCRUM-143 branch contains a tracked reorder of both profile-dependent helpers and overlapping tracked SCRUM-140/141 listings/engagement migrations. The listings migration is byte-identical to PR #7. The engagement migration was restored to PR #7's byte-identical version, including `REVOKE TRUNCATE ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated`; a focused two-assertion pgTAP regression verifies anon/authenticated cannot TRUNCATE audit logs. The combined PR heads still require independent review before merge. The SCRUM-140/141 candidate worktree was clean at the latest inspection; this does not establish that the owner has no concurrent activity.
