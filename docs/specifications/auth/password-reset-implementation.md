# Password reset flow

The reset flow uses centralized paths and cookie name from `src/lib/auth/password-reset.ts`.

- Request route: `POST /api/auth/reset-password/request`
- Supabase callback: `/auth/reset-password/callback?type=recovery&next=%2Freset-password`
- Confirmation route: `POST /api/auth/reset-password/confirm`

The request handler validates and normalizes email, verifies Turnstile in production, applies process-local rolling caps (5/IP and 3/email per 15 minutes), and returns a generic response with timing jitter. Its recovery email URL is based only on `NEXT_PUBLIC_SITE_URL`; it will not trust the incoming Host header. The callback accepts recovery links only, exchanges the PKCE code server-side, persists session cookies, and issues a 10-minute HttpOnly recovery marker. A rejected PKCE exchange is handled with a safe login redirect and no recovery marker. Confirmation requires the marker plus a Supabase-verified user/session and a verified JWT `amr` claim containing `recovery`; it then updates the password and requests global session revocation.

Production prerequisites and risks:
- Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS site origin, with no path, query, fragment, or credentials.
- Add that callback to the Supabase Auth redirect allow-list.
- Configure `TURNSTILE_SECRET_KEY` and integrate a frontend widget that sends the token.
- Replace process-local throttling with an atomic shared limiter before production traffic. Local limits do not coordinate across replicas or serverless isolates.
- Build the reset form UI as part of its separate UI ticket.
- If global session revocation fails after password update, the endpoint reports failure; manual support/recovery may be needed.
