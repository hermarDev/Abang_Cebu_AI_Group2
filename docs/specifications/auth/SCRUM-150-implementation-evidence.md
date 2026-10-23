# SCRUM-150 — Password recovery implementation evidence

Implemented in `/home/hrmr/abang-cebu-ai`:
- `src/app/api/auth/reset-password/request/route.ts`: normalized email validation; generic response for provider/account outcomes; Turnstile verification; per-IP (5/15 min) and per-email (3/15 min) in-memory rate limits; 200–400 ms response floor with jitter; canonical `NEXT_PUBLIC_SITE_URL` callback only.
- `src/app/auth/reset-password/callback/route.ts`: recovery-only PKCE exchange; canonical-origin redirect; persists Supabase session cookies and sets a 10-minute HttpOnly recovery marker.
- `src/app/api/auth/reset-password/confirm/route.ts`: validates password; requires the marker, verified user/session, and cryptographically verified Supabase `amr: recovery` claim; updates password and requests global sign-out.
- Shared validation and flow constants in `src/lib/auth/password-reset-validation.ts` and `src/lib/auth/password-reset.ts`.

Verification (latest run):
- Focused recovery and callback tests: 44/44 passed (6 Vitest files; includes transient rejected PKCE exchange handling).
- Existing registration regression tests: 20/20 passed.
- `pnpm exec tsc --noEmit`: passed.
- Scoped `pnpm exec eslint ...`: passed with no output.
- `git diff --check`: passed.

Deployment constraints / remaining risk:
- Rate limits are process-local, not shared across replicas or serverless invocations. Production must use a shared atomic limiter before exposure; local throttling is defense-in-depth only.
- Configure `NEXT_PUBLIC_SITE_URL` to the production HTTPS origin, Supabase Auth redirect allow-list, `TURNSTILE_SECRET_KEY`, and the frontend Turnstile widget.
- A recovery form page/UI is outside this ticket implementation and still needs the related UI ticket.
- Global sign-out failure returns an error after the password has already changed; incident/recovery handling is required in that case.

Jira status was not transitioned. No commit, push, migration, or deployment was performed.
