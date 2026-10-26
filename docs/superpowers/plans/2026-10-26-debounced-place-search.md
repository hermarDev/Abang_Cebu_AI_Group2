# Debounced Place Search Implementation Plan

Goal: Show location suggestions 600 ms after typing pauses, without per-keystroke API calls.
Architecture: Existing MapSearch owns one cancellable trailing timer; existing usePlaceLookup owns abort/stale-response protection and a bounded per-mounted-instance cache. No dependencies or API/provider changes.

Scope: MapSearch, usePlaceLookup, tests/autocomplete.spec.ts. Preserve current query validation (3–120 trimmed characters), explicit selection behavior, keyboard navigation, IME, error/retry UI and Metro Cebu bounds. Parent sole writer; one read-only reviewer. Preserve inherited dirty work. No secrets, deployments, database changes or unscoped publishing.

Acceptance / execution order:
- [ ] Browser regression: continuous typing produces no request until a 600 ms pause, then exactly one for final text.
- [ ] Enter/Search cancels pending timer and submits immediately without a delayed duplicate.
- [ ] Clear/Escape/selection/unmount cancel timer; typing aborts prior lookup; obsolete results never replace current results.
- [ ] Composition does not trigger requests until committed; short queries never request.
- [ ] Successful normalized queries cached in memory for 60 seconds, maximum 20 per hook instance; failed requests never cached. No persistent query storage.
- [ ] Existing generic unavailable/retry UI remains honest when backend rejects a request. Do not automatically retry against Photon; keep server one-second guard unchanged. A debounce is not a global rate limiter.
- [ ] Run baseline failure, implement minimal slice, then focused browser tests + existing search tests + unit/type/lint/build. Parent checks final diff.
- [ ] Bounded independent review; verify findings before changing source; rerun affected checks after final edits.

Known limits: public Photon availability and multi-user quota unchanged; browser cancellation does not guarantee upstream cancellation. No server queue or distributed limiter in this increment. Rollback only this increment; preserve inherited UI changes.
