# SCRUM-157 Validation Evidence: Filter Pills, URL State Sync & Results Drawer

Date: 2026-10-20
Repository: `Abang_Cebu_AI_Group2`
Branch / Worktree: `feat/SCRUM-157-filters-rebased` / `.worktrees/scrum-157-filters-rebased`
Local commit: `e3b89a0bfe7c93dd390ad4c9eb19ee94e655785e` (pushed to branch; PR #9)
Jira Ticket: [SCRUM-157](https://abangcebuai.atlassian.net/browse/SCRUM-157)
Assignee: Hermar Centillas

---

## 1. Acceptance Criteria & Implementation Summary

- **Criteria 1 (Reloading the URL restores the same filters):** VERIFIED by the previously recorded browser test on desktop (1280x800) and mobile (430x932), plus automated filter-state tests. URL parameters use `type`, `min_rent`, `max_rent`, `gender`, and `amenities`.
- **Criteria 2 (Hover or tap on a card highlights its pin):** COMPONENT TESTS PASS, but integrated/live listing behavior is NOT RUN. Event bridge tests exercise highlighting in isolation; live listings remain gated on SCRUM-142/143 service integration.

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

- **Status:** IN DEVELOPMENT (shortcut regression fix is awaiting review and dependent integration acceptance).
- **Assignee:** Hermar Centillas (preserved).
- **Current PR:** #9 at commit `1b5c4a2f620721fea407d1173c41b3adba92fdd7`; at review time `ci` and `secret-scan` passed, Supabase Preview skipped; no formal reviews were submitted.
- **Current independent review blocker:** `src/components/map/MapDiscoveryExperience.tsx` previously routed the drawer’s Filters shortcut to the first button inside Rental filters, the “Under ₱5,000” quick-filter pill, rather than the dialog trigger. A fix is prepared on a separate follow-up branch; it is not yet pushed to PR #9.
- **Remaining acceptance gap:** live search/results and integrated card-to-pin behavior remain blocked on the SCRUM-142/143 RLS/RPC contract. Green checks do not verify this integration.
