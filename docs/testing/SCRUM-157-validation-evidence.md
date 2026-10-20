# SCRUM-157 Validation Evidence: Filter Pills, URL State Sync & Results Drawer

Date: 2026-10-20
Repository: `Abang_Cebu_AI_Group2`
Branch / Worktree: `feat/SCRUM-157-filters-rebased` / `.worktrees/scrum-157-filters-rebased`
PR head: `192e4ff1676d8459c1ad5d0ab330a3d3f1a9151e` (local working-tree changes are not yet committed or in this PR)
Jira Ticket: [SCRUM-157](https://abangcebuai.atlassian.net/browse/SCRUM-157)
Assignee: Hermar Centillas

---

## 1. Acceptance Criteria & Implementation Summary

- **Criteria 1 (Reloading the URL restores the same filters):** VERIFIED. URL search parameters (`?category=...&minPrice=...&maxPrice=...&amenities=...`) are parsed and serialized with deep comparison in `src/hooks/use-search-filters.ts` and `src/lib/search-filters.ts`. Tested via Vitest and Browser QA (desktop 1280x800 and mobile 430x932 iPhone 14 Pro emulation).
- **Criteria 2 (Hover or tap on a card highlights its pin):** UNIT TESTS PASS, but integrated/live listing behavior is NOT RUN. Event bridge tests exercise highlight behavior in isolation; live listings remain gated on SCRUM-143 PostGIS RPC client access.

---

## 2. Automated Test Suite Results

Command: `pnpm test`
Result: **PASS (20 tests across 5 test suites)**

The complete suite passed for search filters, landmark search, listing highlights, the filter panel (6 tests), and results drawer.


---

## 3. Build & Static Analysis Checks

| Check | Command | Result |
| --- | --- | --- |
| TypeScript Compiler | `npx tsc --noEmit` | PASS (0 errors) |
| Linter | `npm run lint` | PASS (0 errors; vendor maplibre warnings only) |
| Production Build | `npm run build` | PASS (compiled static & server components) |
| Git Diff Quality | `git diff --check` | PASS (clean diff, no whitespace errors) |
| Browser interaction smoke | Chromium via Playwright Core, `http://127.0.0.1:4181/` | PASS for modal open/close, Escape, focus wrapping/restoration and no horizontal overflow at 1280x800 and 430x932; page errors: 0 |

---

## 4. Worktree State & Jira Status

- **Status:** IN DEVELOPMENT.
- **Assignee:** Hermar Centillas (preserved).
- **Current local commit:** `04754a90d0b409191b437813811ebce21bd7305d` on `feat/SCRUM-157-filters-rebased`; not yet pushed or included in PR #9.
- **Current PR:** #9 remote head `192e4ff1676d8459c1ad5d0ab330a3d3f1a9151e`.
- **Remaining acceptance gap:** live search/results and integrated card-to-pin behavior remain blocked on the SCRUM-142/143 RLS/RPC contract. PR #9 has no formal review; its `ci` and `secret-scan` checks passed, while Supabase Preview is skipped. These PR checks do not cover the local commit.
