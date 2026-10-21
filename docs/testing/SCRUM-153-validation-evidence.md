# SCRUM-153 validation evidence

Scope: the shared Tailwind v4 UI primitives, semantics, component tests, and local validation. These results do not establish staging or production acceptance.

## Evidence

- Focused component tests: `pnpm exec vitest run src/components/ui/ui.test.tsx src/components/ui/ui.acceptance.test.tsx src/components/ui/examples.test.tsx` passed 3 files/26 tests in an earlier snapshot. Latest focused run: `pnpm exec vitest run src/components/ui/ui.test.tsx src/components/ui/ui.acceptance.test.tsx src/components/ui/examples.test.tsx src/components/ui/badge.test.tsx src/components/ui/ui.tokens.test.ts --reporter=dot` — 5 files, 47 tests passed.
- The modal jsdom tests cover `showModal()` invocation, Escape/cancel, controlled closure, unmount cleanup, focus restoration, and a mocked-rectangle backdrop assertion. The jsdom shim only validates the code path; it does not validate browser top-layer or actual rendered backdrop semantics.
- A Chromium run of the actual DEV-4 `Modal` mounted on a temporary probe route confirmed native `:modal` behavior, initial focus on “Close dialog”, background pointer blocking, and dismissal on an outside/backdrop click. It also confirmed that unmounting the open modal closes it and restores focus to the opener when the trigger remains connected. The temporary probe route was removed afterward.
- The temporary DEV-4 app preview at `http://127.0.0.1:3321/` previously returned HTTP 200 and displayed the Metro Cebu map; this was a smoke test of the current app route, not validation of the UI Modal component.
- Theme-token contrast tests cover 16 semantic foreground/surface pairs (eight in each light/dark theme) that are selected by the test; this is a partial token audit, not a complete rendered UI contrast audit. The light `secondary` / `secondary-foreground` pair is not among those pairs and measures 3.74:1. Badge secondary styling uses `bg-muted text-foreground`; other component variants use their named semantic token pairs.

## Local validation

- Focused UI tests after the border/input token edits: `pnpm exec vitest run src/components/ui --reporter=dot` — 5 files, 64 tests passed. This includes the updated token suite.
- `pnpm exec tsc --noEmit` — PASS.
- `pnpm exec eslint src/components/ui src/test-setup.ts vitest.config.ts` — PASS.
- `pnpm run lint` — PASS, 0 errors and 1,125 warnings in bundled `public/maplibre-gl` assets.
- `pnpm run build` — PASS after the token edits; generated `/` and `/_not-found`.
- `git diff --check` — PASS.

## Not established

- Full WCAG 2.2 AA contrast audit, keyboard focus containment/trapping, screen-reader review, physical-device testing, staging/production validation, and end-to-end authentication or listing flows.
- The current unit checks cover selected token pairs, not complete rendered combinations. The original input/border token `#e6decb` rendered at 1.34:1 against white and 1.26:1 against the sand canvas; the original dark `#1b4571` rendered at 1.54:1 against card and 1.82:1 against canvas. These values did not meet 3:1 for discernible boundaries. `--border`/`--input` now use `#83734e` in light mode (4.64:1 white, 4.38:1 sand) and `#518ec3` in dark and system-dark modes (4.32:1 card, 5.11:1 canvas); an automated declaration-level regression test covers those explicit pairs. This does not replace a rendered theme audit.
- Jira attachment `10475` could not be downloaded through the authorized binary path (`CONNECTION_REQUIRED`); its bytes were not inspected.

## Evidence boundary

These checks cover the current local component source and automated tests only. They do not establish staging, production, screen-reader, physical-device, or full visual acceptance. Refresh results after any further source edits.
