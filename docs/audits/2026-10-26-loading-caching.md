# Loading and caching audit — partial evidence report

Timestamp: 2026-10-26, Asia/Manila. Status: PARTIAL; independent methodology review received and assessed. The reviewer confirmed the narrow fixture-backed state observations. Reviewer interpretations about cache hits, deduplication, bundle splitting and subtracting latency are not accepted without further evidence. Development is not authorized by this audit.

## Provenance and limitations

Existing local Next development server localhost:3000, PID 15995, cwd /home/hrmr/abang-cebu-ai. Historical HEAD c35837c is not a clean or immutable representation of the served tree: inherited modifications remain. No production build was started, existing listener was not restarted. This audit adds only its harness, results and report.

Harness: .superpowers/loading-audit/audit.cjs. Evidence: .superpowers/loading-audit/results.json. Command: node .superpowers/loading-audit/audit.cjs, exit 0 after correcting harness sequencing. Initial failures were mobile harness failures: expanding before the response allowed sheet state changes; expanded sheet hides search. These were not classified as application defects.

430x932 and 1440x932 Chromium viewports, synthetic single-listing responses, deliberate 600 ms rentals delay. Browser requests to external origins blocked. Map style replaced with blank synthetic background; this does NOT establish real provider map rendering. Playwright routing disables HTTP cache, so resource transfer and reload figures do NOT measure normal browser-cache performance. This harness measures client behavior, not live API/database latency or saved upstream work.

## Observed behavior

- Six page navigations: two rentals requests per navigation in development, one very short and one completing around 607–631 ms. Abort-on-cleanup source is consistent with development Strict Mode replay, but production duplication is NOT established. Do not optimize this count as if it proves twice the database load.
- Category Rooms selection: zero additional rentals requests in the observation window, both widths.
- Synthetic window focus event: zero additional rentals requests within 800 ms. This is not full browser tab visibility/resume testing and does not establish a freshness defect.
- Mandaue then mandaue after clear: one places request total in each context. Normalized per-instance client reuse works for this short empty-response case.
- Empty rentals array: visible No rentals found, both widths.
- Invalid rentals payload: visible Couldn't load rentals equivalent heading, both widths.
- HTTP 503: error heading visible; Try again recovers to synthetic listing, both widths.
- Time from navigation to visible listing: mobile 1081, 945, 936 ms; desktop 1049, 954, 962 ms. These include forced delay, local development and harness UI interactions. They are NOT production latency benchmarks or a basis for cache TTL selection.

## Source-backed design constraints and audit candidates

1. Rentals API uses no-store, published/available filters, ID ordering and limit 200, with no pagination cursor or completeness metadata. Source: src/app/api/rentals/route.ts:6–19. More than 200 matching records can be omitted; actual inventory size and impact are unknown. Verify coverage and geographic/filter semantics before choosing pagination or bounds queries. Merely adding pagination after client filtering could preserve incorrect search coverage.
2. Rentals fetch starts in a client effect and has cleanup cancellation but no explicit timeout. Source: src/features/map/RestoredFinderShell.tsx:42–60. Persistent pending-request UX and refresh-state geometry remain NOT RUN. No arbitrary timeout policy selected.
3. Listings cards render No photos provided, not listing images. Source: src/features/listings/RentalCard.tsx:7–15. Listing-image lazy loading, image skeletons and resizing are not present performance targets on this card; other rendered branding/map assets are outside this image conclusion.
4. Places already has per-hook normalized cache, 20 entries/60 seconds, and server-process cache, 100 entries/one hour, with one-second global uncached-request interval and eight-second provider timeout. Source: src/lib/search/use-place-lookup.ts and src/server/places/search-places.ts. No need for another cache library demonstrated. Concurrent cold queries, concurrent identical misses, multiple processes and expired-entry behavior require controlled server-level tests.
5. Cookie-backed Supabase client means shared rentals-cache eligibility must be established against exact response fields and deployed RLS. Route filters alone do not prove either a leak or auth-equivalent output. No deployed-policy inspection occurred. Cached availability requires explicit expiry/invalidation requirements and revalidation before consequential use.

## Priorities and next evidence

P1 Evidence: production-equivalent, session-owned build with recorded source fingerprint; unmocked read-only API samples, payload size and database timings; concurrent places cache tests with mocked provider. These are prerequisites for measured performance recommendations, not permission to alter production.
P1 Correctness candidate: demonstrate inventory above the 200 cap and verify whether omitted records can invalidate client search results. Do not claim a live omission without inventory evidence.
P2 UX evidence: held-pending rentals, skeleton geometry, CLS, map initialization/provider failures, full focus/resume lifecycle, search failure/retry and background refresh. Existing source-only checks and historical tests do not replace this execution.
P2 Cache decision: define public/private keys, session isolation, freshness, invalidation and provider terms before shared caching. No TTL change recommended yet.

## Independent review disposition

Review deleg_e1e211e8 inspected harness and JSON only, with no independent execution. Accepted: fixture-backed empty/error/retry observations, repeated sequential query reuse, development full-navigation counts, and gaps in production/cache validation.

Corrections: sequential repeated queries test reuse, not concurrent-request deduplication. Zero-byte entries do not prove a 304 or cache hit, especially with routing disabling HTTP cache. Equal development script counts at two widths do not establish absence of code splitting. Subtracting the injected delay from end-to-end time does not isolate render cost; hydration, navigation, assertions and sheet interactions are also included. Synthetic focus observation does not demonstrate a working refresh. No production optimization recommendation follows from this review.

## Gate status

PASS: controlled empty/error/retry and normalized short-term client reuse at two widths. Extended pending and concurrency probes also executed; see continuation below.
NOT RUN: production performance, database plans/RLS, provider terms, real map provider rendering, full concurrency and session-boundary checks. Unmocked local API and synthetic CLS samples are recorded below, not production benchmarks.
NOT RUN: new full unit/lint/type/build/CI suites; application code unchanged by this audit.
Recommendation: the initial measurements alone did not justify performance implementation. The continuation below now identifies a bounded cache-coalescing candidate for approval. No commit, push, deployment or application changes performed.

## Continuation: prolonged loading and cache concurrency

Tracked diff SHA256 before and after this continuation: ef82013253a07a30b85a8fb64368a3806a9ee64167c3203fa030863f696b920d. HEAD remains c35837cda3b0a9d1acc3126653cd184b8bf3e26a. This fingerprint covers tracked changes, not untracked source. Existing dev listener PID/cwd reverified. No build/restart, production mutations or application edits.

### Executed checks

- node .superpowers/loading-audit/cache-probe.cjs: exit 0, repeated. Actual searchPlaces module transpiled with installed TypeScript and evaluated in isolated VM. Clock, upstream fetch and parser mocked, no provider calls. Same normalized query during first pending fetch rejects with Place search is rate limited. Different query also rejects within the interval. After advancing 1100 ms with first fetch unresolved, the same normalized query starts a second upstream fetch. Completed normalized repeat adds zero fetches; expiration adds one. Evidence: cache-results.json. This proves absence of in-flight sharing in this module, not deployed cross-instance behavior or traffic frequency.
- node .superpowers/loading-audit/pending-probe.cjs: exit 0 after harness corrections; final source rerun. Pending rentals held beyond 10 seconds. Three skeleton cards fill container at both widths: mobile container 391.625 px / parent 399.625 px, desktop 337.21875 / 345.21875. Skeletons remain pending; releasing empty response removes skeletons and renders empty state. Synthetic layout-shift sums 0.0467461 mobile, 0.00422774 desktop. Not field CLS or production scores. Evidence: pending-results.json.
- Initial failed map-style 503 probe opened a development overlay that intercepted pointer actions. Fallback text expectation did not match actual UI wording. No production map-failure defect established. Successful pending run uses synthetic blank style and keyboard sheet expansion; pointer usability and real provider rendering remain unverified. Do not count the removed map-style scenario as passed.
- Three sequential unmocked anonymous GETs to existing local /api/rentals: HTTP 200, 1385/242/243 ms total, 14-byte body, zero rentals, Cache-Control no-store. Output collected via bounded fetch calls with 15-second abort. No records printed. These are local route samples including database/network/dev effects, not isolated DB query timings. Empty inventory cannot validate 200-cap impact or realistic payload/render load.
- git diff --check: exit 0. No full application suite/build required or run for these evidence-only additions.

### Recommended first implementation slice, not yet authorized

P1: Coalesce concurrent identical normalized place searches within the existing process. Reuse a pending operation before applying the distinct-query provider throttle. Keep the current completed-result cache, provider timeout, size bound, normalization and error propagation. Clear pending state after success or failure; do not store failures as empty successes. No new dependency, cache library, TTL increase, database migration or shared rentals cache.

Acceptance: overlapping same-key callers produce one upstream call and receive equal results; same key remains shared after 1 second while pending; distinct-key throttling unchanged; upstream rejection reaches all waiters; failed pending state is cleared and later retry succeeds; completed cache and expiry still work. Use actual module Vitest tests rather than retaining a parser-mocked probe as sole regression coverage. Review process-local limits explicitly; this will not coordinate multiple server instances.

P2: Bound rentals pending time and expose a recoverable error/retry state. Source has no explicit timeout and observed skeleton persists beyond 10 seconds. This is a resilience improvement, not a measured speed gain; choose deadline against deployment limits and latency requirements before implementation.

P3: Inventory completeness above the 200 cap. Demonstrate with a seeded fixture before changing server/client search semantics. Current anonymous endpoint returns zero records, so no live truncation claimed.

Decision: sufficient evidence to propose P1 independently of the unfinished production performance baseline. Do not block this scoped reliability/API-work reduction candidate on unrelated live RLS work. Production speed claims, rental caching, and wider architecture changes remain unsupported. Independent QA review of continuation requested; not yet received.
