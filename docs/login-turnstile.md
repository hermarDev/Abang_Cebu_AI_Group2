# Authentication protection and deployment gate

The current application no longer sends CAPTCHA tokens for login, registration or password-recovery requests. Supabase Auth still handles credentials and password hashing; the application retains validation and the recovery request's process-local limiter.

Before deploying this change, verify that the hosted Auth CAPTCHA configuration is compatible with token-free requests. Coordinate any configuration change with the application release; otherwise users may be unable to sign in, register or request recovery. Hosted changes and deployment require separate approval.

Verify effective provider-wide sign-in, sign-up and email rate limits, trusted ingress and direct Auth endpoint coverage. The recovery limiter is process-local and does not provide a shared multi-instance limit. Record gaps and obtain the agreed mitigation before release.

Unit and fixture-backed browser tests do not establish hosted provider settings, real email delivery or protection against automated abuse. Verify login, registration and recovery with approved synthetic accounts in staging, and retain an authorized rollback plan.
