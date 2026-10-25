# Testing

## Layers

- `pnpm test`: fast Vitest unit/route contracts under `src/**/*.test.{ts,tsx}`.
- `pnpm test:e2e`: Chromium UI and HTTP API integration tests under `tests/`.
- `pnpm test:api`: only HTTP validation contracts; no browser launch required.
- `pnpm test:e2e:report`: open the latest HTML report.

Install only the existing pinned Playwright dependency with `pnpm install --frozen-lockfile`; on a new machine install its browser with `pnpm exec playwright install chromium` (CI Linux may require `--with-deps`). No additional reporting or fixture packages are needed.

## Isolation and safety

Playwright owns a dedicated Next development server on `127.0.0.1:3218`. It refuses to reuse an occupied port. Existing production previews are left alone. Explicit environment values override `.env` Supabase configuration with an unreachable local endpoint and a dummy anon key. Never point this runner at a deployed application or replace these values with production credentials.

UI tests import `test` and `expect` from `./fixtures`. Each test receives a fresh browser context with no stored session. The fixture serves empty rental inventory and a minimal map style, blocks external requests, and blocks browser mutations. It exercises real application interactions, not real provider tiles or rental data. Do not interpret fixture attribution or an initialized canvas as proof of live geographic rendering.

API tests exercise only invalid requests that return before auth/provider access. Browser interception does not intercept server fetches or Playwright's APIRequestContext; the dummy server environment is therefore essential. Do not add valid registration, reset-email, logout, listing or KYC mutations to this suite.

## Authentication

Current E2E coverage is guest account-modal switching, dismissal and focus restoration. Real login, email confirmation, OAuth and authenticated RLS are not simulated with forged cookies. Existing mocked route/unit tests retain auth branch coverage. Add real authenticated E2E only against a disposable local Supabase stack with seeded synthetic users, using separate role contexts and ignored `playwright/.auth/` state. Never save production sessions in artifacts.

## Reliability and evidence

Chromium is the default to minimize runtime. Mobile coverage changes viewport within focused tests rather than multiplying every API test across browser/device projects. Local execution uses one worker, CI two. Retries are disabled so flakes remain visible. Assertions wait on observable state; no sleeps or arbitrary network-idle gates.

Built-in list, HTML and JUnit reporters require no dependencies. Traces and screenshots are retained on failures. Reports live in ignored `playwright-report/` and `test-results/`. Treat artifacts as sensitive if future tests add credentials. Use `pnpm exec playwright test --repeat-each=3` for stability checks. Run `pnpm run lint` and `pnpm exec tsc --noEmit --incremental false` alongside both suites.

The default server is development-mode for fast, isolated feedback; it does not validate production compilation, deployed headers, Turnstile, real map tiles, hosted schema or RLS. Run the separate production build gate and approved staging checks before release. Do not rebuild `.next` while another session owns an active preview.
