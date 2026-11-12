# Unified anti-bot and optional human-presence verification design

**Date:** 2026-11-12  
**Status:** Approved for implementation by the standing objective supplied on 2026-11-12  
**Related audit:** `docs/audits/2026-11-12-authentication-anti-bot-audit.md`

## Intent

Prevent automated fake-account registration for both renters and landlords while keeping legitimate web access usable. Automatic anti-bot protection must be shared, low-friction, privacy-conscious, and enforced by a trusted server boundary. Optional human-presence checks must remain independent from basic account access and must never imply legal identity, property verification, or landlord approval.

## Goals

- Apply the same automatic anti-bot challenge to renter and landlord registration.
- Use Cloudflare Turnstile Free and Supabase Auth's hosted CAPTCHA integration.
- Enforce the authoritative CAPTCHA verification at the provider boundary that consumes the token.
- Preserve existing registration validation, role allowlisting, email confirmation, password policy, and Brevo delivery path.
- Keep application rate limits as an incremental abuse-control layer.
- Make missing, failed, expired, and consumed challenges visible and retryable.
- Support current dialog, desktop, mobile, light-theme, and dark-theme surfaces.
- Provide an isolated, production-disabled camera proof of concept with a non-camera alternative.
- Avoid government IDs and unnecessary facial biometrics.

## Non-goals

- Proving a user's legal identity.
- Replacing email confirmation.
- Replacing KYC, landlord moderation, or listing review.
- Using camera liveness to grant or deny ordinary account access.
- Saving camera recordings or face embeddings in this increment.
- Building a distributed rate-limit service in this increment.
- Changing production Supabase, Cloudflare, Brevo, or deployment settings without explicit authorization.

## Approaches considered

### A. Hosted Supabase CAPTCHA consumes the Turnstile token — recommended

The browser obtains a short-lived token from Cloudflare. The application forwards it unchanged to Supabase Auth through the SDK's `options.captchaToken`. Supabase's hosted CAPTCHA service validates it with Cloudflare using the hosted secret. Direct calls to Supabase Auth are therefore protected by the provider, not only by a web route.

Trade-off: live protection depends on coordinated hosted configuration and cannot be proven by unit tests. The application cannot locally siteverify the same token and then forward it to Supabase, because both validations would consume a single-use token.

### B. Application Siteverify only

The application route validates the token with Cloudflare and then calls Supabase without a token. This protects only requests that use the application route. Direct Supabase Auth requests bypass it.

Trade-off: simpler local control, but weaker provider-wide coverage and incompatible with hosted Supabase CAPTCHA using the same token.

### C. Separate tokens for application and hosted provider

The browser would obtain two tokens, one consumed locally and one by Supabase. This adds a second challenge and unnecessary failure modes.

Trade-off: redundant. It is not recommended.

### D. Database-backed verification status

A profile or table would store a challenge result before account creation.

Trade-turn: rejected. It creates personal-data retention, concurrency, and cleanup obligations without improving provider enforcement.

## Chosen architecture

### Registration flow

1. `RegisterForm` renders one shared `TurnstileWidget` for both roles.
2. The widget loads Cloudflare's explicit API once per browser page and renders a managed, flexible-size challenge.
3. The widget calls `onTokenChange("")` on mount, expiry, timeout, error, reset, and unmount. A late callback after unmount is ignored.
4. The form includes the current token as `turnstileToken` in `POST /api/auth/register`.
5. The route validates shape and rate limits before contacting Supabase.
6. The route passes the token unchanged as `supabase.auth.signUp(..., { options: { captchaToken } })`.
7. Supabase Auth performs authoritative hosted validation. A provider CAPTCHA failure maps to `CAPTCHA_VERIFICATION_FAILED` and HTTP 403.
8. The form clears and resets the challenge after every submitted attempt, including invalid credentials, network failure, and provider rejection. Entered details remain intact.
9. A successful registration keeps the existing neutral response and email-confirmation instructions.

### Login and recovery flow

The same widget component is reused where Supabase-hosted CAPTCHA applies:

- Login forwards `options.captchaToken` to `signInWithPassword`.
- Recovery forwards `options.captchaToken` to `resetPasswordForEmail`.

Tokens are never siteverified locally in the same request that forwards them to Supabase. This prevents double consumption. The application can add local rate limits independently; it must not validate the provider-owned token.

### Challenge configuration

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: public browser key.
- `TURNSTILE_SECRET_KEY`: used only by hosted Supabase Auth configuration, not by application code.
- Widget `action`: `signup`, `login`, or `recovery` for analytics and expected-action validation.
- Hosted production hostname allowlist: `abangcebu.tech` and any approved preview origins; never `*` or unrelated domains.

### Failure behavior

| Failure | User feedback | System behavior |
|---|---|---|
| Missing challenge | “Complete the security verification…” | No provider mutation. |
| Invalid/expired/replayed challenge | “Security verification expired or failed. Complete it again.” | HTTP 403; no provider mutation. |
| Challenge script unavailable | Accessible alert with reload guidance | Submit remains blocked when hosted CAPTCHA is required. |
| Provider network failure | Safe temporary-unavailable message | Retry after fresh challenge. |
| Rate limit | HTTP 429 with `Retry-After` | Existing actionable error; no email sent. |
| Duplicate registration | Same neutral response as new registration | Anti-enumeration preserved. |

### Verification-state boundaries

No new `profiles` field is required for anti-bot. The Turnstile token is ephemeral and never persisted.

- `email_confirmed_at`: Supabase email verification.
- `profiles.is_suspended`: administrative suspension.
- `public.kyc_verifications.status`: landlord KYC.
- listing `verification_status`: property/listing trust.
- liveness result: experimental UX signal, never persisted in this increment and never an authorization grant.

## Rate-limit and abuse design

Retain the existing process-local registration and recovery limiters because they still reduce accidental bursts and cost pressure. Keep their current conservative limits during this increment.

Do not describe them as distributed protection. The hosted Supabase Auth rate limits and hosted CAPTCHA are the provider-wide controls. Before multi-instance rollout, evaluate a shared limiter such as Redis or a database-backed bucket; that is outside this increment.

Do not trust client-supplied forwarding headers. Production ingress must overwrite them. Existing production behavior fails closed when no trusted client IP exists.

## Human-presence proof of concept

### Scope

- Isolated route under `/liveness-poc`.
- Production route returns a clear disabled/preview state and cannot alter authentication or account state.
- Development route may use MediaPipe Tasks Vision Face Landmarker on-device.
- Camera frames are processed locally and discarded. No recording, upload, embedding, or database write occurs.
- A short randomized interaction sequence checks observable head movement and/or blink signals. This is a research prototype, not a production liveness verdict.
- A non-camera alternative explains that Turnstile plus email confirmation remains the normal path.

### Why not use it as a gate

- Current MediaPipe Tasks APIs do not provide an authoritative anti-spoofing verdict.
- Client-only checks can be bypassed with injected or virtual camera input.
- Head movement and blink thresholds need representative device and accessibility testing.
- A server-side DeepFace anti-spoofing candidate adds Python, model-weight licensing, GPU/CPU tuning, latency, and image-processing privacy obligations.
- False positives can block legitimate users, especially users with motor or visual impairments.

### Privacy and lawful-basis gate

Before any real-user pilot:

1. Publish a clear camera-processing notice with purpose, data categories, retention, recipients, and contact.
2. Establish and document a lawful basis appropriate for Philippine users; do not rely only on bundled consent.
3. Obtain explicit opt-in; camera denial must not block normal registration.
4. Keep processing on-device where possible; do not retain frames.
5. Provide a non-camera route with equivalent basic anti-bot protection.
6. Complete a Data Protection Impact Assessment and security/privacy review.
7. Define deletion and incident-response procedures for any future server-side candidate.

## Security and privacy review

- CAPTCHA tokens are treated as secrets only for their short validity window; they are never logged, stored, or included in telemetry.
- The server forwards tokens only to Supabase Auth.
- Provider errors are sanitized before reaching the browser.
- Registration remains anti-enumerating.
- Role assignment remains allowlisted and database-enforced.
- Account suspension remains independent.
- Email confirmation remains enabled and unchanged.
- No government ID collection is added.
- No biometric template or raw recording is created.

## Operational and cost assessment

| Component | Incremental cost | Notes |
|---|---:|---|
| Cloudflare Turnstile Free | $0 | Unlimited challenges on Free; up to 20 widgets and 10 hostnames per widget. |
| Supabase hosted CAPTCHA | Included in current Auth capability | No separate app dependency. |
| Existing application limiter | $0 | Process-local; no new infrastructure. |
| MediaPipe POC | $0 software | Browser CPU/GPU and model/WASM bandwidth only; no stored video. |
| DeepFace candidate | Not approved | Requires separate service sizing, model-weight review, image retention design, and benchmark. |

## Permission matrix

| Capability | Guest | Renter | Landlord | Admin | Suspended |
|---|---:|---:|---:|---:|---:|
| Submit registration with Turnstile | Yes | N/A | N/A | N/A | N/A |
| Create renter profile | Yes, after challenge and confirmation | Existing account | Existing account | No self-registration | No self-registration |
| Create landlord profile | Yes, after challenge and confirmation | Existing account | Existing account | No self-registration | No self-registration |
| Use normal app while email unconfirmed | Provider-dependent | Provider-dependent | Provider-dependent | Provider-dependent | Provider-dependent |
| Run liveness POC | No production effect | No production effect | No production effect | No production effect | No production effect |
| Gain verification/KYC/property status from liveness | Never | Never | Never | Never | Never |

## Rollout recommendation

1. Merge and deploy the application code with CAPTCHA not yet required by hosted Auth, using test keys or no hosted CAPTCHA.
2. Verify the widget on staging desktop and mobile, light and dark themes, both roles, retry, expiry, and token reset behavior.
3. In the hosted Supabase project, configure Turnstile with the exact site key and secret, enable CAPTCHA, and restrict allowed hostnames.
4. Verify direct Supabase signup without a token is rejected and with a valid token is accepted.
5. Verify Brevo confirmation delivery and callback for both roles.
6. Monitor CAPTCHA rejection, signup volume, provider 429s, email failures, and suspicious account patterns for at least one normal traffic cycle.
7. Roll back hosted CAPTCHA first if legitimate access breaks; keep application code and rate limits.
8. Do not enable camera liveness for ordinary access. Pilot only after the privacy, accuracy, spoof, accessibility, and infrastructure gates are approved.

## Remaining external gates

- Hosted Supabase CAPTCHA configuration and provider enforcement.
- Exact hosted Auth rate limits and IP forwarding.
- Brevo SMTP delivery and sender-domain health.
- Production/preview hostname allowlist.
- Live approved synthetic renter and landlord accounts.
- Independent security review and CI evidence.
