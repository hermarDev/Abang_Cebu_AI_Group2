# SCRUM-153 validation evidence

Scope: the shared Tailwind v4 UI primitives, semantics, component tests, and local validation. These results do not establish staging or production acceptance.

## Evidence

- Exact PR-code component tests: `pnpm exec vitest run src/components/ui --reporter=dot` passed 5 files/78 tests at code SHA `8ded8f95b1149b714d07be7d6512ba92be35770c`. At the later documentation-only PR head `a6a8517405567633fafd0e0e6efaed7478860d15`, CI and secret scan passed; Supabase Preview was skipped and no formal GitHub approval was recorded. Those checks predate the later outline-hover fix and do not validate it; refresh checks on the updated PR head.
- The modal jsdom tests cover `showModal()` invocation, Escape/cancel, controlled closure, unmount cleanup, focus restoration, and a mocked-rectangle backdrop assertion. The jsdom shim only validates the code path; it does not validate browser top-layer or actual rendered backdrop semantics.
- The repository validation note records an earlier Chromium probe of the DEV-4 `Modal`: native `:modal` behavior, initial focus, background pointer blocking, outside-click dismissal, and focus restoration on unmount. This report is not independently re-run for this update or bound here to an immutable build SHA; treat it as historical author-reported evidence, not current exact-head browser validation.
- The note also records a temporary preview at `http://127.0.0.1:3321/` that reportedly returned HTTP 200 and displayed the Metro Cebu map. Its source SHA/build provenance is not recorded, so this observation is not reproducible acceptance evidence and does not validate the UI Modal component.
- `ui.tokens.test.ts` checks eleven declared normal-text token pairings and four boundary pairs under each of the light, `.dark`, and system-dark selectors, plus modal-backdrop token presence. The boundary matrix now includes `accent-foreground` against `accent-hover` because outline buttons change to that fill/text/border on hover. The dark/system-dark outline hover uses `#99f6ee` on `#134e4a`; the fix adds the `hover:border-accent-foreground` token class so the button border changes with its text instead of retaining lower-contrast `--input`. These are declaration-level/class regression checks, not rendered browser contrast or a complete WCAG audit. The light secondary pair measures 3.74:1 but current Button secondary and Badge default use accent tokens instead.

## Local validation

- At exact code SHA `8ded8f9`, focused UI tests: `pnpm exec vitest run src/components/ui --reporter=dot` — 5 files, 78 tests passed. Current branch `a6a8517` adds evidence-document reconciliation only; no focused tests were rerun after that doc-only change.
- On unchanged code snapshot `8ded8f9`: `pnpm exec tsc --noEmit --pretty false`, `pnpm exec eslint src/components/ui`, `pnpm run lint`, `pnpm run build`, and `git diff --check` passed; full lint had 0 errors and 1,125 MapLibre warnings. The current pushed documentation-only head `a6a8517` CI independently passed type-check, lint, component tests, and build; local `git diff --check` also passed when the doc correction was made.

## Not established

- Full WCAG 2.2 AA contrast audit, keyboard focus containment/trapping, screen-reader review, physical-device testing, staging/production validation, and end-to-end authentication or listing flows. Independent review of PR #14 rated contrast coverage/evidence PARTIAL on its then-current head; the later local uncommitted outline-hover fix has not received rendered or independent QA.
- The current unit checks cover selected token pairs, not complete rendered combinations. The original input/border token `#e6decb` rendered at 1.34:1 against white and 1.26:1 against the sand canvas; the original dark `#1b4571` rendered at 1.54:1 against card and 1.82:1 against canvas. These values did not meet 3:1 for discernible boundaries. `--border` uses `#83734e` in light mode (4.64:1 against white, 4.38:1 against the sand canvas) and `#518ec3` in dark/system-dark modes (4.32:1 against the card, 5.11:1 against the canvas). `--input` uses the same values for its declared card/background pairs. The outline hover is now intended to pair `--accent-foreground` with `--accent-hover`; the declaration-level test checks the tokens, and the component test checks the hover class. No rendered theme audit was performed, and the change does not establish a complete WCAG 2.2 AA audit.
- Jira attachment `10475` could not be downloaded through the authorized binary path (`CONNECTION_REQUIRED`); its bytes were not inspected.

## Evidence boundary

These checks cover the current local component source and automated tests only. They do not establish staging, production, screen-reader, physical-device, or full visual acceptance. Refresh results after any further source edits.
