# Validation and feedback audit

Snapshot: 2026-11-04, `/home/hrmr/abang-cebu-ai`, HEAD `389c5c6e962016f08e90eaca7a51957f68819d54` plus 28 modified tracked files and numerous untracked files. This is a local mixed candidate, not a release, commit, or deployment. The landlord, admin, listing-preview and property-draft files cited below are untracked. Source evidence is not proof of runtime or effective hosted controls. Working-tree state and line numbers must be rechecked before implementation.

Scope limitation: browser interaction, mounted accessibility checks, unit/E2E runs, actual persistence, email delivery, hosted Supabase policy and external provider execution were NOT RUN under the user's authorization. Static source evidence is explicitly distinguished from demonstrated browser failures. The independent security reviewer inspected a separate worktree; its claims were adjudicated against this checkout rather than treated as verification. See [tests](validation-e2e-test-matrix.md), [copy](error-message-inventory.md), [matrix](feedback-component-matrix.md), [libraries](ui-library-architecture-audit.md), and [roadmap](validation-error-handling-plan.md).

## Executive summary

The application already has composable UI primitives, field associations in login/registration, explicit expected-user guards in favorites and property drafts, non-enumerating signup/recovery messaging, and explicit loading and error states. Its feedback is not yet a coherent system: field validation timing differs, a recovery form returns field failures as form-level messages, and assistant configuration failures expose operator-oriented text to end users. The listing wizard is explicitly a local preview, not an operational listing submission.

## Confirmed source-level findings

Severity reflects user impact, not demonstrated production incidence. Every interactive reproduction below is a proposed verification procedure, NOT an executed test.

### VF-01 — P2 — Login and registration errors do not update on correction

- Evidence: `src/components/auth/LoginForm.tsx:33-45,89-99,115-136` and `src/components/auth/RegisterForm.tsx:27,48-60,148-155,171-178,194-202`. Invalid submit sets `fieldErrors`; the cited change handlers update only values, not errors. The next submit clears or replaces errors. Existing registration test `src/components/auth/RegisterForm.test.tsx:80-100` asserts associations and retained values after invalid submit, not correction.
- Reproduction to run: enter invalid email, submit, correct the email without resubmitting. Expected: after meaningful interaction the relevant error and invalid state reflect the corrected value; current source leaves previous state until next submission. User impact: contradictory feedback and inaccurate programmatic invalid state. Browser behavior NOT RUN.
- Proposed: revalidate only touched/previously submitted fields on change and suitable blur; retain untouched state, server validation and entered values. Do not introduce toasts for field errors. Test login and registration correction and server-field errors, including accessible association and no premature messages.

### VF-02 — P2 — Weak recovery password is not mapped to its input

- Evidence: `src/components/auth/ResetPasswordForm.tsx:29-53,98-117` sends matching passwords without checking the shared class rule locally; the server returns `WEAK_PASSWORD` and “Choose a stronger password.” in `src/app/api/auth/reset-password/confirm/route.ts:20-24`. The form puts the returned message in the top-level banner (`ResetPasswordForm.tsx:89-93`) and the new password control has no error association (`:101-117`). Matching and length checks do not enforce the class policy.
- Reproduction to run: with a valid recovery session, enter the same length-valid but policy-invalid password twice; submit. Expected: policy error directly associated with new password, input retained; source routes server error to the general banner. Browser and provider NOT RUN.
- Proposed: map the server code to the field, retain a general fallback for unrecognized errors, keep `aria-describedby` linking policy and error. Test policy-invalid matching input and recovery/server failure without leaking session information.

### VF-03 — P2 — Assistant exposes operator-specific configuration guidance

- Evidence: `src/app/api/assistant/route.ts:126-128,158-168` returns provider name, environment variable names, configuration and restart instructions on missing configuration/upstream errors. `src/features/map/FinderAssistant.tsx:528-553,606` displays returned `error` to end users. The path does not expose a key value in the cited response, but exposes internal operational details and unactionable instructions.
- Reproduction to run: in an isolated configured test, simulate missing configuration and provider 400/401/403/404/429; submit a message. Expected: safe, concise user-facing unavailable/rate-limit guidance, with redacted diagnostic detail server-side. Source maps operator messages to the displayed alert. External call NOT RUN.
- Proposed copy: “The assistant is temporarily unavailable. Please try again later.” Use rate-limit-specific “The assistant is busy. Please try again later.” Preserve useful server diagnostics without keys or message contents. Verify every upstream status and no secret in response/logs.

### VF-04 — P2 — Recovery help does not programmatically describe new-password field

- Evidence: `src/components/auth/ResetPasswordForm.tsx:98-117`: visible password policy text has no id and the input has no `aria-describedby`; compare registration's policy association `src/components/auth/RegisterForm.tsx:187-213`.
- Reproduction to run: focus the new-password field using a screen reader. Expected: field label and password requirement available as its accessible description; source lacks the link. Screen-reader/browser test NOT RUN.
- Proposed: give existing policy a stable id and reference it, preserving both policy and applicable error IDs. Test DOM accessible description and manual assistive technology.

### VF-05 — P3 — Primitive documentation misidentifies dialog implementation

- Evidence: `src/components/ui/README.md:24` says native `<dialog>` supplies modal behavior, while `src/components/ui/Modal.tsx:3-4,27-34` uses Radix `Dialog`. Expected: documentation matches the actual dependency and its focus/close contract. This is a source-documentation mismatch, not proof focus handling fails.
- Proposed: correct documentation when the component is next touched; test direct and menu-to-modal focus restoration. Do not change modal behavior based on documentation alone.

## Risks requiring reproduction or configuration evidence

- R-01, P2 candidate: `src/app/list-property/ListPropertyForm.tsx:174-180` uses a sticky bottom action bar and `src/features/landlord/LandlordMobileNav.tsx:22-25` uses a fixed higher-z mobile bar; actual overlap and hit-testing are NOT RUN. Do not assume `bottom-0` alone establishes obstruction; measure at short/narrow viewports and scroll positions before adjusting geometry.
- R-02, P2 candidate: registration success replaces the form (`src/components/auth/RegisterForm.tsx:123-134`); whether focus is lost and whether live status announcement is sufficient require mounted keyboard/AT checks.
- R-03, P1 candidate: avatar upload uses a new object followed by a profile update and deletes the new object if update reports failure (`src/app/account/actions.ts:85-103`). A lost database response after a committed update may produce ambiguous association; confirmation depends on provider behavior and requires a controlled fault-injection test. Do not label a deletion or data loss as observed.
- R-04, P2 security/operations: registration and reset limit maps are process-local and use an ingress-derived header (`src/app/api/auth/register/route.ts:11-15,33-44`; `src/app/api/auth/reset-password/request/route.ts:12-17,36-48`). Actual ingress trust, distributed limits and direct-provider protections are NOT VERIFIED. Do not assume a particular deployment or substitute a new cache without a verified threat model.
- R-05, P2 candidate: preview uses native constraint bubbles and notices (`src/app/list-property/ListPropertyForm.tsx:37-50,104-110,136,150`), not the requested consistent field error convention. Whether opacity-zero file controls are focusable, native validation actually fails, and contrast/overlap are browser-dependent and NOT RUN. Do not present a hypothetical browser console message as observed.
- R-06, P2 candidate: `src/components/ui/Toast.tsx:23-44` has a fixed five-second timer and no built-in close, pause or stacking management. Search found its only JSX consumer in `src/components/ui/examples.tsx:50`; this is an unused/limited primitive, not proof production toasts fail or a WCAG violation. Evaluate if a real use case is added.
- R-07, P2 candidate: `src/components/ui/Modal.tsx:36-43` prioritizes a connected original trigger over a custom close-focus callback. Whether a particular caller needs the callback while the trigger remains connected is unverified; test both direct and menu handoffs before changing it.
- R-08, P2 candidate: profile form receives a single server message (`src/app/account/actions.ts:31-47`, `src/app/account/AccountSettingsForm.tsx:30-31,232-241`); inspect all submit paths and run server validation failure with preserved values to determine whether the right field can be identified and associated.
- R-09, P2 candidate: `src/types/auth.ts:500-511,571-595` enforces 8–72 characters and 3 of 4 classes. NIST SP 800-63B-4 recommends against composition rules in its applicable digital identity context; current provider policy, organizational obligations, migration compatibility and breach screening are unknown. Review and approve a coordinated policy change rather than relax only the client.

No P0 or P1 defect has been established by this limited static audit. Absence of confirmed findings is not proof of security or production readiness.

## Workflow inventory and existing strengths

| Workflow | Source-level observed behavior and coverage boundary |
|---|---|
| Login | `src/components/auth/LoginForm.tsx:36-67,79-148`: validates required email/password on submit, focuses first invalid, guards pending, maps sign-in error, routes after success. Login has no role choice; registration does. `src/components/auth/LoginForm.test.tsx:10-54` is primarily rendered markup, not live auth. |
| Registration/verification | `RegisterForm.tsx:48-91,103-132` validates and submits, radio intent, pending, safe conditional email success. `src/app/api/auth/register/route.ts:49-98` validates server-side and returns generic acceptance for already registered. Actual mail/provider NOT RUN. |
| Forgot/reset | `ResetPasswordForm.tsx:29-67` request and confirm; `src/app/api/auth/reset-password/request/route.ts:61-125` generic response suppresses provider result; `confirm/route.ts:20-69` requires recovery marker, verified user/claims and updates then attempts global revocation. Revocation failure explicitly says password changed (`:57-60`). Live recovery NOT RUN. |
| Logout | `src/app/auth/logout/page.tsx`, `src/app/api/logout/route.ts`, `src/lib/auth/logout.ts` provide distinct logout paths; provider revocation/session persistence and error recovery NOT RUN. |
| Profile/password/avatar | `src/app/account/AccountSettingsForm.tsx` and `src/app/account/actions.ts:31-159`: server validates profile and current password; avatar upload/delete uses privileged storage after session verification. Actual reauthentication and persistence NOT RUN. Account deletion not established by inspected routes. |
| Listing wizard and drafts | `src/app/list-property/page.tsx:11-28` landlord gate, preview notice; `ListPropertyForm.tsx:170-180` states no save/submission and disables final submission. `src/app/api/property-drafts/route.ts:8-19,32-61` separate draft API requires matching user header and active landlord; no claim that wizard calls it. Publish/edit/delete/image upload production journeys not established. |
| Landlord dashboard/map | `src/app/landlord/dashboard/page.tsx:11-30,63-73` verifies role, queries own listings, displays error or empty, uses unknown rather than zero for unavailable review metrics. `src/features/landlord/LandlordPropertyMap.tsx` has map status handling; interactive/mobile checks NOT RUN. |
| Admin | `src/app/admin/dashboard/page.tsx:7-24`: verifies user and admin profile; listing and identity review explicitly unavailable. Do not treat UI as working moderation. |
| Saved rentals | `src/app/favorites/SavedRentalsContent.tsx:51-117,145-160`: abortable load, retry, preserves loaded list on remove error, updates UI after HTTP success. `src/app/api/favorites/route.ts:6-31,98-145` verifies identity/role and expected-user header. Persistence and RLS NOT RUN. |
| Search/filter/map | `src/features/rentals/RentalFilterDialog.tsx:81-108,149-151`: bounded radius/budget, associated descriptions, empty state and disabled invalid apply. `src/features/map/RestoredFinderShell.tsx:289` exposes error/recovery. Full keyboard/mobile/map-provider behavior NOT RUN. |
| Assistant/chat | `src/features/map/FinderAssistant.tsx:294-322,410-553,582-606` has separate saved-chat, delete, reply and error paths. `src/app/api/assistant/route.ts:81-128` checks expected owner and validates message shape/limits. End-to-end, persistence, concurrency and provider quota NOT RUN. |
| Preferences | `src/features/map/useFinderTheme.ts` and `AppearanceControls.tsx` implement appearance state; `tests/theme.spec.ts` exists. Browser persistence/contrast NOT RUN. |
| Inquiries, user notifications, account deletion | Not established by inspected route inventory; do not call these implemented or failed. Further source enumeration needed before asserting global absence. |

## Independent review adjudication

Designer identified stale validation and missing recovery description; source checked above. Its claims of actual mobile occlusion, file-input browser failure, screen-reader nonannouncement and WCAG violations were not demonstrated and remain risks. Its statement that all controls universally meet touch targets was not independently measured. Security reviewed another worktree; its “PASS” claims do not prove controls in this dirty checkout or deployed database. We verified selected guards and process-local limit source only; no effective RLS, trigger ordering, CSRF, storage race or vulnerability was tested. Do not assume unique avatar paths make the operation idempotent. QA and architecture review are recorded in the other reports when available.
