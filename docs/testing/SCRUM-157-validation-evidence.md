# SCRUM-157 Validation Evidence: Filter Pills, URL State Sync & Results Drawer

Date: 2026-10-20
Repository: `Abang_Cebu_AI_Group2`
Branch / Worktree: `feat/SCRUM-157-filters-rebased` / `.worktrees/scrum-157-filters-rebased`
Source-fix commit: `c1c7a67c69c8afcf6280afdb2a20933915c7d16c` (pushed to `feat/SCRUM-157-filters-rebased`, PR #9). Validation evidence was refreshed in a separate follow-up commit.
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
- **Current PR:** #9 at commit `c1c7a67c69c8afcf6280afdb2a20933915c7d16c`; CI and secret scan pass, Supabase Preview skipped; no formal reviews have been submitted.
- **Shortcut finding:** independently reviewed and fixed in `MapDiscoveryExperience.tsx`: the drawer shortcut now activates the dialog trigger by ref, not the first quick-filter pill. Regression test verifies dialog opens and the ₱5,000 pill remains inactive. Commit `c1c7a67` is pushed to the PR branch.
- **PR state:** open and reported mergeable; no formal review yet. Do not merge based on green checks alone.
- **Remaining acceptance gap:** live search/results and integrated card-to-pin behavior remain blocked on SCRUM-142/143 listing-service/RLS integration.
