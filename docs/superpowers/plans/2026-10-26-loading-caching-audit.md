# AbangCebu Loading and Caching Audit Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans after user approval. Planning only; no application development is authorized by this document.

**Goal:** Identify measured loading bottlenecks and safe opportunities to reduce API/database work without hiding failures, serving misleading availability, or leaking account-dependent data.

**Architecture:** Audit existing Next.js/React/Supabase flows before choosing cache technology. Separate initial placeholders, background refresh, client reuse, shared caching and database efficiency. Prefer the smallest demonstrated remedy with existing tools.

**Tech Stack:** Next.js 16.3.6, React 19, Supabase, MapLibre, existing Vitest and Playwright.

**Spec:** User requests a professional orchestrated plan, efficient team use, grounded evidence, and a summary for approval before development. Scope includes listings, map, place search, image loading, loading-state coverage, background refresh and caching/API load.

## Status and approval gates

Planning complete, awaiting user approval for the runtime audit. QA and Security source-only reviews returned; the parent independently checked the server places cache, places route and cookie-backed Supabase client. Neither reviewer ran tests or measured performance. QA's unrelated theme/auth/filter proposals are excluded. Its 600 ms debounce attribution to use-place-lookup is not accepted: debounce belongs to the MapSearch caller. Manual retry is not itself a defect, and an indefinitely hung request is a scenario to evaluate, not an approved requirement. Both assignments exceeded their requested tool-call budgets; do not repeat broad reviewer passes. Execution will use exact surface scopes and evidence questions.

Gate A: user reviews plan summary and authorizes the read-only runtime audit.
Gate B: audit produces findings and a precise development slice; user approves implementation scope.
Gate C: implemented slice passes independent QA/security as warranted before delivery. Deployment, hosted configuration, DB mutations and load testing need separate authorization.

No runtime performance results or performance improvement promises exist yet.

## Verified baseline

- Checkout: /home/hrmr/abang-cebu-ai; inspected HEAD c35837cda3b0a9d1acc3126653cd184b8bf3e26a on fix/theme-refresh-flash. Working tree has extensive inherited changes; record exact diff fingerprint before execution. A commit SHA alone does not identify this dirty runtime tree.
- src/app/api/rentals/route.ts:7–15 explicitly sets no-store and reads published, available listings ordered by id with limit 200. No pagination cursor is visible in that handler. This is source behavior, not a measured bottleneck.
- src/lib/search/use-place-lookup.ts:17,35–55 has per-hook-instance memory caching, normalized query keys, 60-second expiry and a maximum of 20 entries. It aborts earlier requests; this does not prove cross-component request deduplication.
- src/server/places/search-places.ts:4–40 already caches up to 100 normalized queries for one hour per process, rejects uncached calls within a process-wide one-second interval, and sets an eight-second upstream timeout. API no-store does not mean this internal provider cache is absent. Multiple instances do not share this memory; actual provider load and concurrent-miss behavior still need measurement.
- src/lib/supabase/server.ts:8–29 reads session cookies. Shared rentals-cache eligibility is unverified, not an established privacy defect; route filters and deployed RLS must be evaluated together.
- Listings skeleton width was fixed locally in preceding work; exclude that correction from new accomplishments and verify current rendered behavior.
- No live database/query-plan access or service quotas have been verified for this audit. Do not infer an absent table from failed REST discovery.

## Global constraints

- Source inspection and bounded local browser measurements only after approval. No application edits, new dependencies, hosted configuration changes, production traffic generation, real-user record inspection, Jira changes or deployments.
- Use synthetic fixtures for deterministic latency/failure checks. Label fixture results separately from real data/provider measurements; empty fixture maps do not prove tile rendering performance.
- Preserve dirty work and existing listeners. Verify server PID/cwd/origin/build and current source fingerprint before tests; do not restart another session's server or assume old preview evidence is current.
- No private data, credentials, cookies, authorization headers or raw account responses in logs, screenshots or reports. Sanitize network artifacts and avoid retaining HAR bodies by default.
- A shared cache is prohibited until response equivalence across anonymous/authenticated users and effective RLS/permissions are established. Cache keys alone cannot repair an unauthorized source query.
- No chosen cache TTL, library, database index or pagination design until freshness, query shape and measurements justify it.

## Owners and efficiency

Parent/orchestrator owns scope, source-grounded findings, server provenance, evidence collection and the final report. Only the parent writes the plan/report.
QA owns state/interaction coverage and bounded browser verification proposals; no application writes.
Security owns cache isolation, session transitions, freshness/invalidation and privacy review; read-only.
A developer is assigned only after Gate B. No idle implementer, repeated reviewers or nested delegation. Maximum two reviewers concurrently, with disjoint questions and a bounded tool budget.

## Task 1: Establish an auditable baseline

- [ ] Re-read instructions, git status/diff, worktrees, coordination claims and relevant ownership. Acquire only exact audit/report scopes; stop on overlaps.
- [ ] Record source HEAD plus dirty diff/content hashes, dependency versions, browser version, viewport, origin, server mode/build and fixture configuration.
- [ ] Trace page to fetch to route to Supabase/provider. Inventory loading/empty/error/retry states and every cache boundary from actual source and headers.
- [ ] Output a surface inventory with file:line anchors and observed/unverified classification. Missing code is not filled in from memory.

Deliverable: reproducible baseline and request/state inventory.

## Task 2: Measure user-visible loading and request cost

- [ ] Use desktop 1440x932 and mobile 430x932, light/dark where theme changes visibility. Start with Chromium; physical-device and cross-browser status remain explicit.
- [ ] Record cold initial visit, same-query repeat, reload and route return separately. Run at least three comparable samples per selected timing scenario; report raw values and median, not a statistically unsupported percentile.
- [ ] Measure document/JS readiness, listings request count/duration/status/transfer size, map readiness and image dimensions/layout shifts separately. Time-to-first-useful-content and time-to-listings are distinct measures.
- [ ] Exercise initial pending, ready nonempty, valid empty, timeout/offline/failure and retry using controlled responses. Measure skeleton bounds and overflow; ensure cards replace placeholders and controls remain reachable.
- [ ] Exercise rapid place typing, repeated normalized query, aborted/stale responses and concurrent consumers if present. Count requests at each boundary; browser request count does not equal provider/database query count.
- [ ] Check filter/map movement and background refresh: does it refetch, compute locally, retain old data, announce updating or show stale data without notice? Report actual behavior before prescribing it.
- [ ] If a live read-only endpoint/provider test is separately permitted and available, use low-volume sequential GETs with no private account data. Distinguish browser/API time from database time; query plans/index benefit remain BLOCKED without authorized DB evidence.

Deliverable: state matrix plus sanitized timing/request table with reproducible setup.

## Task 3: Cache and correctness decision

- [ ] Classify each response: public identical, user-dependent, security-sensitive or unknown. Trace session cookies and RLS before recommending server/CDN reuse.
- [ ] Compare existing per-instance memory cache, browser HTTP cache, server cache and CDN behavior. Inspect response Cache-Control/Vary and framework semantics; no header-only claim that origin load is reduced.
- [ ] For every proposed cache, state key inputs, ownership, maximum staleness, invalidation source, memory bound, concurrent request behavior, error handling and logout/user-change behavior.
- [ ] Test no error-to-empty conversion, no stale response replacing a newer search, no cross-user reuse, and availability/price refresh after invalidation using synthetic data. Do not create real users or modify live listings.
- [ ] Evaluate smaller projections, query limits/pagination and image sizing against observed payloads before adding cache layers. A limit of 200 with local filtering can create incomplete discovery; treat completeness as a correctness question, not merely a speed issue.
- [ ] Estimate potential request savings from observed repeat scenarios, with assumptions stated. Do not promise production savings from fixtures.

Deliverable: cache eligibility table and smallest recommended development slice, or evidence that no cache change is warranted.

## Task 4: Findings and development readiness

- [ ] Each finding includes requirement, source anchor, reproduction, expected/observed behavior, exact evidence path, confidence, user impact and smallest fix. Separate confirmed defect, measured bottleneck and hypothesis.
- [ ] Parent validates reviewers against source and executed artifacts. Deduplicate findings by root cause; no severity based solely on agent prose.
- [ ] Report gates as PASS, FAIL, BLOCKED, NOT RUN or NOT APPLICABLE. Existing green tests are baseline only, not proof of performance or future cache privacy.
- [ ] Produce ranked P0/P1/P2 recommendations and the implementation contract for the first coherent slice: exact owned paths, callers/fixtures, request/data contract, acceptance checks, rollback and exclusions.
- [ ] Stop for user approval before development. No automatic implementation, merge, push or deployment from this audit plan.

## Review Focus

- Anonymous versus signed-in responses must not be assumed identical.
- Listing availability/price changes require an explicit freshness/invalidation policy.
- Existing results should not be discarded merely to show a loading animation.
- Fixture timing cannot establish live Supabase or map-provider performance.
- No indexes/libraries/cache TTLs or background polling added without evidence.

## Definition of ready for development

The audit is approved and executed; baseline is reproducible; one slice has verified supporting evidence; freshness/privacy constraints are settled; exact file ownership is available; focused tests can demonstrate the defect and desired behavior; user approves the resulting scope. Currently ready for Gate A audit approval only, NOT READY for development: runtime evidence and approval of an implementation slice remain.

## Rollback

The audit changes no application behavior. Remove only its own report artifacts if requested. Future development must define scoped revert and cache invalidation/disable procedures without overwriting inherited work.
