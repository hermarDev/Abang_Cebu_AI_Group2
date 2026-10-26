# Refresh Theme Flash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Apply the saved appearance before first paint and preserve it throughout hydration and refresh.

**Architecture:** Use a small synchronous root-layout inline script to resolve the existing abangcebu-theme preference before body rendering. Keep the current preference store and controls. Prevent the server's light snapshot from overwriting that early resolution during initial hydration; do not introduce a theme library or cookies.

**Tech Stack:** Next.js 16.3.6, React 19, TypeScript, Vitest, Playwright.

**Spec:** User request in this session: fix the split-second dark appearance on refresh; plan first, then implement. Existing Light, Dark and System behavior must remain intact.

## Global Constraints

- No dependency additions, unrelated redesign, auth changes, or destructive operations.
- Preserve all inherited dirty tracked and untracked content. Take a private non-secret baseline before edits; obtain exact atomic claims for every touched path.
- Root class, semantic tokens and native color-scheme must agree before paint and after hydration.
- Invalid or inaccessible storage falls back to System; missing matchMedia falls back to Light.
- Do not push the existing unpublished commit chain. Scoped local delivery only until remote publication can exclude unrelated history.

## Review Focus

- Saved Light with dark OS: no initial dark palette.
- Saved Dark with light OS: no initial light palette or hydration rollback.
- System and absent/invalid values: follow OS on load, then live OS changes.
- Storage access failure: render normally with OS fallback, no uncaught startup error.
- Hydration and existing toggle animation: no mismatch errors, preference reset or transient opposite root theme.

## Task 1: Prevent first-paint and hydration theme rollback

**Files:**
- Modify src/app/layout.tsx: synchronous fixed-source bootstrap before body and narrowly scoped root hydration warning handling.
- Modify src/features/map/RestoredFinderShell.tsx: root synchronization must use the current client preference rather than blindly applying the server snapshot.
- Modify src/features/map/useFinderTheme.ts only if a shared resolver is needed to avoid divergent runtime rules; preserve the existing hook return contract.
- Create tests/theme-first-paint.spec.ts: isolate new checks from inherited tests/theme.spec.ts edits.
- Modify src/features/map/useFinderTheme.test.ts only if resolver behavior changes.

**Interfaces:** Existing storage key abangcebu-theme; values light, dark, system. Keep useFinderTheme() returning preference, resolvedTheme and setPreference unchanged.

- [ ] Verify applicable Next.js inline-script guidance and CSP constraints. Inspect every hook caller, root-class writer, theme selector, existing test and fixture before production edits.
- [ ] Add a failing browser regression with saved Light and dark OS. Block external Next script execution while leaving inline scripts enabled; inspect root class, computed background and color-scheme before hydration. Expected Light background is rgb(255, 255, 255). Observe the baseline fail on missing early resolution, not on server setup.
- [ ] Extend the regression to saved Dark/light OS, System under both OS modes, missing/invalid storage and storage throwing. Expected dark token is #10151c. Exercise fresh navigation and reload.
- [ ] Implement the minimum bootstrap with only fixed executable source and allowlisted storage values. Never interpolate storage contents as code. Guard storage and matchMedia separately so storage failure still follows OS.
- [ ] Ensure initial hydration cannot reset the root to the server's Light snapshot. Instrument root class/style mutations through hydration; test opposite-theme samples and hydration console errors. Preserve SSR markup compatibility and runtime OS/storage synchronization.
- [ ] Run pnpm exec playwright test tests/theme-first-paint.spec.ts tests/theme.spec.ts against the exact current owned server/build. Rerun existing theme hook tests and the full pnpm test suite, pnpm exec tsc --noEmit, pnpm run lint, pnpm run build and git diff --check. Report each gate separately.
- [ ] Obtain independent bounded review, inspect the final scoped diff, and commit only the increment using the saved baseline. Do not stage inherited content or publish unrelated commits. Record blockers rather than claiming deployment.

## Rollback

Revert only this task's scoped commit or apply the saved task diff in reverse. Never restore whole dirty files from HEAD.

## Current evidence and limits

Inspection: src/app/layout.tsx has no pre-paint theme initialization. globals.css uses OS-dark tokens until the root gets .light. RestoredFinderShell applies activeTheme in useEffect, while useFinderTheme's server snapshot is Light. This explains a plausible flash path; browser reproduction remains required before implementation.

Ownership inspection: local claim list was empty, one worktree on main, extensive inherited changes, no listeners on ports 3217/3218. Existing HEAD a82d754 is ahead of locally recorded origin/main by multiple unrelated commits. These observations are not proof of remote freshness or abandoned ownership. Recheck ownership and inspect relevant Jira/PR context before edits; stop on unresolved overlaps.
