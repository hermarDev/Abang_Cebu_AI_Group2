# SCRUM-157 Validation Evidence: Filter Pills, URL State Sync & Results Drawer

Date: 2026-10-19
Repository: `Abang_Cebu_AI_Group2`
Branch / Worktree: `feat/SCRUM-157-filters`
Jira Ticket: [SCRUM-157](https://abangcebuai.atlassian.net/browse/SCRUM-157)
Assignee: Hermar Centillas

---

## 1. Acceptance Criteria & Implementation Summary

- **Criteria 1 (Reloading the URL restores the same filters):** VERIFIED. URL search parameters (`?category=...&minPrice=...&maxPrice=...&amenities=...`) are parsed and serialized with deep comparison in `src/hooks/use-search-filters.ts` and `src/lib/search-filters.ts`. Tested via Vitest and Browser QA (desktop 1280x800 and mobile 430x932 iPhone 14 Pro emulation).
- **Criteria 2 (Hover or tap on a card highlights its pin):** VERIFIED IN UNIT/MOCK TESTS. Implemented via `publishListingHighlight` and `subscribeToListingHighlights` event bridge in `src/components/map/listing-highlight.ts` and `src/components/map/ResultsDrawer.tsx`. Tested across hover, touchstart, pointer-leave, and keyboard Escape dismissal. (Live end-to-end listing data remains gated on SCRUM-143 PostGIS RPC client access).

---

## 2. Automated Test Suite Results

Command: `npx vitest run`
Result: **PASS (14 passed across 4 test suites)**

```
 ✓ src/lib/search-filters.test.ts (4 tests)
 ✓ src/lib/search/landmark-search.test.ts (4 tests)
 ✓ src/components/map/listing-highlight.test.ts (3 tests)
 ✓ src/components/map/ResultsDrawer.test.tsx (3 tests)
   ✓ highlights the hovered card, clears it after pointer exit, and pins on tap
   ✓ highlights a listing on touch start and clears it with Escape
   ✓ updates the result list when filter props change

 Test Files  4 passed (4)
      Tests  14 passed (14)
```

---

## 3. Build & Static Analysis Checks

| Check | Command | Result |
| --- | --- | --- |
| TypeScript Compiler | `npx tsc --noEmit` | PASS (0 errors) |
| Linter | `npm run lint` | PASS (0 errors; vendor maplibre warnings only) |
| Production Build | `npm run build` | PASS (compiled static & server components) |
| Git Diff Quality | `git diff --check` | PASS (clean diff, no whitespace/syntax errors) |

---

## 4. Worktree State & Jira Status

- **Status:** IN REVIEW.
- **Assignee:** Hermar Centillas (preserved).
- **Caveat:** Unit/component tests prove all filter synchronization and card-to-pin highlight event behaviors. Live end-to-end map marker updates remain gated on the backend RPC access contract (SCRUM-143).
