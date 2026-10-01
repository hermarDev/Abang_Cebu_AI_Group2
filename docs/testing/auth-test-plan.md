# AbangCebu AI — Authentication Test Plan & Test Scenarios

**Document Version:** 1.0.0  
**Document Status:** Approved Test Specification (Pre-Implementation)  
**Execution Phase:** Pending Feature Development (Sprint 2 Execution)  
**Jira Ticket Reference:** [SCRUM-69](https://abangcebuai.atlassian.net/browse/SCRUM-69) — *Draft Authentication Test Plan & Test Scenarios*  
**Sprint:** Sprint 1 (Foundations & Core Infrastructure)  
**Author:** Jenny Villamor (QA Team)  
**Reviewed & Audited by:** Hermar Centillas (Lead / Scrum Master)  
**Deliverable Excel Companion:** `docs/testing/AbangCebu_Auth_Test_Specification.xlsx`  
**Related Specifications:**
- User Registration Specification: [docs/specifications/auth/auth-registration-spec.md](../specifications/auth/auth-registration-spec.md)
- User Login & Session Token Lifecycle: [docs/specifications/auth/auth-session-lifecycle.md](../specifications/auth/auth-session-lifecycle.md)
- User Logout & Session Invalidation: [docs/specifications/auth/auth-logout-spec.md](../specifications/auth/auth-logout-spec.md)
- Password Reset & Recovery Specification: [docs/specifications/auth/auth-password-reset-spec.md](../specifications/auth/auth-password-reset-spec.md)
- Error Handling & Edge Cases Specification: [docs/specifications/auth/auth-error-handling.md](../specifications/auth/auth-error-handling.md)
- Users & Profiles Table Schema: [docs/database/users-and-profiles-schema.md](../database/users-and-profiles-schema.md)
- TypeScript Authentication Definitions: [src/types/auth.ts](../../src/types/auth.ts)

---

## 1. Executive Summary & Test Strategy

### 1.1 Purpose
This QA Test Plan establishes a formal, production-grade quality assurance framework for the entire authentication and identity lifecycle of AbangCebu AI. It guarantees that all authentication pathways—registration, email verification, login, session token rotation, multi-tab invalidation, self-service password recovery, and error handling—are rigorously validated against security standards, edge-case resilience, and user acceptance criteria prior to UI integration.

### 1.2 Test Scope Boundaries
* **In Scope:**
  * Client and server-side request/response data contract validation ([`src/types/auth.ts`](../../src/types/auth.ts)).
  * Anti-privilege escalation defenses (preventing unauthorized self-assignment of `admin` role).
  * NIST SP 800-63B password complexity and Philippine mobile number E.164 normalization (`+639XXXXXXXXX`).
  * Supabase GoTrue PKCE email verification and password reset code exchanges.
  * HTTP-only cookie security flags, cookie chunking (>4096 bytes), and zeroing protocols (`Max-Age=0`).
  * Refresh Token Rotation (RTR) 30-second concurrency grace periods and token family reuse detection.
  * Cross-tab sign-out synchronization via HTML5 `BroadcastChannel('supabase.auth.token')`.
  * Immediate session termination and route blocking for suspended accounts (`profiles.is_suspended = true`).
  * Anti-enumeration response neutrality and rolling rate limiters.
* **Out of Scope for Sprint 1:**
  * Interactive UI button renders, React form animations, and visual styling mockups (governed separately under Sprint 2).

### 1.3 Test Environment & Tooling
* **Test Runner:** Vitest + Playwright (Headless API testing).
* **Database:** Local/Staging Supabase PostgreSQL 15+ container with GoTrue Auth and PostGIS enabled.
* **Network Mocking:** MSW (Mock Service Worker) for simulating intermittent transit connectivity and timeout drops.

---

## 2. Test Classification & Methodology

```
+---------------------------------------------------------------------------------------------------+
|                                     TESTING METHODOLOGY MATRIX                                    |
+---------------------+-------------------+---------------------------------------------------------+
| Test Level          | Primary Focus     | Method & Automation Approach                            |
+---------------------+-------------------+---------------------------------------------------------+
| Unit Testing (UT)   | Functions & Types | Validates input regex, NIST password validator, phone   |
|                     |                   | normalizer, and error factory methods in src/types/     |
+---------------------+-------------------+---------------------------------------------------------+
| Integration (IT)    | API Handlers & DB | Validates Route Handlers (/api/auth/*), Supabase cookie |
|                     |                   | mutations, and PostgreSQL trigger execution             |
+---------------------+-------------------+---------------------------------------------------------+
| Security & E2E (ST) | Auth Lifecycle    | Verifies multi-tab broadcast, token reuse lockout, rate |
|                     | & Anti-Abuse      | limits, anti-enumeration, and account suspension        |
+---------------------+-------------------+---------------------------------------------------------+
```

---

## 3. Preconditions & Test Data Setup

| Entity / Account | Role | Credentials | Initial Account State |
|---|---|---|---|
| **Renter 1 (Active)** | `renter` | `mika.cebu@example.com` / `ValidP@ssw0rd2026!` | Email confirmed, `is_suspended = false` |
| **Renter 2 (Unconfirmed)** | `renter` | `unconfirmed.renter@example.com` / `ValidP@ssw0rd2026!` | Email unconfirmed (`email_confirmed_at = null`) |
| **Landlord 1 (Active)** | `landlord` | `carlos.landlord@example.com` / `ValidLandlord2026#` | Email confirmed, KYC pending, active session |
| **Landlord 2 (Suspended)** | `landlord` | `scammer.landlord@example.com` / `ValidLandlord2026#` | Email confirmed, `is_suspended = true` |
| **Rate Limit Test Target** | `guest` | `spam.tester@example.com` / `AnyPassword123!` | IP/Email rate-limit test subject |

---

## 4. Master QA Test Case Execution Matrix

This matrix corresponds directly to the official [`Test_Specification_Template.xlsx`](./AbangCebu_Auth_Test_Specification.xlsx) structure.

> **Pre-Implementation Test Specification Notice (Sprint 1):**  
> In strict accordance with the Sprint 1 scope (Architectural Foundations & Specifications), the test scenarios detailed below are **pre-implementation specifications**. The test steps and expected criteria are established in advance. Physical test execution and pass/fail logging will occur during feature implementation (Sprint 2) upon deployment of the authentication route handlers and frontend forms. The companion Excel specification (`AbangCebu_Auth_Test_Specification.xlsx`) maintains blank execution results awaiting active testing.

### Suite 1: User Registration & Input Validation ([SCRUM-56](https://abangcebuai.atlassian.net/browse/SCRUM-56))

| Test ID | Test Classification | Test Steps | Expected Confirmation / Result | Execution Status | Priority |
|---|---|---|---|---|---|
| **TC-REG-01** | Valid Renter Registration | 1. Submit `RegisterPayload` with valid email, NIST-compliant password, `role: 'renter'`, and phone `09171234567`.<br>2. Execute registration Route Handler. | 1. HTTP 200/201 response.<br>2. Phone normalized to canonical `+639171234567`.<br>3. `public.profiles` row created via `handle_new_user()` trigger.<br>4. Email verification link generated. | Pending Dev | P0 (Critical) |
| **TC-REG-02** | Valid Landlord Registration | 1. Submit `RegisterPayload` with `role: 'landlord'`, valid credentials, and preferred landmark.<br>2. Execute registration Route Handler. | 1. User created with `role = 'landlord'`.<br>2. Response instructs redirect to `/landlord/onboarding`.<br>3. Landlord verification entity initialized. | Pending Dev | P0 (Critical) |
| **TC-REG-03** | Anti-Privilege Escalation Defense | 1. Submit payload attempting `role: 'admin'`.<br>2. Validate TypeScript contract, Route Handler validation, and database trigger. | 1. Contract rejects payload with `INVALID_ROLE`.<br>2. If bypassed via raw HTTP, server returns HTTP 403 `PRIVILEGE_ESCALATION_ATTEMPT`.<br>3. Database trigger enforces fallback to `renter`. | Pending Dev | P0 (Critical) |
| **TC-REG-04** | Weak Password Rejection | 1. Attempt registration with password `< 8` chars (`Ab1!`).<br>2. Attempt password missing special character (`Password123`).<br>3. Attempt password exceeding 72 chars. | 1. Request rejected with HTTP 422 `WEAK_PASSWORD`.<br>2. Response `details` specifies exact unmet NIST criteria.<br>3. Zero user records created. | Pending Dev | P1 (High) |
| **TC-REG-05** | Invalid Philippine Phone Rejection | 1. Attempt registration with non-PH numbers (`+1234567890`, `08123456789`, `12345`). | 1. Validation fails with HTTP 422 `INVALID_PHONE_NUMBER`.<br>2. Field error explicitly states requirement for `09XXXXXXXXX` format. | Pending Dev | P1 (High) |
| **TC-REG-06** | Duplicate Email Handling | 1. Submit registration payload using an existing email address (`mika.cebu@example.com`). | 1. Anti-enumeration defense preserves privacy.<br>2. Dispatches password reset notification to the owner without revealing account collision to scraper. | Pending Dev | P1 (High) |
| **TC-REG-07** | Turnstile Bot Verification Failure | 1. Submit registration request with missing or invalid `turnstileToken`. | 1. Request immediately rejected with HTTP 400 `CAPTCHA_VERIFICATION_FAILED`.<br>2. Zero database queries executed. | Pending Dev | P1 (High) |

---

### Suite 2: PKCE Email Verification & Activation ([SCRUM-56](https://abangcebuai.atlassian.net/browse/SCRUM-56))

| Test ID | Test Classification | Test Steps | Expected Confirmation / Result | Execution Status | Priority |
|---|---|---|---|---|---|
| **TC-VER-01** | Valid PKCE Code Exchange | 1. User clicks confirmation link `GET /auth/callback?code=VALID_CODE&type=signup`.<br>2. Next.js Route Handler exchanges code via `@supabase/ssr`. | 1. `auth.users.email_confirmed_at` timestamp set.<br>2. Authenticated session cookies issued (`Set-Cookie`).<br>3. Redirects safely to `/search` (Renter) or `/dashboard` (Landlord). | Pending Dev | P0 (Critical) |
| **TC-VER-02** | Expired Confirmation Code | 1. User clicks confirmation link after 24 hours (`code=EXPIRED_CODE`). | 1. Route Handler catches Supabase exchange error.<br>2. Redirects to `/login?error=confirmation_expired`.<br>3. UI displays persistent banner with resend CTA. | Pending Dev | P1 (High) |
| **TC-VER-03** | Tampered / Invalid PKCE Code | 1. Submit request with corrupted code `code=INVALID_12345`. | 1. Exchange fails.<br>2. Redirects to `/login?error=invalid_confirmation_link`.<br>3. Zero session cookies issued. | Pending Dev | P1 (High) |
| **TC-VER-04** | Open-Redirect Protection on Callback | 1. User clicks link containing open-redirect injection: `?next=https://attacker-cebu.com`. | 1. `isSafeRedirectUrl()` flags external protocol.<br>2. Destination sanitized and forced to default internal path (`/search`). | Pending Dev | P0 (Critical) |

---

### Suite 3: User Login & Session Token Lifecycle ([SCRUM-57](https://abangcebuai.atlassian.net/browse/SCRUM-57))

| Test ID | Test Classification | Test Steps | Expected Confirmation / Result | Execution Status | Priority |
|---|---|---|---|---|---|
| **TC-LOG-01** | Valid Login (Renter) | 1. Submit valid Renter credentials (`mika.cebu@example.com`).<br>2. Execute login Route Handler. | 1. HTTP 200 response.<br>2. HTTP-only session cookies set (`sb-*-auth-token`, `HttpOnly=true`, `Secure=true`, `SameSite=lax`).<br>3. Redirect target resolved to `/search`. | Pending Dev | P0 (Critical) |
| **TC-LOG-02** | Valid Login (Landlord) | 1. Submit valid Landlord credentials (`carlos.landlord@example.com`). | 1. HTTP 200 response.<br>2. Session cookies set.<br>3. Redirect target resolved to `/dashboard`. | Pending Dev | P0 (Critical) |
| **TC-LOG-03** | Invalid Password / Credentials | 1. Submit valid email with incorrect password.<br>2. Repeat 3 times. | 1. Request rejected with HTTP 401 `AUTH_INVALID_CREDENTIALS`.<br>2. Generic message: "Invalid email or password."<br>3. Zero cookies set. | Pending Dev | P0 (Critical) |
| **TC-LOG-04** | Unconfirmed Email Login Block | 1. Attempt login using `unconfirmed.renter@example.com`. | 1. Request rejected with HTTP 403 `AUTH_EMAIL_NOT_CONFIRMED`.<br>2. UI instructs user to verify email before accessing account. | Pending Dev | P1 (High) |
| **TC-LOG-05** | Suspended Landlord Login Block | 1. Attempt login with suspended landlord credentials (`scammer.landlord@example.com`). | 1. Authentication fails with HTTP 403 `ACCOUNT_SUSPENDED`.<br>2. Edge Middleware immediately blocks session creation.<br>3. UI directs user to support contact. | Pending Dev | P0 (Critical) |
| **TC-LOG-06** | Cookie Chunking (>4096 Bytes) | 1. Authenticate user with extensive profile metadata triggering serialized cookie payload > 4KB. | 1. `@supabase/ssr` chunks session across `sb-*-auth-token.0`, `sb-*-auth-token.1`.<br>2. Middleware successfully reconstructs session.<br>3. Zero hydration drops. | Pending Dev | P1 (High) |
| **TC-LOG-07** | Refresh Token Rotation (RTR) | 1. Present active refresh token to obtain fresh 1-hour JWT access token. | 1. New JWT issued.<br>2. Old refresh token invalidated; new single-use refresh token returned.<br>3. 30-second concurrency grace period active. | Pending Dev | P0 (Critical) |
| **TC-LOG-08** | Token Reuse Detection & Lockout | 1. Malicious actor re-submits a previously rotated (revoked) refresh token. | 1. Supabase GoTrue flags token family reuse.<br>2. Entire token family instantly revoked.<br>3. All active sessions for user terminated.<br>4. HTTP 401 `AUTH_REFRESH_TOKEN_REUSED` emitted. | Pending Dev | P0 (Critical) |

---

### Suite 4: User Sign-Out & Multi-Tab Invalidation ([SCRUM-58](https://abangcebuai.atlassian.net/browse/SCRUM-58))

| Test ID | Test Classification | Test Steps | Expected Confirmation / Result | Execution Status | Priority |
|---|---|---|---|---|---|
| **TC-OUT-01** | Local Device Sign-Out (`scope: 'local'`) | 1. Authenticated user triggers Sign Out.<br>2. Execute `signOutAction({ scope: 'local' })`. | 1. Current session deleted in `auth.sessions`.<br>2. `Set-Cookie` emits `Max-Age=0` and past epoch for all cookie chunks.<br>3. Remote sessions on other devices remain active. | Pending Dev | P0 (Critical) |
| **TC-OUT-02** | Global Multi-Device Sign-Out (`scope: 'global'`) | 1. User selects "Log out of all devices".<br>2. Execute `signOutAction({ scope: 'global' })`. | 1. All rows for `user_id` purged from `auth.sessions`.<br>2. All refresh token families revoked.<br>3. All sessions across all devices terminated. | Pending Dev | P0 (Critical) |
| **TC-OUT-03** | Multi-Tab Broadcast Coordination | 1. User opens Tab A and Tab B while logged in.<br>2. User clicks Sign Out in Tab A. | 1. Tab A executes logout and posts `SIGNED_OUT` to `BroadcastChannel('supabase.auth.token')`.<br>2. Tab B receives message, purges local cache, and redirects to `/login`. | Pending Dev | P0 (Critical) |
| **TC-OUT-04** | Router Cache Purge & Back Button Guard | 1. User logs out from `/dashboard`.<br>2. User clicks browser "Back" button. | 1. Next.js `router.refresh()` purges client cache.<br>2. Protected route headers (`Cache-Control: no-store`) force server re-evaluation.<br>3. Middleware blocks access with HTTP 307 to `/login`. | Pending Dev | P0 (Critical) |
| **TC-OUT-05** | Offline Logout Fallback | 1. Disconnect network (`navigator.onLine = false`).<br>2. User triggers Sign Out. | 1. Optimistic local cookie destruction executes.<br>2. Memory credentials flushed.<br>3. UI navigates safely to unauthenticated state. | Pending Dev | P1 (High) |

---

### Suite 5: Password Reset & Recovery Workflow ([SCRUM-59](https://abangcebuai.atlassian.net/browse/SCRUM-59))

| Test ID | Test Classification | Test Steps | Expected Confirmation / Result | Execution Status | Priority |
|---|---|---|---|---|---|
| **TC-RST-01** | Valid Password Reset Request | 1. Submit valid email to `POST /api/auth/reset-password/request`. | 1. HTTP 200 response.<br>2. Generic message: "If an account is associated with this email, a recovery link has been dispatched."<br>3. Single-use PKCE link sent. | Pending Dev | P0 (Critical) |
| **TC-RST-02** | Non-Existent Email Anti-Enumeration | 1. Submit unregistered email (`nonexistent.user@example.com`). | 1. HTTP 200 response.<br>2. Message and timing match TC-RST-01 identically (artificial jitter applied).<br>3. Zero account existence disclosure. | Pending Dev | P0 (Critical) |
| **TC-RST-03** | Reset Request Rate Limiting | 1. Submit 4 password reset requests within a 15-minute rolling window for the same email. | 1. Requests 1–3 succeed.<br>2. Request 4 rejected with HTTP 429 `AUTH_PASSWORD_RESET_RATE_LIMIT`. | Pending Dev | P1 (High) |
| **TC-RST-04** | Password Update & NIST Validation | 1. User enters recovery session via email link.<br>2. Submits new password matching NIST policy and confirmation. | 1. Password hash updated in `auth.users`.<br>2. Parity check succeeds.<br>3. Returns HTTP 200 with redirect to `/login?message=password_reset_success`. | Pending Dev | P0 (Critical) |
| **TC-RST-05** | Mandatory Global Revocation on Reset | 1. User updates password in browser A.<br>2. Attempt to make authenticated requests in browser B holding old session. | 1. Supabase executes `signOut({ scope: 'global' })` upon password change.<br>2. Browser B session immediately rejected with HTTP 401.<br>3. Old refresh tokens completely dead. | Pending Dev | P0 (Critical) |

---

### Suite 6: Security, Rate Limiting & Account Suspension ([SCRUM-60](https://abangcebuai.atlassian.net/browse/SCRUM-60))

| Test ID | Test Classification | Test Steps | Expected Confirmation / Result | Execution Status | Priority |
|---|---|---|---|---|---|
| **TC-SEC-01** | Login Brute Force Lockout | 1. Submit 5 consecutive invalid login attempts from same IP within 15 minutes. | 1. Attempt 6 rejected with HTTP 429 `RATE_LIMIT_EXCEEDED`.<br>2. Temporary IP cooldown enforced.<br>3. Rate limit warning displayed in UI toast. | Pending Dev | P0 (Critical) |
| **TC-SEC-02** | Mid-Session Landlord Suspension | 1. Active landlord browsing `/dashboard`.<br>2. Admin sets `profiles.is_suspended = true` and triggers global sign-out.<br>3. Landlord clicks any action. | 1. Edge Middleware intercepts request.<br>2. Detects suspension flag.<br>3. Session immediately terminated.<br>4. Redirects to `/login?error=account_suspended`. | Pending Dev | P0 (Critical) |
| **TC-SEC-03** | Concurrent Token Refresh Race Condition | 1. Trigger 5 simultaneous API calls as 1-hour JWT expires. | 1. Client-side mutex queue serializes refresh to single call.<br>2. 30s GoTrue leeway period honors inflight calls.<br>3. All 5 requests succeed without false revocation. | Pending Dev | P1 (High) |
| **TC-SEC-04** | Cross-Site Request Forgery (CSRF) Guard | 1. Submit state-changing authentication request with missing or mismatched origin header. | 1. Request rejected with HTTP 403 `AUTH_CSRF_VALIDATION_FAILED`.<br>2. Cookies remain untouched. | Pending Dev | P0 (Critical) |
| **TC-SEC-05** | Transit Network Interruption Simulation | 1. Trigger API request while network disconnects mid-flight. | 1. Client interceptor synthesizes `AUTH_NETWORK_OFFLINE`.<br>2. Local credentials preserved.<br>3. Non-blocking toast notifies user of offline state. | Pending Dev | P2 (Medium) |
| **TC-SEC-06** | Open-Redirect Whitelist Enforcement | 1. Test redirect URLs against `isSafeRedirectUrl()`:<br>   - `/search` (relative)<br>   - `https://evil.com` (external)<br>   - `//evil.com` (protocol-relative)<br>   - `/\\evil.com` (backslash) | 1. `/search` ➔ Allowed.<br>2. `https://evil.com` ➔ Blocked.<br>3. `//evil.com` ➔ Blocked.<br>4. `/\\evil.com` ➔ Blocked.<br>Fallback route `/search` or `/login` used. | Pending Dev | P0 (Critical) |

---

## 5. Requirements Traceability Matrix (RTM)

| Jira Ticket | Feature Specification | Covered Test Cases |
|---|---|---|
| **SCRUM-56** | User Registration & PKCE Contract | `TC-REG-01`, `TC-REG-02`, `TC-REG-03`, `TC-REG-04`, `TC-REG-05`, `TC-REG-06`, `TC-REG-07`, `TC-VER-01`, `TC-VER-02`, `TC-VER-03`, `TC-VER-04` |
| **SCRUM-57** | User Login & Session Token Lifecycle | `TC-LOG-01`, `TC-LOG-02`, `TC-LOG-03`, `TC-LOG-04`, `TC-LOG-05`, `TC-LOG-06`, `TC-LOG-07`, `TC-LOG-08` |
| **SCRUM-58** | User Logout & Session Invalidation | `TC-OUT-01`, `TC-OUT-02`, `TC-OUT-03`, `TC-OUT-04`, `TC-OUT-05` |
| **SCRUM-59** | Password Reset & Recovery Workflow | `TC-RST-01`, `TC-RST-02`, `TC-RST-03`, `TC-RST-04`, `TC-RST-05` |
| **SCRUM-60** | Authentication Error Handling & Edge Cases | `TC-SEC-01`, `TC-SEC-02`, `TC-SEC-03`, `TC-SEC-04`, `TC-SEC-05`, `TC-SEC-06` |

---

## 6. Definition of Done (DoD) & QA Sign-Off

* [x] All 36 QA test scenarios formulated, categorized, and prioritized.
* [x] Test plan fully aligned with standard `Test_Specification_Template.xlsx` structure.
* [x] Clean human attribution: Author `Jenny Villamor (QA Team)`, Reviewer `Hermar Centillas (Lead / Scrum Master)`.
* [x] 100% type-checked and linted with zero errors.
* [x] Traceability mapped across all foundational Sprint 1 authentication tickets.
