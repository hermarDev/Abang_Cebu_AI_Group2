# Abang Cebu AI Cleanup and Refactoring Plan

> **For agentic workers:** Execute task-by-task; keep each change small, reversible, and locally verified. Do not push, merge, or mutate GitHub.

**Goal:** Improve maintainability and reduce confirmed dead/redundant project material without changing application behavior, UX, authentication, data access, or configuration semantics.

**Architecture:** Preserve the existing Next.js App Router, Supabase SSR, rental-search, and MapLibre boundaries. Limit cleanup to evidence-backed references, documentation that contradicts actual routes, duplicated utility implementations, and generated-vendor lint noise; leave uncertain items untouched.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, ESLint, Supabase SSR, MapLibre, pnpm.

**Spec:** User request in session: comprehensive local cleanup/refactor with preservation-first verification and no GitHub remote mutations.

## Global Constraints

- Do not expose, alter, or delete credentials, environment configurations, or production data.
- Do not change user-visible behavior, API contracts, auth/Supabase integration, or map functionality.
- Do not remove files, dependencies, assets, or docs until both static and framework/runtime references have been checked.
- Do not remove generated/vendor MapLibre worker artifacts; they are copied by `scripts/copy-maplibre-workers.mjs` and required by the map.
- Do not install dependencies or mutate GitHub.
- Commit only scoped, validated local changes as checkpoints; do not push.
- Preserve unrelated changes and inspect the complete final diff.

## Review Focus

- Runtime/dynamic asset references missed by text search: retain any asset whose absence cannot be established across app routes and scripts.
- Package peer dependencies: keep `@supabase/supabase-js` unless package metadata proves it is not required by `@supabase/ssr` or project code.
- Framework-discovered files and configuration: retain convention files unless behavior and build evidence support removal.
- Routing documentation: ensure descriptions match actual App Router route inventory before editing.
- Browser behavior: a passing build does not prove the map, auth forms, or `/` page works; smoke-test the running app at `localhost:3000`.

---

### Task 1: Confirm cleanup candidates and baseline

**Files:** Read-only audit of `src/`, `public/`, `docs/`, package/config files, tests, and project instructions. No application edits.

- [x] Capture clean-tree state, branch/commit, worktrees, and coordination claim.
- [x] Record baseline: `pnpm run test`, `pnpm run lint`, `pnpm exec tsc --noEmit`, `pnpm run build`.
- [x] Verify references/usages and package peer-dependency metadata for candidate assets, dependencies, and code paths.
- [x] Record uncertain candidates without deleting them.

**Recorded baseline:** 174 tests passed; lint exited 0 with 1,125 warnings in copied/generated MapLibre assets; TypeScript check and production build exited 0; working tree clean at `c2286c79305b4ff4c510f94c79fcc6e604163811`.

**Initial candidates (reviewed):**
- `src/components/ui/cn.ts` and `src/lib/utils.ts`: exact behavioral duplicate (`twMerge(clsx(...))`). Eight UI primitives import the components-local copy; other source has no runtime import of `src/lib/utils.ts`. Consolidate to the documented `src/lib/utils.ts`, retain a UI-local re-export for existing paths, and add a regression assertion for conflicting Tailwind utilities.
- `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`: tracked static files with no references in tracked source, docs, configs, or scripts and no Next route/build reference; candidates for removal after pre-delete checkpoint.
- `src/components/features/.gitkeep`, `src/components/map/.gitkeep`, `src/components/ui/.gitkeep`: redundant because each directory already contains tracked source files; remove markers only, not directories.
- `README.md`: `/map` is not an App Router page; the recorded production build lists `/` and auth/API paths, and the map is rendered by the root page. Update this one command-line instruction to the root URL.
- `docs/architecture/next15-guidelines.md`, `docs/architecture/client-server-boundaries.md`, `docs/architecture/project-structure.md`, and corresponding `docs/README.md` / `README.md` descriptions: have verified stale Next.js 15 descriptions or obsolete placeholder directory contents against the checked-in Next 16/React 19 package and current tree. Correct the conflicting version/structure statements only; preserve the approved specifications and wireframes that describe intended future features.
- `eslint.config.mjs`: baseline warnings map to exactly two copied MapLibre worker bundles (1,078 and 48 warnings); the worker copy script sources them from `maplibre-gl` and places them in `public/maplibre-gl/`. Retain the workers and license; narrowly ignore only `public/maplibre-gl/**` in ESLint.
- `next.config.ts`: a no-op scaffold; preserve because Next.js discovers this convention file and its removal is unnecessary to achieve scoped cleanup.
- `src/components/ui/examples.tsx`: explicitly referenced by `src/components/ui/README.md` as an interactive component example; retain despite no route import.
- `src/types/index.ts` interfaces have no consuming runtime code; retain as the documented shared/public type entrypoint pending a dedicated type/API migration.
- `public/icons/logo_Only.png`: no exact literal code reference found, but public URLs may be consumed externally; preserve as uncertain.
- Documentation images, PDFs, flowcharts, and authored specs: preserve; the repository links and records these artifacts, and binary duplicate scan found no exact duplicate file content.

No dependency is approved for removal. `@supabase/supabase-js` is a declared peer dependency of installed `@supabase/ssr` (`^2.114.0`); Tailwind packages are used by PostCSS, `tailwind-merge` and `clsx` by the shared class helper, and all other production dependencies have code imports. Knip/depcheck/ts-prune are not installed; do not add analyzer dependencies.

### Task 2: Consolidate the class-name utility

**Files:** `src/components/ui/cn.ts`, `src/lib/utils.ts`, `src/components/ui/ui.test.tsx`.

- [x] Add an assertion that the UI-local helper is the exact canonical exported function from `src/lib/utils.ts`; the pre-change focused run failed on function identity as expected.
- [x] Change `src/components/ui/cn.ts` into a compatibility re-export of `@/lib/utils`; component imports and call semantics are unchanged.
- [x] Focused UI test passed (7/7); full suite passed (175/175); TypeScript check passed (`pnpm exec tsc --noEmit`).
- [ ] Create a local checkpoint commit containing only this verified slice.

### Task 3: Remove verified dead starter assets and markers; fix the root-route instruction

**Files:** `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`, `.gitkeep` files only in populated `src/components/features`, `src/components/map`, and `src/components/ui`, and the single stale line in `README.md`.

- [ ] Before deletion, rerun full tracked-reference checks excluding the plan itself; confirm no HTML, code, script, Next config, or text doc uses the asset paths.
- [ ] Remove only those five starter SVGs and three populated-directory marker files. Leave `.gitkeep` in empty/reserved folders and preserve `logo_Only.png`.
- [ ] Replace the stale `/map` instruction with the actual root route `http://localhost:3000/`.
- [ ] Run markdown local-link validation, tests, and build; check deleted paths are still unreferenced.
- [ ] Create a local checkpoint commit containing only this verified slice.

### Task 4: Correct stale architecture documentation against the current app

**Files:** `README.md`, `docs/README.md`, `docs/architecture/next15-guidelines.md`, `docs/architecture/client-server-boundaries.md`, and `docs/architecture/project-structure.md`.

- [x] Update references that state the application uses Next.js 15 to Next.js 16; technical examples were checked against current Next 16 behavior.
- [x] Update README's map URL to the root route.
- [ ] Update the directory tree to describe the current root `RestoredFinderShell`, map loader/canvas, auth/API routes, actual utility location, and existing components. Remove obsolete `.gitkeep`, placeholder starter-page, and untrue filename claims.
- [ ] Update the client/server map diagram to show the root route and actual dynamic `MapCanvasLoader` / `MapCanvas` boundary; preserve map architecture guidance.
- [ ] Run markdown link validation (expected: 0 broken local links), inspect docs diff for future-looking approved product specs accidentally changed, then run build and tests.
- [ ] Create a local checkpoint commit containing only this verified slice.

### Task 5: Exclude only generated MapLibre worker bundles from ESLint

**Files:** `eslint.config.mjs`.

- [ ] Add `public/maplibre-gl/**` to the existing global ignore list; do not change lint rules or ignore application source.
- [ ] Run `pnpm run lint`; verify the previous 1,125 vendor-only warnings disappear and the command still traverses project source.
- [ ] Run TypeScript check and build; inspect the exact config diff.
- [ ] Create a local checkpoint commit containing only this verified slice.

### Task 6: Final validation and local smoke test

- [ ] Run `pnpm run test`, `pnpm run lint`, `pnpm exec tsc --noEmit`, and `pnpm run build` on the final tree; preserve full output and exact exit codes.
- [ ] Confirm port 3000 is free before starting the app. If occupied, inspect listener PID, command, and working directory; never kill an unrelated process.
- [ ] Start the project using its existing `pnpm run start` after the build (or documented dev command if necessary); verify HTTP response and browser-visible rendering at `http://localhost:3000/`. Exercise critical sign-in/register entry visibility and the root map UI without submitting credentials or mutating backend data.
- [ ] Inspect complete `git diff`, `git status`, local commits, and environment-file names only; confirm no secrets or unrelated paths were touched and no remote operation occurred.
- [ ] Report removed files, consolidated utilities, documentation/config changes, unchanged dependencies, test results, and residual risks separately.
