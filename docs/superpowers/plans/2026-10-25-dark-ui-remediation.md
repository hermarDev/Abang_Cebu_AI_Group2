# Dark UI Remediation Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans. Execute checkbox steps in order; parent integrates and verifies.

Goal: Deliver a cohesive dark map-first rental finder while preserving authentication, theme preferences, filters, map state, accessibility and light mode.

Architecture: Keep MapLibre, current theme store, Radix primitives and existing semantic tokens. Serialize shared-shell edits. Delegate disjoint investigation/implementation slices; one owner per file. No new dependencies, schema changes or authentication contract changes.

Tech stack: Next.js / React / TypeScript / CSS modules / MapLibre / Radix / pnpm / Vitest / Playwright.

Spec: /home/hrmr/Downloads/AbangCebuAI_Dark_Mode_UIUX_Independent_Audit_2026-10-25.md, qualified by the independent source review in this conversation and the user's existing consistent-auth-dialog preference.

## Global constraints
- Preserve inherited dirty/untracked work; no secrets, production mutations, deployments, database migrations or destructive changes.
- Source baseline: main at a82d754 with substantial local work. Private tracked UI baseline saved in /home/hrmr/.hermes/cache/scratch/dark-ui-baseline.
- Acquire exact coordination paths before edits; recheck registry between waves.
- Retain shared viewport-bounded auth dimensions; do not adopt content-sized login independently.
- Keep one-tap Light/Dark, separate System, 450ms circular manual transition and reduced-motion fallback.
- Keep real vs fictional inventory explicit. Do not silently remove intentionally approved sample browsing or present samples as verified.
- No commit/push without reconciling inherited content and explicit delivery authorization under current session instructions.

## Review focus
1. Modal opened from quick filters: no orphan popover, focus trap or lost draft/apply semantics.
2. Registration validation/Turnstile: submission reachable at short heights without bypassing verification.
3. Map style reload: sources/layers, selected rental, radius, viewport and attribution survive rapid switching.
4. Explicit theme overrides: OS changes cannot override manual choice; System persists.
5. Real provider and fixture differences: a mocked map does not establish real rendering or legal compatibility.

## Task 1 — Reproduce and settle contracts (orchestrator + read-only researcher)
- [ ] Inspect current components and relevant tests; capture affected baseline cases in production-test harness.
- [ ] Verify provider-supported dark style, its sources/sprites/glyphs and attribution. Do not guess URL or replace map engine.
- [ ] Trace auth submit placement/security checks and quick-filter dismissal. Record confirmed failures; skip speculative behavior changes.
- [ ] Freeze map API before implementation: add optional resolved theme prop only if required; default light for existing callers. Inspect MapCanvasLoader and every caller/test before changing it.

## Task 2 — Exclusive quick-filter handoff
Files: src/features/map/FinderQuickFilters.tsx; tests/filter-sheet.spec.ts or focused tests/dark-ui.spec.ts; existing QuickFilters unit tests located by search.
- [ ] Add browser regression opening Property type then advanced Filters and assert only advanced dialog remains visible/interactive, keyboard focus is inside, Escape restores a stable trigger.
- [ ] Run failing regression against actual current CSS without lowering modal layers.
- [ ] Control quick popover state locally using one budget/types/null state. Close it before onOpenFilters; preserve existing drafts and Apply actions. Expand to shell-driven entry only if reproduction requires it.
- [ ] Run focused regression and quick-filter tests. No common overlay manager abstraction.

## Task 3 — Auth submission clarity
Files: src/components/auth/AccountAccessContent.tsx; src/components/auth/RegisterForm.tsx; src/components/auth/LoginForm.tsx; src/features/map/RestoredFinderShell.tsx and .module.css; tests/auth-ui.spec.ts; corresponding unit tests.
- [ ] Reproduce action reachability with validation and verification notice at 360x640, 430x932 and desktop; include 320px reflow and short viewport.
- [ ] Write failing regression for confirmed obstruction or missing action, not merely below-fold content.
- [ ] Keep common dialog dimensions and scrollable body. Make submit conspicuous/reachable using existing form semantics; retain validation, action contracts, pending/disabled state and Turnstile.
- [ ] Reduce duplicate sign-in navigation to one existing route through tabs where safe; change active tab from primary CTA treatment to selected-navigation treatment. Parent owns shared-shell integration.
- [ ] Retest login, registration, reset request and recovery; include keyboard focus and validation. No schema, email, or live account creation.

## Task 4 — Shared restrained palette and control hierarchy
Files: src/app/globals.css; src/features/map/FinderNavigation.module.css; src/features/map/FinderQuickFilters.module.css; src/features/map/FinderListings.module.css; src/features/map/RestoredFinderShell.module.css; affected map control CSS.
- [ ] Inventory token overrides and hardcoded values before changing existing variables. Keep light mode unchanged unless required for a demonstrated defect.
- [ ] Use audit charcoal candidates only after measuring actual foreground/background pairs: base #10151C, card #161E28, popover #202B38, inset input #121A24, primary text #F3F6FA, secondary #AEBBCB. Keep filled action #2563EB with white text; borders #334253 are decorative, not sole essential indicators.
- [ ] Update both explicit .dark and system fallback definitions consistently; do not add a second theme token family.
- [ ] Measure normal text >=4.5:1, large text >=3:1 and essential UI indicators >=3:1 for actual relevant pairs. Record selectors and computed colors rather than claiming blanket WCAG compliance.
- [ ] Harmonize Search this area, map controls, selected navigation and inputs; preserve touch targets and focus. No gradients, glowing borders, decorative tiles or new animation.
- [ ] Capture desktop/mobile screenshots in both modes; inspect rendered proportions, not only tokens.

## Task 5 — Theme-aware basemap
Files: src/components/map/MapCanvas.tsx; src/components/map/MapCanvasLoader.tsx if that actual path exists; src/features/map/RestoredFinderShell.tsx; public/styles/ dark style file only if justified; src/components/map/map-style.test.ts; browser map tests located during Task 1.
- [ ] Write failing test for theme-to-style selection and layer restoration with actual MapLibre API semantics.
- [ ] Wire resolved theme from existing shell to map without recreating the map instance. Preserve override configuration; define explicit light/dark override behavior after inspecting configuration consumers.
- [ ] Reuse verified compatible dark style; restore custom radius and data layers idempotently after style.load. Preserve DOM markers/popups and selected state.
- [ ] Verify real renderer at Cebu with labels, coastlines, roads, radius and markers; toggle twice, assert center/zoom stable and no map errors or duplicate attribution.
- [ ] Retain circle animation. Do not promise the asynchronous map style has loaded within the 450ms transition; inspect actual behavior before adding any preloading complexity.

## Task 6 — Sample disclosure and secondary polish
Files: src/features/map/RestoredFinderShell.tsx; src/features/map/FinderListings.module.css; tests/listings-panel.spec.ts; tests/discovery-states.spec.ts.
- [ ] Preserve intentional sample mode and all fictional disclosures. Consolidate repeated notice only if a visible persistent disclosure remains when the results sheet is collapsed.
- [ ] Keep loading, backend error, no inventory and filtered zero results distinct. No fabricated inventory or automatic samples on error.
- [ ] Keep taxonomy group mapping and draft-count logic; improve explanatory copy only where ambiguous. No backend changes.

## Validation and integration
After each final slice edit, run its nearest tests. Parent runs one integrated build and owns the Playwright listener; delegates do not start competing builds/servers.

Commands:
- pnpm run test (all tests must pass, failures disclosed)
- pnpm exec tsc --noEmit
- pnpm run lint
- pnpm run build
- PLAYWRIGHT_PRODUCTION_SERVER=1 pnpm exec playwright test tests/theme.spec.ts tests/sidebar.spec.ts tests/auth-ui.spec.ts tests/filter-sheet.spec.ts tests/styled-select.spec.ts tests/listings-panel.spec.ts tests/discovery-states.spec.ts tests/search-ui.spec.ts --workers=2
- git diff --check

Add focused task tests to the final command. Expected: exit 0 and all assertions pass; no inferred provider/device/production success. Run installed accessibility tooling only; do not install unapproved dependencies.

Independent QA after integration: review screenshots and actual keyboard/browser interactions against acceptance. Request a read-only security review if auth submission wiring or security boundaries change. Report CI and physical Safari/mobile NOT RUN unless actually exercised.

## Ownership and rollback
Start at most two workers. Researcher initially read-only on map/provider; frontend owns QuickFilters only in first implementation wave. Parent owns shared shell, tokens and integration. Reassign later files only after explicit handoff and current diff review.
Rollback only this task's increments against private baseline; never reset inherited work. Keep each coherent slice separable. External publication/deployment is not part of this local implementation approval.

## Completion
Report each task PASS/FAIL/BLOCKED/NOT RUN, exact commands/logs/screenshots, independent reviewer evidence, remaining risks and actual served URL/build. Do not call the full dark-mode remediation complete while real-map integration or essential action reachability remains unverified.
