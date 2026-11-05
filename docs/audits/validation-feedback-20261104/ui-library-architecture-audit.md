# UI library and architecture audit

Snapshot and limitations: [audit](validation-feedback-audit.md). Manifest `package.json:17-45`; lockfile importer `pnpm-lock.yaml:9-83`. These are installed/declared dependency metadata, not proof that every package was exercised or current versions are secure.

## Dependency decision matrix

| Technology | Evidence | Proposed decision | Rationale / gate |
|---|---|---|---|
| Next.js | 16.3.6 declared and locked, `package.json:28`, `pnpm-lock.yaml:41-43` | Keep; consult installed docs before any change. | App Router exists; live compatibility/build NOT RUN. |
| React / DOM | 19.2.8 declared and locked, `package.json:29-30`, lock `:44-49` | Keep. | Actual rendering NOT RUN. |
| TypeScript / Tailwind | `tsconfig.json:4-23` strict; lock TS 5.9.3 and Tailwind 4.3.3 (`:75-80`); `postcss.config.mjs` | Keep. | No demonstrated need for upgrade. |
| Radix | Dialog/popover 1.3.1, radio 1.5.1, select 2.4.1 resolved against React 19 in lock `:11-22` | Keep existing primitives. | Lock records resolution, not proof every interaction or compatibility test passes. |
| shadcn/ui | `components.json` absent in checkout; local `src/components/ui/` wrappers exist, provenance not established. | Reuse local design system, compare individual component needs to shadcn patterns; no wholesale replacement. | shadcn documentation supplies composable source; provenance and peer compatibility of any chosen copied revision must be checked. |
| Sonner | Not a direct manifest dependency; source search found no imports. Current `Toast.tsx` is example-only. | Defer addition until a real shared notification requirement and accessibility/stacking gap are demonstrated. | Avoid duplicate notifier; if adopted verify peer version, live regions, timing, safe-area and migration. |
| React Hook Form | No direct dependency/import found. | Defer; retain simple controlled/native forms unless actual complexity makes migration beneficial. | Field-level changes can reuse current state; avoid blanket churn. |
| Zod and `@hookform/resolvers` | No direct dependency/import found. | Defer; existing `src/lib/auth/validation.ts` and `password-reset-validation.ts` are in use. | If later needed, preserve exact client/server boundaries, version compatibility and all existing validators. |
| Lucide | Direct 1.48.0 locked `pnpm-lock.yaml:35-37` | Keep. | Eye/EyeOff controls present in auth; measured target sizes NOT RUN. |
| Supabase SSR/client | 0.12.7 / 2.117.2 locked `:23-28` | Keep auth/server/client and effective RLS checks. | User identity and policies must be tested on an authorized isolated DB; lockfile is not runtime proof. |
| TanStack Query | No direct dependency/import found. | Do not introduce by default. | Existing local request state may suffice; audit concurrency and persistence before migration. |
| Vitest/Playwright | 3.2.7 / 1.64.1 lock `:54-56,81-83`; `vitest.config.ts:4-7`, `playwright.config.ts:3-33` | Keep. | Test execution NOT RUN; fixtures and hosted behavior differ. |

`package.json` absence is a direct-dependency finding, not proof there is no transitive dependency anywhere. No installation, upgrade, vulnerability scan or compatibility test was run. Search of `src` for Sonner, React Hook Form, resolvers, Zod and TanStack Query imports found none in this audit; recheck complete file set before a migration.

## Component fit

| Requested component | Observed existing option | Decision |
|---|---|---|
| Field, FieldError | `src/components/ui/Field.tsx:7-12` | Reuse; supply labels/descriptions and error associations in callers. `FieldLabel`/`FieldDescription` not exported there. |
| Input | `src/components/ui/Input.tsx` | Reuse; callers own label and error IDs. |
| Textarea / checkbox | Native controls in `src/app/list-property/ListPropertyForm.tsx:104-105,128`; | Reuse native semantics; add wrappers only if repeated proven need. |
| Select | `src/components/ui/Select.tsx`, Radix direct in some flows | Reuse where suitable; audit keyboard and value contracts, do not swap blindly. |
| Button, Alert, Modal, Skeleton | `src/components/ui/{Button,Alert,Modal,Skeleton}.tsx` | Keep, improve targeted problems; Alert is warning-styled, not a generic variant contract. |
| AlertDialog, Sheet, Progress, Tooltip, Popover | Radix dialog/popover are present; `ListPropertyForm.tsx:88-95` has native progress semantics. Remaining wrappers/uses not exhaustively inventoried. | Evaluate per workflow; do not claim absent globally. |
| Toast/Sonner | `src/components/ui/Toast.tsx:23-44`, example consumer only | Use only after interaction/stacking accessibility decision; Sonner optional. |
| Error boundary | No `error.tsx` found by source filename search. | Review route-specific failure need; expected errors must remain explicit results. No claim all exceptions go uncaught. |

## Error-handling approach

Use existing action results and API response shapes first; map known field errors to fields and known account/session/rate/conflict cases to actionable non-leaking messages. Keep unknown errors generic and log redacted diagnostics on the server. Maintain identity checks, backend validation, RLS and provider controls; client validation is not authorization. Distinguish operation rejected from confirmation lost; retry only with a verified idempotency/reconciliation contract. Do not consolidate independent response shapes until consumers and rollout compatibility are mapped.

## Primary documentation inspected on 2026-11-04

- https://ui.shadcn.com/docs/components/field — field composition, label/control/help/error; inspected via browser.
- https://ui.shadcn.com/docs/components/sonner — URL returned current shadcn Toast documentation; verify actual revision and chosen backend before integration rather than assuming a historical Sonner API.
- https://sonner.emilkowal.ski/ — Toaster, variants and actions; inspected via browser, no peer compatibility established.
- https://react-hook-form.com/docs and https://zod.dev/ — library responsibilities; inspected, compatibility with this exact app NOT VERIFIED.
- https://nextjs.org/docs/app/getting-started/error-handling — expected errors as results vs uncaught exceptions; current site inspected, installed-version-specific behavior not verified.
- https://supabase.com/docs/guides/database/postgres/row-level-security — database policies and grants; inspected, deployed effective permissions NOT VERIFIED.
- https://pages.nist.gov/800-63-4/sp800-63b.html — password guidance; applicability and implementation migration require security review.
- https://www.w3.org/TR/WCAG22/ — blocked by bot verification in this audit; no claim of direct text review or WCAG conformance.
