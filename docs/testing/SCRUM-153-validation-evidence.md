# SCRUM-153 validation evidence

Scope: the shared Tailwind v4 UI primitives, semantics, component tests, and local validation. These results do not establish staging or production acceptance.

## Evidence

- Exact PR-head component tests: `pnpm exec vitest run src/components/ui --reporter=dot` passed 5 files/78 tests at source SHA `8ded8f95b1149b714d07be7d6512ba92be35770c`. A local rerun at that exact code SHA also passed 5 files/78 tests; subsequent changes are documentation-only.
- The modal jsdom tests cover `showModal()` invocation, Escape/cancel, controlled closure, unmount cleanup, focus restoration, and a mocked-rectangle backdrop assertion. The jsdom shim only validates the code path; it does not validate browser top-layer or actual rendered backdrop semantics.
- The repository validation note records an earlier Chromium probe of the DEV-4 `Modal`: native `:modal` behavior, initial focus, background pointer blocking, outside-click dismissal, and focus restoration on unmount. This report is not independently re-run for this update or bound here to an immutable build SHA; treat it as historical author-reported evidence, not current exact-head browser validation.
- The note also records a temporary preview at `http://127.0.0.1:3321/` that reportedly returned HTTP 200 and displayed the Metro Cebu map. Its source SHA/build provenance is not recorded, so this observation is not reproducible acceptance evidence and does not validate the UI Modal component.
- `ui.tokens.test.ts` checks ten declared normal-text token pairings under each of the light, `.dark`, and system-dark selectors, plus three boundary pairs under each selector, and modal-backdrop token presence. This is selected declaration-level coverage, not an exhaustive rendered audit. The light `secondary` / `secondary-foreground` pair is not covered and measures 3.74:1, but current Button secondary and Badge default use `accent` / `accent-foreground` instead.

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
