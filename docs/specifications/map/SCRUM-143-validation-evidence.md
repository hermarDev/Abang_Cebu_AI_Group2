# SCRUM-143 Verification Evidence

Date: 2026-10-20 (local verification; command output was observed in this session, not saved as a committed execution artifact)
Repository: `Abang_Cebu_AI_Group2`
Branch / Worktree: `feat/SCRUM-143-search-db` (`.worktrees/scrum-143-search-db`)
The original search implementation was validated at code head `0fd9f0b53537b4d9ae7f5edeade97d5257b97627`; focused pending-listing regression tests were added in `f43af235a84b46dadf8dd5a60ea648ab175dbb4f`. The latest local validation was run after the evidence/scope corrections at PR head `2708949fd402d1c3b82e04d2a3090110305d3cb5`.
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
| Database pgTAP suite | `supabase test db --local supabase/tests/search_functions_test.sql` | **PASS — 23/23 assertions**. Current run: `37c6341258f574ccdca0e8bcf05e8fb66ba58175`; a later SCRUM-141 migration restoration is covered by `audit_log_security_test.sql` (2/2). |
| Static validator | `node --test scripts/validate_scrum143.mjs` | **PASS — 3/3 tests** |
| Syntax and diff checks | `node --check scripts/benchmark_scrum143.mjs && node --check scripts/validate_scrum143.mjs`; `git diff --check` | **PASS** |
| Benchmark (10,000 synthetic properties and units) | `node scripts/benchmark_scrum143.mjs` | **PASS — 500 rows in 64.547 ms** (41,029 shared buffer hits; target <200 ms). Final benchmark after the SCRUM-141 privilege-revoke restoration; fixture transaction rolled back. |
| Anonymous PostgREST access | Direct HTTP POST to viewport and landmark RPCs, using exact parameter names | **BLOCKED — viewport HTTP 401/`42501` permission denied for `properties`; landmark HTTP 401/`42501` permission denied for `rental_units`.** |
| Authenticated role access | `SET ROLE authenticated` then call viewport RPC | **BLOCKED — SQLSTATE `42501`, permission denied for `properties`.** |
| Local startup | `supabase start` on isolated SCRUM-143 project after checking no conflicting containers/listeners | **PASS** — branch migrations applied and health checks passed. |
| Production / remote DB | N/A | NOT RUN; out of scope. |

---

## 3. Verified Architecture & Access Design

1. **TC-RBAC-026 Compliance:** The pgTAP suite asserts suspended landlords' approved properties are excluded from both searches, and added negative assertions verify that a matching pending-property fixture is excluded from both viewport and landmark results. The focused suite passed 23/23 after fresh local startup; the separate audit-log privilege suite passed 2/2 after restoring the SCRUM-141 TRUNCATE revoke.
2. **Performance SLA (<200 ms):** The local benchmark seeded 10,000 synthetic properties and 10,000 units, returned the capped 500 rows in **64.547 ms** (41,029 shared buffer hits) after restoring the SCRUM-141 audit-log privilege revoke, and explicitly rolled back its fixture transaction.
3. **Security Boundary:** RPCs remain `SECURITY INVOKER`; pgTAP and static checks cover function definitions and EXECUTE ACL. Fresh local anonymous PostgREST calls fail with SQLSTATE `42501` (`properties` for viewport, `rental_units` for landmark); a `SET ROLE authenticated` SQL invocation also fails with `42501` on `properties`. Do not treat the RPCs as client-usable until SCRUM-142 policy/access work and role-based tests pass.
4. **Schema prerequisite:** A clean `supabase db reset --local` in the SCRUM-140/141 worktree failed at the historical users/profiles migration: `get_current_user_role()` references `public.profiles` before that table exists (`SQLSTATE 42P01`). The SCRUM-143 branch also contains a tracked reorder of both profile-dependent helpers and overlapping tracked SCRUM-140/141 listings/engagement migrations. The listings migration is byte-identical to PR #7. The engagement migration was restored to PR #7's byte-identical version, including `REVOKE TRUNCATE ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated`; a focused two-assertion pgTAP regression verifies anon/authenticated cannot TRUNCATE audit logs. The combined PR heads still require independent review before merge; the SCRUM-140/141 owner's worktree remains unchanged.
