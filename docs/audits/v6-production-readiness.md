# V6 production-readiness checkpoint

2026-10-24 21:05 PHT / 13:05 UTC. Checkout: `/home/hrmr/abang-cebu-ai`, main, baseline HEAD `517915b`. Verdict: **NO-GO / V6 NOT COMPLETE**. Existing dirty work preserved; no deployment or remote Git operations.

## Delivered and retained

Earlier redesign work includes shared account modal, embedded login/register surfaces, inline validation and reset feedback, explicit renter/landlord intent, Turnstile fail-closed UI, desktop navigation/results behavior, mobile sheet states, development-only sample controls and map attribution styling. This checkpoint does not claim every earlier change received complete end-to-end acceptance.

Current-session integration repaired interrupted registration JSX, corrected stale embedded-form tests, unified recognized duplicate/new registration responses to generic HTTP 201 without account details, shortened radius labels, and fixed mobile assistant/control and expanded-sheet clearance. Expanded sheet is capped at `min(90dvh, calc(100dvh - 17rem))`, a deliberate deviation from nominal 90% expansion to preserve controls/credits.

Added minimal Playwright architecture: dedicated port 3218 Next development server with dummy local Supabase configuration, isolated guest contexts, mock inventory/place/map-style fixtures, external/mutation browser blocking, HTML/JUnit/failure artifacts and separate unit/E2E discovery. See `docs/testing.md`.

## Verification matrix

| Gate | Evidence | Status and limit |
| --- | --- | --- |
| Unit/route/component contracts | `pnpm run test`, 2026-10-24 21:05 PHT | PASS: 238 tests, 37 files |
| Browser/API regression | `pnpm run test:e2e`, last run 18 tests / 18.8 seconds | PASS: isolated Chromium development server |
| Earlier stability run | 10 tests repeated 3 times | PASS: 30 executions; predates added discovery/gesture tests |
| Static lint | `pnpm run lint`, after final gesture test edit | PASS |
| TypeScript | `pnpm exec tsc --noEmit --incremental false`, same final chain | PASS |
| Whitespace/diff | `git diff --check` | PASS |
| Production build | Earlier production builds succeeded for UI/auth changes | Historical PASS; NOT RERUN after testing configuration additions |
| Mobile controls | 320x700, 375x812, 430x932; peek/half/expanded | PASS: viewport bounds, native trial clicks, overflow, fixture credit visibility |
| Sheet accessibility | Home/End/arrows, values and bounds | PASS in Chromium |
| Pointer interaction | Real mouse pointer drag; injected cancellation after active pointer | PASS; not physical touch-device evidence |
| Desktop preservation | Results collapse/reopen + navigation close | PASS: same canvas node, radius preserved, menu focus restored; camera coordinates not asserted by automated suite |
| Inventory resilience | Mock 503, explicit retry, empty recovery | PASS; hosted inventory/data-present behavior not proven |
| Account shell | Guest mode switch, Escape dismissal, focus return | PASS; real login/signup/reset not executed |
| Fixture safety | Mock reads, blocked browser POST and cross-origin fetch | PASS; APIRequestContext/server fetches are not covered by browser interception |
| Live geography | Earlier same-build screenshot rendered Cebu/sea/labels; initial blank later recovered | PARTIAL: cold-load repeatability unresolved |
| Attribution | Fixture visibility plus historical actual geographic screenshots | PARTIAL: full live-source link hitability/style matrix unresolved |
| Auth provider/confirmation/rate limits | No real accounts used | NOT VERIFIED |
| Hosted RLS/KYC negative integration | Schema-only inspection | NOT RUN; metadata is not runtime authorization proof |
| Backup restore / isolated DB migration | No verified recovery or disposable DB tests | BLOCKED |
| Physical device / virtual keyboard | None | NOT RUN |
| Deployment/CI | Not requested or performed | NOT RUN |

## Database impact and release blockers

Verified target ref `oekihxgobdsxeqgotfsh`. Schema-only catalog reads and local CLI link only; no hosted DDL/DML, user-row reads, live signups or password resets.

1. Two enabled auth signup triggers insert identical profile primary keys. Catalog/function bodies indicate transaction failure. No real signup reproduction attempted.
2. Broad permissive profile SELECT policy defeats self-read policy; authenticated grants include phone_number. Anonymous exposure and auth.users email exposure were not established.
3. Hybrid Finder schema exists without corresponding migration-history entry. Blind bootstrap push or history repair is unsafe.
4. UPDATE-policy composition, suspended-account behavior, KYC storage-object privacy and broader effective permissions remain unverified.

Detailed proposal and rejected DEV SQL rationale: `docs/audits/v6-database-remediation.md`. **DB CHANGE NOT APPLIED**. High-risk trigger/security fixes remain proposals under V6 section 0B. Backup recoverability and isolated tests cannot be replaced by schema exports or generic user authority.

## Delegated work and disposition

Independent QA identified the stale account test; independent Security confirmed covered registration response parity after repair. QA-1 authored the mobile Playwright draft; parent removed conditional false passes and invalid runtime test.use calls, then executed it. QA-2 found the place-search server-egress gap; parent mocked it and added an isolation regression. DEV drafted DB remediation; parent rejected execution due catalog guard mismatch and lost optional metadata compatibility. No delegate's unsupported production-readiness claims were adopted.

## Evidence locations

- Latest browser report: `playwright-report/index.html`; JUnit: `test-results/junit.xml` (generated/ignored, overwritten by subsequent runs).
- Browser screenshots/matrix from earlier real preview: `/home/hrmr/.hermes/cache/browser-use/workspace/local-3115fd63c312509d4abab84174c04afd73ab86c64d6f1cd324ec7fdcbff85d4e/` (historical, not current-build proof).
- Schema-only metadata snapshot: `/home/hrmr/.hermes/cache/scratch/v6-db-security-metadata.json` (scratch, not durable backup).
- V6 PDF text extraction: `/home/hrmr/.hermes/cache/scratch/v6-audit.txt`; only partial extracted-text review completed in this continuation, not full visual PDF-page audit.

## Rollback and next gates

Preserve unrelated dirty changes. Do not use git reset/clean or wholesale checkout rollback. Revert only reviewed task-specific hunks if needed. No DB rollback required because no DB changes applied. Do not restore unsafe policies/triggers as an automatic rollback.

Next safe work: complete live-source attribution/cold-load checks against a provenance-verified production build; close data-present/filter/dialog/keyboard and visual acceptance gaps; arrange disposable baseline validation and independently recoverable backup before proposing hosted repair. Real accounts and production customer records remain excluded. No release recommendation can turn green until the confirmed DB blockers are resolved and remaining V6 criteria have direct evidence.
