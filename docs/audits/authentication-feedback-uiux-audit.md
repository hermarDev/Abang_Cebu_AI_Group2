# Authentication feedback, UI/UX and error-handling audit

Audit date: 2026-11-06 (Asia/Manila)  
Repository: `/home/hrmr/abang-cebu-ai`  
Reviewed HEAD: `294bc63f9ed1530c8cc0deeb5a066ec61345f6ed`, branch `review/uncommitted-20261105`  
Scope: read-only source and test review, plus this report. Listing-related dirty files and an untracked `.superpowers/` directory were present; they are outside this audit. This snapshot is not evidence of the deployed release. Source references below are relative to the repository root and refer to the inspected working tree.

## 1. Executive summary

AbangCebu has an established feedback foundation: shared `Input`, `Button`, `FieldError`, warning `Alert`, and a global Sonner-based notification provider. Authentication uses these pieces but does not have a unified semantic form-error container. The login alert is neutral gray, announced as an alert, and appears after the fields. A restrained semantic error treatment would make failure easier to identify without treating gray itself as a demonstrated accessibility violation. Preserve the fixed, viewport-bounded modal dimensions; empty space alone does not establish a usability defect.

The highest-priority confirmed source defects are: login maps recognized provider failures to the wrong credential message; some invalid recovery configuration returns a generic success without attempting delivery; and a general recovery callback path does not set the marker required by reset confirmation. These findings describe code paths and preconditions, not measured production frequency. Provider abuse controls, live email, policies and end-to-end recovery were not tested.

Focused Vitest execution passed 80 tests across eight files. One exploratory browser check on the existing localhost server verified empty login field feedback and first-field focus. The server process belonged to this checkout, but its build provenance was not established; that browser observation is not evidence for the reviewed HEAD or a live provider. No real credentials, live login attempts, provider changes, app edits, or policy changes were made.

## 2. Scope and methodology

Inspected auth forms, Supabase sign-in and reset paths, feedback primitives, tokens, theme styling, test definitions, and relevant server validation and limits. Two independent read-only reviewers examined UI and security; their claims were checked against the target source before inclusion. Historical audit `docs/audits/validation-feedback-20261104/validation-feedback-audit.md` was used only as a lead: its findings about recovery password descriptions and error association have since changed in this tree.

Severity reflects potential user impact in the stated scenario, not deployment incidence. **Confirmed issue** means the cited source deterministically implements the described path, unless marked browser-observed. It does not mean live reproduction. **Potential issue** requires runtime/configuration evidence. **Already implemented** is source evidence unless otherwise stated. **Optional** is a recommendation, not a defect. WCAG checks are partial; no conformance claim is made.

## 3. Authentication architecture

- Login: `src/components/auth/LoginForm.tsx:13-71` validates and calls `signInWithEmail`; `src/lib/auth/sign-in.ts:16-88` creates the browser Supabase client, signs in, fetches the profile, handles suspension and role, and returns a safe message. Redirects pass through `getPostLoginRedirect` at `sign-in.ts:7-14` and `LoginForm.tsx:60-64`.
- Registration: `src/components/auth/RegisterForm.tsx` uses `/api/auth/register`; `src/app/api/auth/register/route.ts:49-99` validates and calls Supabase sign-up. The registration validator is `src/lib/auth/validation.ts:20-52`; password policy lives in `src/types/auth.ts`. Login contains no role selector; role selection is on registration.
- Recovery: `src/components/auth/ResetPasswordForm.tsx:31-78` calls request or confirmation APIs. Request validation and generic response are in `src/app/api/auth/reset-password/request/route.ts:61-125`; confirmation checks the recovery marker, user, session and recovery method in `src/app/api/auth/reset-password/confirm/route.ts:20-69`. The dedicated callback is `src/app/auth/reset-password/callback/route.ts:70-79`; a separate general callback is `src/app/auth/callback/route.ts:5-29`.
- Change password: `src/app/account/AccountSettingsForm.tsx:37-110` uses an account dialog; server-side verification and password handling are in `src/app/account/actions.ts:149-159` and surrounding action code.
- Dependencies: React 19, Next 16, Supabase SSR/client, Radix Dialog, Lucide and Sonner are declared in `package.json:17-32`. Validation is project-authored TypeScript rather than a separately declared schema library (`src/lib/auth/validation.ts:8-10,20-52`).

## 4. Feedback inventory and reuse

| Existing item | Actual usage/contract | Recommendation |
|---|---|---|
| `src/components/ui/Field.tsx:7-13` | `FieldError` gives destructive text; caller supplies association and role. Login uses it at `LoginForm.tsx:89-102,118-139`. | Reuse for correctable field errors. |
| `src/components/ui/Input.tsx:7-20` | Shared field, focus and invalid-border styling. | Reuse; preserve labels, autocomplete and associations. |
| `src/components/ui/Button.tsx:14-25,38-52` | Shared variants, disabled and minimum sizes. | Reuse for submit and pending state. |
| `src/components/ui/Alert.tsx:4-7` | Always `role=alert`, warning border/background; no semantic error variant. | Existing starting point, not an already available error variant. Extend only if approved and justified by actual consumers. |
| `src/components/ui/AppToaster.tsx:3-14`, `src/app/layout.tsx:40` | Global Sonner provider and `notify`, theme-aware, five durations. Account and favorites use notifications. | Use existing global notifier for suitable confirmed action feedback; do not duplicate inline/form errors in toasts. |
| `src/components/ui/Toast.tsx:7-44` | Separate limited primitive; `src/components/ui/examples.tsx:50-52` demonstrates it. | Do not introduce a second toast system; this inventory does not prove a production duplicate. |
| Login form alert | Local gray block, `role=alert` or `status`, `LoginForm.tsx:142-148`. | Keep persistent form-level failures near submit; make semantic distinction when approved. |

`src/app/globals.css:34-53,87-106,111-138` defines `--destructive`, `--destructive-foreground`, `--warning`, `--muted`, `--foreground`, `--border`, `--ring`, `--card`, plus explicit dark and OS-dark fallback values. There is no separately established subtle error-background token in those lines. A tinted surface could derive from existing tokens, subject to rendered contrast checks; do not introduce arbitrary hardcoded red colors. The shared warning alert should not simply be treated as an error alert without changing its contract.

## 5. Login UI/UX and layout

The modal is designed as a fixed-size shell across auth modes, with header, scrollable body and footer: `src/features/map/RestoredFinderShell.module.css:194-217`. It caps width at 30rem and height at 42.5rem, bounded by the dynamic viewport; narrow screens reduce horizontal padding. This can create empty space in short login content, but also avoids mode-switch jumps and keeps consistent geometry. No measured obscured action or excessive-space defect was established. Logo and close control are defined at `:198-201`; visible heading, email, password, primary action, registration and guest actions are wired through `src/components/auth/AccountAccessContent.tsx:18-27`, `LoginForm.tsx:73-169` and the surrounding shell. Forgot password is adjacent to the password label (`LoginForm.tsx:105-114`).

Input defaults, invalid border and focus outline are defined by `Input.tsx:13-17`; password uses icon-only Eye/EyeOff with accessible label and 44px minimum target (`LoginForm.tsx:130-137`). Inputs have email/current-password autocomplete (`:94-99,123-128`). Submit button is disabled with changed text while pending (`:151-153`); form uses a loading guard and `finally` (`:38-40,51-70`). Inputs do not become disabled during login; edits during a pending request and response correspondence need a mounted held-response test. Browser autofill appearance and actual focus/disabled contrast were not measured.

## 6. Gray versus semantic red

The current block uses `bg-muted text-foreground border-border`, with `role=alert` for error and `role=status` for non-error (`LoginForm.tsx:142-148`). It appears after password and before submit, so it is close to the action and does not incorrectly blame one field. Its conditional insertion changes form height; whether that causes disruptive movement, clipping or unreachable controls was not measured. Presence of an alert role does not prove a screen reader announces it.

- **Neutral gray:** readable if measured contrast is adequate and text is clear; visually resembles ordinary information and does not distinguish failure from status. Not inherently a WCAG failure.
- **Subtle semantic red:** recommended for authentication failures: restrained token-derived red border/tint and a decorative `CircleAlert` or equivalent, with neutral high-contrast text or a verified semantic error text color. The icon must not be the sole cue; the message and alert semantics remain. Measure text at least 4.5:1 for normal text and relevant non-text boundaries/icons at 3:1 where applicable, in both themes. Choose actual combinations from rendered values rather than assuming the tokens pass.
- **Strong red:** reserve for urgent/destructive or high-consequence situations; a routine rejected login does not justify visually dominant alarm styling. Do not apply destructive action button styling to the whole screen.

This is a design recommendation, not a confirmed contrast or compliance defect. Keep ordinary status/success visually and semantically distinct. Compare geometry and scroll reachability before/after, rather than reserving space blindly or redesigning the modal.

## 7. Severity-ranked findings and scenarios

### AF-01 — Medium — Recognized login failures are presented as bad credentials
**Classification:** Confirmed issue, source-level. **Component:** login and shared mapper. **Evidence:** `src/lib/auth/sign-in.ts:35-41` passes `fallbackMessage: "Invalid email or password."`; `src/lib/auth/auth-error.ts:22-38,97-125` chooses the supplied fallback before a recognized message. A returned unconfirmed-email, rate-limit or other mapped provider error therefore displays credential copy; a thrown error instead becomes a generic unavailable message (`sign-in.ts:23-33`). `src/lib/auth/sign-in.test.ts:75-90` covers invalid credentials but does not establish those other login cases.

**Expected:** map known safe error categories to accurate, non-enumerating and actionable form-level feedback; retain generic fallback for unknown provider failures. **Impact:** users can repeatedly change correct credentials instead of waiting or resolving an account issue. **Improvement:** correct fallback precedence or caller options without passing upstream text verbatim; review account-disclosure tradeoffs before exposing verification state. **Acceptance:** mocked known credentials, unconfirmed email, 429/rate limit, network rejection, generic service error and unknown error produce safe category-appropriate text; no raw provider details; retry works.

### AF-02 — Medium — Some invalid recovery configuration falsely indicates dispatch
**Classification:** Confirmed issue, source-level under misconfiguration. **Component:** recovery request API. **Evidence:** `src/app/api/auth/reset-password/request/route.ts:97-105,111-125`: malformed URL parsing or production non-HTTPS URL throws, but the catch returns 503 only for messages beginning `NEXT_PUBLIC_SITE_URL`. Those other errors fall through to generic HTTP 200 without calling the email provider. Provider failures are intentionally suppressed to avoid enumeration and require separate handling policy.

**Expected:** globally invalid recovery configuration yields a safe service-unavailable response, while account-specific responses remain non-enumerating. **Impact:** users wait for an email that could not have been dispatched. **Improvement:** classify configuration errors explicitly, without revealing configuration or account state. **Acceptance:** isolated tests cover missing, malformed and non-HTTPS production origins versus provider/account cases; no secrets or enumeration leak. Live provider behavior NOT RUN.

### AF-03 — Medium — General recovery callback lacks the confirmation marker
**Classification:** Confirmed source-level path incompatibility; actual use is unverified. **Component:** recovery callback. **Evidence:** `src/app/auth/callback/route.ts:14-25` exchanges a recovery code and redirects without setting the recovery cookie; `src/app/api/auth/reset-password/confirm/route.ts:26-30` rejects when that cookie is absent. The dedicated callback sets it at `src/app/auth/reset-password/callback/route.ts:70-79`. The application request path uses the dedicated callback (`request/route.ts:4,107-109`); this finding does not claim the normal generated path fails.

**Expected:** any supported recovery callback used to reach reset confirmation establishes the required trusted recovery state, or an unsupported legacy path fails clearly. **Impact:** users following a valid link configured to the general callback may be unable to complete recovery. **Improvement:** determine supported provider templates and unify or explicitly retire the path without weakening the confirmation checks. **Acceptance:** isolated callback-to-confirm tests for each supported route and rejection of ordinary sessions; verify live templates separately.

### AF-04 — Low — Recovery request uses native field feedback instead of the shared inline pattern
**Classification:** Confirmed source-level inconsistency; browser effect varies. **Component:** forgot password. **Evidence:** `src/components/auth/ResetPasswordForm.tsx:104,159-174` uses a required email field in a form without `noValidate` and has no project inline error association; login uses its own errors and `aria-describedby` (`LoginForm.tsx:38-49,89-102`). **Expected:** required/format errors should be clear, field-associated and recoverable consistently. **Impact:** browser-specific messages and inconsistent presentation; this is not by itself proof of an accessibility failure. **Improvement:** evaluate reuse of `FieldError` while preserving server validation. **Acceptance:** mounted empty, malformed, corrected and submitted recovery email tests across supported browsers and keyboard navigation.

### AF-05 — Low — Login form-level error remains visible during editing
**Classification:** Confirmed source-level state behavior, UX impact requires observation. **Component:** login. **Evidence:** status is cleared on valid submit (`LoginForm.tsx:38-52`); input change handlers at `:97,126` revalidate field errors but do not clear status. After a failed login, editing either input leaves the earlier message until the next valid submission. **Expected:** feedback should not misleadingly describe newly edited values; preserve useful failure context until a deliberate correction strategy. **Impact:** potentially stale feedback. **Improvement:** agree on clear-on-edit or explicit stale-state behavior; retain values and do not hide pending errors prematurely. **Acceptance:** mounted failure, edit, invalid resubmit, valid retry and successful response checks, including focus and announcements.

### AF-06 — Low — Feedback primitives have overlapping but unequal contracts
**Classification:** Confirmed architecture inconsistency; user-facing defect not established. **Component:** shared UI. **Evidence:** warning-only `Alert.tsx:4-7`, standalone `Toast.tsx:7-44`, global Sonner `AppToaster.tsx:3-14`, and local login alert `LoginForm.tsx:142-148`. **Expected:** documented distinction between field, persistent form and transient global feedback. **Impact:** future flows can diverge in color, timing and semantics. **Improvement:** document and reuse existing pieces; add only the missing semantic behavior required by approved changes, not a parallel framework. **Acceptance:** audit real callers, test error/status variants in themes and ensure no duplicated error toasts.

### AF-07 — Medium — Rate-limit effectiveness depends on deployment controls
**Classification:** Potential security/operational risk, not a confirmed vulnerability. **Component:** registration, recovery and direct Supabase login. **Evidence:** `src/app/api/auth/register/route.ts:11-15,33-44` and `src/app/api/auth/reset-password/request/route.ts:12-17,36-48` use in-memory process-local limits and accept `cf-connecting-ip`; they do not alone coordinate instances or cover direct provider requests. Missing production IP fails closed. Login calls Supabase directly (`sign-in.ts:16-27`). **Expected:** trusted proxy identity and effective distributed/provider abuse controls. **Impact if absent:** limits can be bypassed across instances, direct provider calls or untrusted origins; availability can also suffer if required headers are missing. **Improvement:** verify actual ingress, direct-origin restrictions and provider controls before selecting a shared/edge mechanism. **Acceptance:** authorized isolated tests of normalized identity, thresholds and windows, trusted header handling, cross-instance and direct-provider protections. No live attack or configuration inspection was performed.

### AF-08 — Medium — Registration redirect depends on request origin
**Classification:** Potential security risk; exploitability unverified. **Component:** signup callback. **Evidence:** `src/app/api/auth/register/route.ts:73-80` constructs the email callback from `new URL(request.url).origin`; recovery uses a configured origin (`request/route.ts:97-109`). **Expected:** callback destinations are constrained to authorized origins. **Impact if the deployment accepts an attacker-controlled host and the provider permits that redirect:** malicious callback links may be generated. **Improvement:** verify ingress and provider allowlist; consider a validated canonical origin without breaking preview environments. **Acceptance:** isolated allowed/disallowed Host/origin tests and provider redirect policy review; do not claim exploitation without evidence.

### AF-09 — Medium — Suspension enforcement coverage is not established
**Classification:** Potential security risk, not a demonstrated bypass. **Component:** profile authorization. **Evidence:** `src/lib/auth/sign-in.ts:45-76` reads suspension after Supabase sign-in and locally signs out suspended users. Client-side checks are not server authorization. Other server routes may enforce their own checks, but this audit did not establish coverage across every operation or effective database policy. **Expected:** all protected operations enforce applicable account status server-side or through RLS. **Impact if absent:** a suspended identity with a valid provider session may access an insufficiently guarded resource. **Improvement:** inventory server routes, RPCs and actual RLS before changing behavior. **Acceptance:** controlled allowed/suspended direct API and database-policy tests with authorized synthetic identities.

### AF-10 — Low — Mode-switch and success focus require mounted verification
**Classification:** Potential issue. **Component:** recovery and registration. **Evidence:** `src/components/auth/AccountAccessContent.tsx:18-27` replaces controls when switching reset/login; registration replaces form after success (`src/components/auth/RegisterForm.tsx:133-144`). The source does not itself establish where browser focus lands or whether a screen reader announces status. **Expected:** keyboard focus and announcement remain meaningful after each transition. **Impact if lost:** keyboard and assistive-technology users may lose their place. **Improvement:** test actual focus before changing the existing modal. **Acceptance:** keyboard-only direct, footer, recovery, back and mocked success handoffs, with screen-reader checks and focus return after close.

## 8. Validation, loading, retry and redirect matrix

| Scenario | Source-level result | Verification and gap |
|---|---|---|
| Empty email/password | Separate required messages, invalid associations and focus first invalid (`LoginForm.tsx:38-49,89-102,118-139`). | Local existing-server browser showed both messages, `aria-invalid=true` and email focus; build provenance unverified. |
| Invalid email | Local regex and field error (`LoginForm.tsx:35,42-49`). | Focused suite passed; real browser correction not independently run. |
| Wrong credentials | Generic message, form alert (`sign-in.ts:35-42`; `LoginForm.tsx:54-58,142-148`). | Provider response and retry not independently exercised live; AF-01 covers overbroad fallback. |
| Network/service failure | Thrown sign-in returns safe temporary-unavailable text (`sign-in.ts:23-33`); returned provider errors may be mislabeled as credentials (AF-01). | No live service disruption test. |
| Too many attempts | Mapper contains rate-related mapping (`auth-error.ts:55-62,114-115`) but login fallback overrides its message (AF-01). | Effective provider limit NOT VERIFIED. |
| Pending | `loading` guard, disabled submit and text, `finally` reset (`LoginForm.tsx:38-40,51-70,151-153`). | An accessible live announcement, concurrency across rapid events, editable fields and held-response behavior need mounted tests. |
| Retry/correction | Field errors revalidate after submit (`LoginForm.tsx:97,126`); credentials remain in component state after failure; form error cleared only at next valid submission. | No actual provider retry run. Password retention is observed in source, not a separately approved security policy. |
| Successful login | Profile role checked, callback, safe redirect helper and `router.replace/refresh` (`sign-in.ts:7-14,45-76`; `LoginForm.tsx:60-64`). Landlord home/map redirection intentionally targets workspace. | Intended safe redirect, modal close and session behavior need mounted and authorized live verification; not established by source alone. |
| Reset/change | Recovery matches and server validates; password requirements and errors are now associated (`ResetPasswordForm.tsx:39-43,55-59,107-156`). Change password has touched/error state and pending status (`AccountSettingsForm.tsx:37-110`). | Live email, recovery authorization, wrong-current-password and successful mutation NOT RUN. |

## 9. Theme and accessibility

Light/dark/OS-fallback tokens are present (`src/app/globals.css:10-53,65-107,111-139`); `src/features/map/useFinderTheme.ts` and `src/components/ui/AppToaster.tsx:12-14` connect theme state to the notifier. Token existence is not measured contrast. No automated contrast measurement, color-blindness review, actual autofill visual check, zoom/reflow test, physical-device test or screen-reader run was completed.

Positive source controls: persistent field labels; `aria-invalid` and `aria-describedby` for login (`LoginForm.tsx:84-102,105-139`); role alert/status (`:142-148`); Eye/EyeOff accessible names and minimum 44px hit target (`:130-137`); autocomplete; dynamic viewport sizing and scroll (`RestoredFinderShell.module.css:194-217`); Radix modal primitive and focus restoration code (`src/components/ui/Modal.tsx:28-45`). These are implementations, not proof of WCAG 2.2 AA conformance. Forgot-password link/button is text-sized (`LoginForm.tsx:110-114`); its actual hitbox and WCAG 2.2 target-size exceptions must be measured, not inferred from the password toggle. Reduced-motion behavior of relevant app/theme transitions and real keyboard trapping/return need direct testing.

## 10. Security observations

The sign-in path does not display raw Supabase messages on failure; recognized bad-credential copy is intentionally generic (`sign-in.ts:35-42`). Registration checks allowed roles and server fields (`validation.ts:20-52`), and generic signup acceptance avoids directly confirming existing accounts (`register/route.ts:7-10,83-96`). Reset request similarly uses a generic success (`request/route.ts:7-10,111-125`), which is a deliberate privacy tradeoff but must not mask deterministic configuration errors (AF-02). Confirmation checks recovery cookie, verified user/session and recovery authentication method (`confirm/route.ts:26-50`). Redirects are checked by `isSafeRedirectUrl` at login/callback. These controls have not been independently validated against actual provider configuration or all direct endpoints.

No confirmed exploitable security vulnerability is asserted by this audit. AF-07 through AF-09 require environmental evidence. Do not test credentials, brute force, change hosted policies or remove identity/authorization checks as part of fixing presentation.

## 11. Recommended sequence and acceptance criteria

1. **Correct feedback truthfulness first:** reproduce AF-01 with synthetic provider errors; adjust only safe mapping, keeping unknown details private. Add field/form recovery and pending tests.
2. **Repair recovery reliability:** classify deterministic config failures without account enumeration (AF-02); decide supported callback paths and test the complete callback-to-confirm contract (AF-03). Keep recovery authorization intact.
3. **Verify operational protections:** assess trusted proxy, distributed and provider-side limiting, signup redirect allowlist and suspension/RLS coverage (AF-07–09). Treat deployment changes as separately authorized work.
4. **Unify interaction and presentation:** after approval, reuse `FieldError`, `Input`, `Button`, existing theme tokens and global Sonner where appropriate. Add a restrained semantic persistent form-error presentation, not duplicate toast messages. Address AF-04–06 only against observed interaction needs.
5. **Verify accessibility and responsive behavior:** keyboard mode switches, focus return, status announcements, reduced motion, zoom and reflow, short and narrow views, target sizes, real autofill, computed contrast in both themes and actual error layout movement. Keep equal bounded modal dimensions unless a measured usability issue justifies a different design.

Release acceptance for this scope requires documented behavior for every matrix row, source-backed and mounted browser tests for failure/retry/redirect, light/dark contrast measurements, keyboard and assistive-technology checks, plus separately authorized provider and deployment verification. A green unit suite does not satisfy these gates by itself.

## 12. Tests and evidence

- **PASS — focused unit/component tests:** `pnpm exec vitest run src/components/auth/LoginForm.test.tsx src/components/auth/LoginTurnstile.test.tsx src/components/auth/RegisterForm.test.tsx src/components/auth/ResetPasswordForm.test.tsx src/lib/auth/sign-in.test.ts src/lib/auth/auth-error.test.ts src/lib/auth/validation.test.ts src/lib/auth/password-reset-validation.test.ts` — exit 0, 8 files, 80 tests passed. Vitest config uses Node environment (`vitest.config.ts:4-7`); these are not live-provider E2E evidence.
- **OBSERVED, limited browser smoke:** existing `http://localhost:3000` server had PID 543924 and cwd `/home/hrmr/abang-cebu-ai`. Browser navigated `/login`, which displayed the map, opened account access, and submitted empty login. Both inline messages appeared; email and password had `aria-invalid=true` with described-by IDs; email received focus. Viewport 780×437. Server build/version provenance was not established; this observation is not attributed to the reviewed commit. No credentials were submitted.
- **BLOCKED/NOT RUN — focus handoff browser probe:** attempted an exploratory DOM-driven recovery focus check; element lookup failed before the interaction. No conclusion about actual focus follows.
- **NOT RUN:** Playwright suites, full lint/typecheck/build, desktop/mobile theme matrix, network/service/rate fault injections in a mounted app, screen readers, measured contrast, physical devices, live authentication/email and deployed infrastructure/provider/RLS checks. `tests/auth-ui.spec.ts:3-45,58-127` defines bounded viewport/theme and mocked failure/retry coverage; definitions are not execution evidence. `tests/validation-recovery.spec.ts` also contains recovery interaction tests, not run in this audit.

## 13. Open questions and residual risks

1. Which origin/build is the actual review target, and is its server artifact identical to this source snapshot?
2. Are provider redirect templates using only the dedicated recovery callback, or can older links reach the general callback?
3. What are the real provider rate limits, direct-auth controls, allowed redirect URLs, ingress trust boundaries and effective RLS/suspension policies?
4. Should recognized unconfirmed-email copy be shown given the intended account-enumeration threat model?
5. Does the neutral alert or a proposed token-derived tint meet contrast requirements when actually rendered in both themes and autofill states? Does alert insertion cause significant movement in the fixed modal?
6. Do recovery and registration success transitions preserve meaningful focus and screen-reader announcements? Are all controls reachable at short viewport heights and high zoom?
7. Does the provider return network/service/rate-limit conditions as thrown exceptions or returned error objects in the configured deployment? Both contracts need isolated tests.

## 14. Final recommendation

Prioritize truthful login error mapping and reliable recovery paths before visual polish. Retain persistent form-level errors, associated inline field errors and the existing global notification system for appropriate action feedback. Recommend a subtle semantic red error treatment with an icon and accessible text, but do not call the current gray block inaccessible without measured evidence. Approve a separate implementation plan before changing application code. This audit does not establish full WCAG compliance, deployed security, or live end-to-end authentication.
