# AbangCebu security audit and cleanup

Evidence timestamp: 2026-10-25 UTC. Scope: local checkout at HEAD a82d754 with inherited dirty UI and untracked database changes. This is a bounded source audit, not penetration testing or production security sign-off.

## Delivered cleanup

Removed one confirmed orphan bundle:
- src/components/features/FinderQuickFilters.tsx (237 lines)
- src/components/features/FinderQuickFilters.module.css (322 lines)
- src/components/features/FinderQuickFilters.test.tsx (44 lines)

Total: 603 lines. Full files were inspected. Searches for component name, props, directory imports and consumers found only the legacy test referencing this component. Active callers use the distinct src/features/map/FinderQuickFilters.tsx; that module is unchanged by this task. The removed two tests tested only the orphan. Private original copies and SHA-256 manifest are at /home/hrmr/.hermes/cache/scratch/security-cleanup-20261025.

Not removed: src/styles/finder files (all imported by globals.css); cn bridge and shared utility (live consumers); exported generic types (API compatibility uncertain). One warning in the foreign-owned active quick-filter file is not permission to delete its code during concurrent work.

## Security findings and disposition

### S1 — Broad legacy profile SELECT policy: high conditional privacy risk

supabase/migrations/20260929000001_users_and_profiles.sql:231-235 creates a SELECT policy USING (TRUE), without a column projection. Profile columns include phone/contact information. Actual exposure depends on effective grants and deployed policy state. The inherited untracked correction migration may remove it; deployment was not verified. Do not claim a confirmed hosted data leak.

Next: read-only effective-grants/policy verification in an explicitly authorized non-customer test environment, then approve a self-only policy/public-field view change if still applicable. Do not run rollback scripts blindly.

### S2 — Conflicting bootstrap and migration histories: high operational risk

supabase/migrations/20261023000000_finder_schema.sql:1-2 explicitly says standalone only, not with legacy migrations. Lines 18 and 22 recreate user_role/profiles already defined in the legacy history. Standard sequential replay is not demonstrated safe. No disposable database replay occurred.

Next: approve one authoritative migration strategy; test fresh replay and existing-state upgrade separately. Do not delete historical migrations as dead code or run a live reset.

### S3 — Registration callback trusts request origin: medium conditional risk

src/app/api/auth/register/route.ts:44-50 builds emailRedirectTo from request.url. Reset requests already use NEXT_PUBLIC_SITE_URL. Exploitation additionally depends on ingress Host handling and Supabase redirect allowlist. These were not checked.

Next: approve canonical-origin signup configuration/fail-closed semantics, then add hostile-Host and invalid-configuration tests before minimal fix.

### S4 — Process-local reset throttling: medium deployment-dependent risk

src/app/api/auth/reset-password/request/route.ts:12-17,36-48 uses module Maps and cf-connecting-ip. This is not a shared cap across instances; direct-origin header trust needs deployment verification. Registration uses production Turnstile, but no visible shared request throttle.

Next: establish trusted ingress and deployment topology before selecting an existing shared limiter. No new external store or weakened fallback was introduced.

### S5 — Unsafe compensating rollback: medium conditional risk

The inherited untracked supabase/rollbacks/20261024220000_correct_profile_provisioning.sql restores broad profile SELECT and legacy provisioning. Running it may restore privacy/signup defects. Not executed or changed; ownership of inherited DB work is not assumed.

### S6 — Request-size guard: low conditional availability risk

Registration/reset routes parse JSON before application byte limits. Hosting limits are unknown. Define transport limits before adding a shared bounded-body parser; Content-Length-only checks would not cover chunked requests.

## Dependency advisory triage

`pnpm audit --json` exited 1: 17 package advisory records (4 critical, 4 high, 8 moderate, 1 low). These are not 17 independently demonstrated exploitable application bugs. The Vitest/mocker advisory appears under two package records.

Full output: /home/hrmr/.hermes/cache/terminal-output/out-1792941334-4535-c30.log.

Priority review:
- Next 16.3.6: audit recommends >=16.4.1 for latest critical/high advisories. Image optimization advisory GHSA-2464-fhr4-w9xw also names sharp >=0.35.5 as a workaround; installed sharp/deployed libc and endpoint reachability still need verification.
- tinypool 1.1.1 via Vitest: critical prototype-pollution gadget, patched >=2.1.2 per combined advisories. Requires upstream prototype pollution, not proven in this app.
- Vitest/mocker 3.2.7: dev-server mock handling issues; audit recommends >=4.1.12. Current Vitest config runs Node tests; no mockerPlugin/interceptorPlugin references found in src.
- source-map-js 1.2.1 via Tailwind build tooling: high source-map resource exhaustion; fixed >=1.2.2. Untrusted source-map reachability not demonstrated.
- zod 4.6.5 via eslint-config-next: high oversized-validation memory use; fixed >=4.6.6. Runtime reachability not demonstrated.

No `use cache`, `use server`, or remotePatterns match was found under src; next.config.ts is empty. This reduces specific configured advisory paths but is not assurance against other package vulnerabilities. package.json and pnpm-lock.yaml already contain inherited edits; no upgrade, override or installation was attempted. Remediation requires coordinated dependency ownership, reviewed version compatibility and full gates.

## Verification

- Before removal: pnpm test — PASS, 40 files / 284 tests.
- After removal: pnpm test — PASS, 39 files / 282 tests; count reduction is the orphan's two tests.
- pnpm lint — exit 0, zero errors, one warning: src/features/map/FinderQuickFilters.tsx:38 QuickPopover unused. Foreign-owned active file, unchanged here.
- pnpm exec tsc --noEmit --incremental false — exit 0.
- pnpm audit --json — FAIL, advisory counts above.
- Build/browser checks — NOT RUN to avoid shared build/server interference; local unit/static checks do not prove browser rendering.
- Hosted RLS, auth delivery, proxy configuration, migration replay, live CAPTCHA and penetration testing — NOT RUN.
- Independent deletion QA — static PASS: no consumers of removed paths, active replacement and consumers remain. Reviewer did not execute tests/typecheck; parent evidence above remains separate. Reviewer incorrectly interpreted coordination claim UUID 48592c5f-bc42-4ef1-84b5-374236e64f77 as a Git SHA; it is a SQLite ownership handle, never a commit. Git status independently confirms exactly three uncommitted deletions.

Concurrent UI source changed between initial discovery and validation. These runs describe the observed working tree, not an immutable production artifact or CI result. No application behavior changed in this cleanup.

## Review provenance

Security review report e76db800-31e3-42a9-91db-6f0014e51726: read-only, publication not confirmed. QA candidate review a1be6394-89e7-4ae7-a29a-a75bc7b41930: read-only; child claimed published, parent has not verified dashboard persistence. No publication success inferred.

## Release recommendation

Do not treat this audit as release approval. Resolve dependency reachability/remediation and verify effective database privacy controls before production sign-off. Cleanup is deliberately restricted to the single proven orphan bundle. No commit, push, deployment, migration or external ticket change performed.
