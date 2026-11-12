# Authentication anti-bot audit

**Date:** 2026-11-12  
**Scope:** AbangCebu AI renter and landlord authentication  
**Reviewed revision:** `327043832ae535a492569c9a68d76e96160a7663`  
**Method:** source inspection, installed SDK inspection, local unit baseline, and current vendor documentation. No production mutation was performed.

## Executive findings

1. The repository already contains a Cloudflare Turnstile siteverify helper, registration and recovery rate limiters, password validation, anti-enumeration responses, and role/suspension RLS checks.
2. The current browser forms do not obtain or send a Turnstile token. Login calls Supabase directly without `options.captchaToken`; registration and recovery submit token-free payloads.
3. The registration and recovery routes contain a second defect: when `TURNSTILE_SECRET_KEY` is set, they siteverify a token locally but do not forward that token to Supabase Auth. If hosted Supabase CAPTCHA is enabled, the same token cannot safely be consumed by both systems, and the hosted provider will receive no token.
4. Supabase's hosted CAPTCHA setting, hosted Auth rate limits, Brevo custom SMTP, email confirmation, redirect allowlist, and trusted proxy IP forwarding were not verified in this nonproduction audit. Repository code cannot prove those hosted settings.
5. Renter and landlord use the same registration endpoint and same `RegisterForm`; only the allowlisted role differs. A shared Turnstile control can therefore protect both roles without duplicating logic.
6. Landlord KYC exists in `public.kyc_verifications`, while `public.profiles.is_suspended` is an independent moderation flag. These must not be repurposed for anti-bot state.
7. No camera, MediaPipe, DeepFace, liveness, face-template, or biometric-recording implementation exists in the application.

## Current control inventory

| Area | Existing control | Evidence | Gap or risk |
|---|---|---|---|
| Supabase registration | Server route calls `supabase.auth.signUp`; user metadata carries allowlisted role and full name | `src/app/api/auth/register/route.ts:80-90` | No CAPTCHA token is forwarded to Supabase. |
| Role authorization | Validation permits only `renter` or `landlord`; database trigger coerces all other requested roles to `renter` | `src/lib/auth/validation.ts:29`; `supabase/migrations/20260929000001_users_and_profiles.sql:164-173` | Shared anti-bot logic must preserve this boundary. |
| Email confirmation | Registration returns a neutral success message and instructs the user to check email | `src/app/api/auth/register/route.ts:9-12,104`; `src/components/auth/RegisterForm.tsx:117-129` | Hosted confirmation setting and actual Brevo delivery remain unverified. |
| Brevo | No direct SDK call exists; Supabase Auth is expected to deliver through custom SMTP | `docs/production/PRODUCTION_READINESS_AUDIT.md` | Hosted SMTP and sender-domain setup need private staging verification. |
| Login | Browser calls `signInWithPassword`, then reads role and suspension from `profiles` | `src/lib/auth/sign-in.ts:23-98` | No CAPTCHA token or app-side login limiter. Provider limits remain unverified. |
| Password recovery | Server route uses PKCE callback and neutral response with timing jitter | `src/app/api/auth/reset-password/request/route.ts:49-52,104-135` | Local verifier consumes a token without forwarding it; no hosted token reaches Supabase. |
| CAPTCHA helper | `verifyTurnstileToken` calls Cloudflare Siteverify with secret, response, remote IP, and timeout | `src/server/turnstile.ts:15-66` | It is an app-side consumer, not the hosted Supabase CAPTCHA consumer. Reusing its token in Supabase risks double consumption. |
| Registration rate limit | Process-local rolling caps: 5/IP and 3/normalized email per 15 minutes | `src/app/api/auth/register/route.ts:13-43` | Per-instance only; no direct-provider coverage. |
| Recovery rate limit | Process-local rolling caps: 5/IP and 3/email per 15 minutes | `src/app/api/auth/reset-password/request/route.ts:14-47` | Per-instance only. |
| Trusted client IP | `getClientIp` accepts sanitized `cf-connecting-ip`, `x-real-ip`, then first forwarded address | `src/server/rate-limit.ts:28-46` | Depends on ingress overwriting untrusted headers; production fails closed when none exists. |
| Provider limits | Supabase documents Auth token-bucket and email limits | Supabase Auth rate-limit documentation | Effective hosted values and IP-forwarding configuration were not inspected. |
| Account status | `profiles.is_suspended` is enforced by protected API paths and RLS | `src/server/admin-access.ts:18-20`; multiple migrations | Keep suspension independent from verification. |
| Verification fields | Listing `verification_status` describes property/identity trust; landlord KYC has `pending`, `verified`, `rejected` | `src/contracts/rental-filters.ts:30-34`; `supabase/migrations/20260929000001_users_and_profiles.sql:112-137` | Do not treat anti-bot challenge success as identity or property verification. |
| Abuse monitoring | Rate-limit and provider error mapping exist | `src/app/api/auth/register/route.ts`; `src/lib/auth/auth-error.ts` | No dedicated registration-attempt audit event was found in the reviewed auth paths. |
| Camera liveness | None | Repository search | Must remain isolated and disabled in production. |

## Authentication and verification separation

Recommended state model:

- **Registration anti-bot challenge:** short-lived Turnstile token; not persisted; not a user status.
- **Email confirmation:** Supabase Auth `email_confirmed_at`; remains the existing account-access prerequisite.
- **Account suspension:** `profiles.is_suspended`; remains an explicit administrative enforcement state.
- **Property/listing verification:** existing listing `verification_status`; remains about property/identity trust.
- **Landlord KYC:** existing landlord-only review workflow; remains independent of registration.
- **Human-presence liveness:** optional experimental signal; never grants legal identity, KYC, landlord, property, or verification status.

## Privacy and threat assessment

### Assets

- Supabase Auth identities and sessions.
- Renter/landlord profile data.
- Brevo email reputation and sender domain.
- Listing, message, and moderation systems reachable after account creation.
- Hosted provider quotas.

### Primary abuse paths

- Automated account creation to expand database and email costs.
- Email bombing through signup or recovery confirmation requests.
- Credential stuffing against accounts after bulk creation.
- Rotation across IP addresses to bypass process-local limits.
- Direct calls to Supabase Auth, bypassing application routes.
- Replay of expired or already-used Turnstile tokens.
- Later abuse of a legitimate account created through account takeover.

### Liveness-specific risks if camera checks are introduced

- Raw video or still-image retention becoming biometric evidence storage.
- Presentation attacks using printed photos, replays, or virtual cameras.
- False rejection from lighting, disability, headwear, low-end devices, or network conditions.
- Unequal access if camera hardware or motor ability is required.
- Data processed without clear notice or lawful basis.
- False trust if a liveness result is shown as government-ID or legal-identity verification.

## Vendor and licensing evidence

- Supabase officially supports Cloudflare Turnstile for sign-in, sign-up, and password reset, and expects the browser token in `options.captchaToken`.
- Cloudflare Turnstile Free allows up to 20 widgets, unlimited challenges, and up to 10 hostnames per widget.
- Cloudflare tokens are valid for 300 seconds, intended for one validation, and server-side Siteverify is mandatory.
- Cloudflare's public free plan does not include ephemeral IDs; those require Enterprise.
- MediaPipe repository and Tasks Vision package are Apache-2.0. MediaPipe states input processing can remain on device. Its legacy liveness solution is no longer supported; current Tasks APIs provide face detection/landmarks, not an authoritative anti-spoofing verdict.
- DeepFace repository is MIT, but individual model weights can carry separate restrictions. Current model documentation warns that VGG-Face is non-commercial and InsightFace-derived ArcFace may require a commercial license. DeepFace anti-spoofing performance, model licensing, and deployment resource needs therefore require separate evaluation.

## Baseline evidence

- `pnpm install --frozen-lockfile`: PASS.
- `pnpm run test`: PASS, 122 test files and 1,092 tests passed on the reviewed revision.
- Live Supabase CAPTCHA, provider rate limits, Brevo delivery, email confirmation, and production proxy behavior: NOT RUN because this audit did not use production credentials or mutate hosted configuration.

## Required production evidence before rollout

1. Confirm the exact hosted project used by the served application.
2. Verify CAPTCHA is enabled for hosted Auth with Cloudflare Turnstile and the matching secret.
3. Verify the browser site key's hostname allowlist includes staging and production origins and excludes unrelated origins.
4. Verify hosted Auth sign-up, sign-in, recovery, email, and IP-forwarding limits.
5. Exercise renter and landlord registration with approved synthetic accounts, including missing, invalid, expired, and replayed challenge tokens.
6. Confirm confirmation email delivery through Brevo and callback handling.
7. Verify direct Supabase Auth requests are rejected when the hosted CAPTCHA is required.
8. Record rollback steps and a monitoring window for signup volume, email failures, CAPTCHA failures, and account creation anomalies.
