# Login Turnstile

Email/password login reuses TurnstileWidget and forwards the verification response through Supabase signInWithPassword options.captchaToken. Missing, expired or failed verification blocks the form when a site key is configured or in production. Each attempted login clears the single-use token and resets verification, including credential and network failures. Development without a site key remains available; production without a site key fails closed in the UI.

## Hosted enforcement gate

The widget alone is not a security boundary. Supabase Auth must have CAPTCHA protection enabled with Cloudflare Turnstile and the matching secret configured privately in its dashboard. Do not put the secret in NEXT_PUBLIC variables. Set NEXT_PUBLIC_TURNSTILE_SITE_KEY for the deployment and allow the exact application hostname in Cloudflare.

Do not enable hosted CAPTCHA blindly: existing registration and password recovery routes verify tokens directly with Cloudflare. A token is single-use and must not be verified twice. Audit and adapt those routes before enabling Supabase-wide CAPTCHA, or registration/recovery may stop working. This increment does not change those routes or hosted configuration.

Before claiming protection, verify direct Auth login requests with absent/invalid tokens are rejected by the hosted service, and complete a real allowed-hostname verification/login with a synthetic test account. Retest registration and recovery under the same configuration. Keep Auth rate limits enabled; CAPTCHA does not replace throttling or MFA.

Official contract: https://supabase.com/docs/guides/auth/auth-captcha

## Checks

Unit checks cover token forwarding, missing/expired verification, retry reset and network failure. Existing widget tests cover callbacks and lifecycle. These use synthetic tokens and do not prove live Cloudflare or hosted Supabase enforcement.
