# Unified Anti-Bot Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give renter and landlord registration automatic Cloudflare Turnstile protection through Supabase Auth, preserve email confirmation and access, and add a production-disabled on-device human-presence proof of concept.

**Architecture:** One reusable Turnstile widget supplies short-lived challenge tokens to registration, login, and recovery. Supabase Auth receives each token through `options.captchaToken` and performs the authoritative hosted verification; application code never consumes that same token locally. A separate `/liveness-poc` route demonstrates local MediaPipe-based camera interaction without storing frames or changing account state.

**Tech Stack:** Next.js 16, React 19, TypeScript, `@supabase/supabase-js`, Cloudflare Turnstile explicit API, Vitest, Playwright, MediaPipe Tasks Vision.

**Spec:** `docs/superpowers/specs/2026-11-12-anti-bot-verification-design.md`

## Global Constraints

- Both renter and landlord registrations must receive the same automatic anti-bot challenge.
- Supabase Auth must consume the provider-owned CAPTCHA token exactly once.
- Preserve registration validation, role allowlisting, email confirmation, Brevo path, anti-enumeration, and suspension checks.
- Do not persist CAPTCHA tokens, camera frames, recordings, face embeddings, or legal-identity status.
- Keep liveness isolated from login, registration acceptance, KYC, property verification, and account authorization.
- Use existing components and utilities; add no general-purpose abstraction.
- Do not change hosted Supabase, Cloudflare, Brevo, or production data in this branch.

## Review Focus

- Missing challenge must not reach Supabase `signUp`.
- A consumed or expired challenge must require a fresh challenge and must preserve entered form values.
- Landlord and renter payloads must use the same challenge path and both forward the token.
- Direct hosted provider enforcement must remain a separately verified production gate.
- Camera denial or model failure must never block ordinary registration.
- Liveness must never create or mutate a profile, verification record, or auth session.

---

### Task 1: Shared Turnstile widget

**Files:**
- Create: `src/components/auth/TurnstileWidget.tsx`
- Create: `src/components/auth/TurnstileWidget.test.tsx`

**Interfaces:**
- Produces: `TurnstileWidget({ onTokenChange: (token: string) => void; action: "signup" | "login" | "recovery"; resetKey?: number })`.
- Produces: `TurnstileWidget` clears the token on mount, expiry, timeout, error, reset, and unmount.

- [ ] **Step 1: Write failing widget tests**

Cover script reuse, token delivery, action forwarding, expiry/error clearing, reset behavior, unmount cleanup, late callback suppression, missing key, and script failure.

- [ ] **Step 2: Run widget tests and verify RED**

Run: `pnpm exec vitest run src/components/auth/TurnstileWidget.test.tsx`  
Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the minimal explicit-render widget**

Use the platform script and existing Tailwind tokens. Do not add a package dependency. Render an accessible status/alert region and use `size: "flexible"`.

- [ ] **Step 4: Run widget tests and verify GREEN**

Run: `pnpm exec vitest run src/components/auth/TurnstileWidget.test.tsx`  
Expected: PASS.

---

### Task 2: Registration challenge and provider forwarding

**Files:**
- Modify: `src/components/auth/RegisterForm.tsx`
- Modify: `src/components/auth/RegisterForm.test.tsx`
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/app/api/auth/register/route.test.ts`
- Modify: `src/types/auth.ts`
- Modify: `src/lib/auth/validation.ts`
- Modify: `src/lib/auth/validation.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `TurnstileWidget` from Task 1.
- Produces: registration payload field `turnstileToken?: string`.
- Produces: Supabase call `signUp({ email, password, options: { emailRedirectTo, data, captchaToken } })`.

- [ ] **Step 1: Write failing registration tests**

Assert that a configured public site key renders the widget, submit includes a token, missing token is blocked, every completed attempt resets the widget, both roles use the same path, the route forwards the token unchanged to Supabase, and invalid shape is rejected before provider contact.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm exec vitest run src/components/auth/RegisterForm.test.tsx src/app/api/auth/register/route.test.ts src/lib/auth/validation.test.ts`  
Expected: FAIL on missing token forwarding/widget behavior.

- [ ] **Step 3: Implement registration wiring**

Forward the token to Supabase; do not call the local siteverify helper in this request. Keep the existing neutral success response and rate limiter.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `pnpm exec vitest run src/components/auth/RegisterForm.test.tsx src/app/api/auth/register/route.test.ts src/lib/auth/validation.test.ts`  
Expected: PASS.

---

### Task 3: Login and recovery provider forwarding

**Files:**
- Modify: `src/components/auth/LoginForm.tsx`
- Modify: `src/components/auth/LoginForm.test.tsx`
- Modify: `src/components/auth/ResetPasswordForm.tsx`
- Modify: `src/components/auth/ResetPasswordForm.test.tsx`
- Modify: `src/lib/auth/sign-in.ts`
- Modify: `src/lib/auth/sign-in.test.ts`
- Modify: `src/app/api/auth/reset-password/request/route.ts`
- Modify: `src/app/api/auth/reset-password/request/route.test.ts`
- Modify: `src/server/turnstile.ts`
- Modify: `src/server/turnstile.test.ts`

**Interfaces:**
- Consumes: `TurnstileWidget` from Task 1.
- Produces: `signInWithEmail(email, password, captchaToken?)`.
- Produces: Supabase recovery call with `options.captchaToken`.

- [ ] **Step 1: Write failing login and recovery tests**

Assert the token reaches `signInWithPassword` and `resetPasswordForEmail`, missing tokens are blocked, tokens reset after failed attempts, and no auth request siteverifies the provider-owned token before forwarding it.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm exec vitest run src/components/auth/LoginForm.test.tsx src/components/auth/ResetPasswordForm.test.tsx src/lib/auth/sign-in.test.ts src/app/api/auth/reset-password/request/route.test.ts`  
Expected: FAIL on missing forwarding/widget behavior.

- [ ] **Step 3: Implement provider forwarding**

Remove application-side consumption of tokens that are forwarded to Supabase. Keep the existing provider error mapping, anti-enumeration, jitter, and rate limits.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the same focused command. Expected: PASS.

---

### Task 4: Isolated human-presence proof of concept

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/components/auth/LivenessProofOfConcept.tsx`
- Create: `src/components/auth/LivenessProofOfConcept.test.tsx`
- Create: `src/app/liveness-poc/page.tsx`
- Create: `src/app/liveness-poc/page.test.tsx`
- Create: `docs/audits/2026-11-12-human-presence-liveness-poc.md`

**Interfaces:**
- Produces: `LivenessProofOfConcept({ enabled: boolean })` with explicit start/stop and accessible status.
- Produces: no API route, profile write, verification write, or session mutation.

- [ ] **Step 1: Write failing POC tests**

Assert production is disabled, camera permission denial is recoverable, there is a non-camera explanation, no frames are uploaded, and the component exposes no account-verification grant.

- [ ] **Step 2: Run POC tests and verify RED**

Run: `pnpm exec vitest run src/components/auth/LivenessProofOfConcept.test.tsx src/app/liveness-poc/page.test.tsx`  
Expected: FAIL because the POC does not exist.

- [ ] **Step 3: Implement the smallest local-only POC**

Use `@mediapipe/tasks-vision` Face Landmarker in VIDEO mode with CPU fallback and randomized short challenges. Process frames locally, discard them, stop tracks on cleanup, and label results as experimental. Keep the route disabled in production.

- [ ] **Step 4: Run POC tests and verify GREEN**

Run the same focused command. Expected: PASS.

---

### Task 5: Browser, accessibility, and documentation verification

**Files:**
- Modify: `tests/auth-ui.spec.ts`
- Modify: `docs/login-turnstile.md`
- Modify: `README.md` only if the existing environment section must reference the new public site key.

**Interfaces:**
- Consumes: completed registration, login, recovery, and POC flows.
- Produces: browser evidence and accurate deployment gates.

- [ ] **Step 1: Write failing browser assertions**

Assert challenge elements render when configured, retry uses a fresh token, mobile/desktop layouts remain bounded, and light/dark themes remain readable.

- [ ] **Step 2: Run the browser test and verify RED**

Run: `pnpm exec playwright test tests/auth-ui.spec.ts`  
Expected: FAIL on the new challenge expectations.

- [ ] **Step 3: Update browser fixtures and documentation**

Mock the Turnstile script in browser fixtures, assert token forwarding, and document the hosted Supabase/Cloudflare/Brevo rollout and rollback sequence.

- [ ] **Step 4: Run the browser test and verify GREEN**

Run: `pnpm exec playwright test tests/auth-ui.spec.ts`  
Expected: PASS.

---

### Task 6: Full branch verification and review

**Files:**
- Review: all files changed by Tasks 1-5.

**Interfaces:**
- Produces: fresh local gate evidence and an honest hosted verification matrix.

- [ ] **Step 1: Run focused unit tests**

Run: `pnpm exec vitest run src/components/auth/TurnstileWidget.test.tsx src/components/auth/RegisterForm.test.tsx src/components/auth/LoginForm.test.tsx src/components/auth/ResetPasswordForm.test.tsx src/app/api/auth/register/route.test.ts src/app/api/auth/reset-password/request/route.test.ts src/lib/auth/sign-in.test.ts src/lib/auth/validation.test.ts src/components/auth/LivenessProofOfConcept.test.tsx src/app/liveness-poc/page.test.tsx`  
Expected: PASS.

- [ ] **Step 2: Run the full unit suite**

Run: `pnpm run test`  
Expected: PASS with zero failed tests.

- [ ] **Step 3: Run lint**

Run: `pnpm run lint`  
Expected: PASS with zero errors.

- [ ] **Step 4: Run the production build**

Run: `pnpm run build`  
Expected: exit 0 and all required routes generated.

- [ ] **Step 5: Run browser tests**

Run: `pnpm run test:e2e`  
Expected: PASS, or document unrelated environment failures separately.

- [ ] **Step 6: Inspect the complete diff and security boundaries**

Confirm no secret, token, camera frame, biometric artifact, production mutation, or unrelated change is present.

- [ ] **Step 7: Obtain independent security review**

Review CAPTCHA double-consumption, direct-provider bypass, role authorization, error leakage, token/log handling, camera privacy, accessibility, and production-disabled POC behavior.

- [ ] **Step 8: Commit scoped changes and push the feature branch**

Use one or more scoped commits. Verify the remote branch SHA. Do not merge or deploy.
