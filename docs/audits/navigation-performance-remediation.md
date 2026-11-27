# Navigation performance remediation — local verification

Read-only audit baseline: `docs/vercel-react-performance-audit.md`, Herdr run
`/tmp/opencode/herdr-runs/20261127-135905-nav3s` (2026-11-27).

## Implemented changes

1. Middleware skips Supabase session refresh for RSC navigations (`?_rsc=`); full
   document requests still refresh.
2. `loadProfile()` (`src/lib/supabase/profile.ts`) gives every page one cached
   auth + profile lookup instead of a per-page duplicate.
3. All 28 page routes have `loading.tsx`; shared `RouteLoading` uses a native
   `<progress>` element instead of `aria-live` noise.
4. Navigation instrumentation: `performance.mark` around same-origin link
   clicks and pathname changes; optional soft-navigation observer.
5. Public menu links prefetch; admin dashboard raw anchor replaced with
   `next/link`; assistant/details sheet/filter dialog are lazy chunks.
6. Notification and unread-message polling/realtime start on browser idle.
7. Landlord portfolio/map unit chunks fetched in parallel; dashboard avatar
   signing and RPC loads run in parallel.

## Before (deployed abangcebu.tech, 2026-11-27)

Measured with `curl` and `agent-browser`:

| Measurement | Result |
| --- | --- |
| Cold `/` document | TTFB 0.765 s, total 1.380 s |
| Cold `/help` document | TTFB 0.730 s, total 1.406 s |
| Cold `/map` document | TTFB 0.701 s, total 1.341 s |
| Client `/` → `/help` click RSC | 239 ms |
| Client `/` → `/help` route chunk | 231 ms |
| Earlier prefetch requests | 456 ms, 257 ms |
| Suspense boundaries | 0 in `src/`; 14/28 routes had `loading.tsx` |

The audit did **not** reproduce a universal 3 s client transition; the reported
delay was consistent with signed-in routes adding sequential Supabase round
trips, slower client networks, heavy hydration, or a full-document anchor.

## After (local production build, 2026-11-27)

Built with `pnpm build`, served with `PORT=3100 pnpm start`, driven with
`agent-browser` from `/` → `/help`:

| Measurement | Result |
| --- | --- |
| Cold `/` document (`curl`) | TTFB 0.422 s, total 0.423 s |
| `abangcebu:navigation` measure | 79.9 ms |
| `abangcebu:soft-navigation` measure | 143.4 ms |
| Loading files | 28/28 pages |
| Suspense fallback | `RouteLoading` with `<progress>` |

Local numbers are not a deployed A/B comparison; they verify the instrumentation
and that the same route transition completes in well under 1 s on the local
production server with no Supabase cookie.

## Verification commands

- `npx vitest run` — 174 files / 1784 tests passed.
- `npx tsc --noEmit` — exit 0.
- `npx eslint <changed files>` — clean.
- `pnpm build` — exit 0; compiled and generated 45 pages.
- `agent-browser eval "performance.getEntriesByType('measure')"` — recorded
  `abangcebu:navigation` and `abangcebu:soft-navigation` above.

## Residual risk

Authenticated role dashboards were not measured end-to-end because no test
session cookies were available. The signed-in path was validated statically and
by unit tests; deploy and re-measure with a signed-in browser before closing the
ticket.
