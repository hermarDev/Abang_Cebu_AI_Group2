# SCRUM-165 — Modules 3, 4 and 5 test plans

Status: planning only. No test execution, QA decision, staging validation, or production validation is represented here. All workbook cases start at `NOT RUN`.

## Traceability and scope

| Module | Source | Plan coverage | External dependency / decision gate |
|---|---|---|---|
| 3 — Landlord listing management | SCRUM-125; SCRUM-54/55/63; `docs/specifications/listings/landlord-listing-management-spec.md`; `docs/specifications/listings/landlord-listing-review-outcome-spec.md`; database ERD and RLS policy docs | Owner-scoped create/edit, draft/save versus submit, validation, approved/available discovery, media privacy, moderation handoff and persisted outcomes | Confirm supported property status/draft representation, required fields, media policy, supported transitions, and schema/RLS contract. Do not invent states or validation policies. |
| 4 — Admin KYC and listing moderation | SCRUM-126; SCRUM-55/63; `docs/specifications/moderation/admin-verification-moderation-spec.md`; `docs/flowcharts/admin-kyc-review.drawio`; `docs/flowcharts/admin-listing-moderation.drawio` | Admin-only queue, KYC privacy, reasoned decisions, reviewer/time evidence, pending snapshot, atomic audit, duplicate/concurrent decisions and fail-closed policy cases | Confirm exact admin role, KYC schema/storage, audit contract, decision atomicity, notification behavior and explicitly approved report/appeal/escalation/suspension rules. |
| 5 — Renter engagement | SCRUM-127; SCRUM-121; SCRUM-61/62/74; `docs/specifications/renter/renter-engagement-spec.md`; favorite/contact/inquiry flows; database ERD/RLS | Guest-to-auth intent, owner-only favorites, approved listing eligibility, minimum-data contact, inquiry ownership, request versus confirmed appointment and retry/privacy | Reconcile `saved_listings` vs `saved_properties`; `inquiries` vs `viewing_appointments`; contact eligibility, appointment lifecycle, rate/idempotency and notification policies. |

| SCRUM-125 acceptance criterion | Planned case(s) | Coverage state |
|---|---|---|
| AC1 — trace Module 3 scope to persona, schema/RLS, and map docs without conflict | M3-A1 | NOT EXECUTED; source review required |
| AC2 — happy/invalid/save-resubmit/ownership/admin handoff paths | M3-A2, M3-02, M3-03, M3-06, M3-08, M3-09 | NOT EXECUTED; source reviewed; execution remains NOT RUN |
| AC3 — Draw.io validation and matching legible PDF/PNG | M3-A3 | NOT EXECUTED; source review does not replace structural/export validation and full visual QA |
| AC4 — no duplicate auth/map flows; assumptions listed | M3-A4 | NOT EXECUTED; document review required |

| SCRUM-126 acceptance criterion | Planned case(s) | Coverage state |
|---|---|---|
| AC1 — decisions trace to statuses, permitted roles, and persisted audit | M4-A1, M4-02–M4-04 | NOT EXECUTED; schema/security review required |
| AC2 — reject reasons, failed/suspicious submissions, appeal/resubmission, unauthorized outcomes | M4-A2, M4-02, M4-03, M4-06, M4-07 | NOT EXECUTED; source reviewed; policy gates remain open |
| AC3 — Draw.io validation and matching legible PDF/PNG | M4-A3 | NOT EXECUTED; source review does not replace structural/export validation and full visual QA |
| AC4 — no implementation claims; unresolved policy questions documented | M4-A4, M4-06 | NOT EXECUTED; document review required |

| SCRUM-127 acceptance criterion | Planned case(s) | Coverage state |
|---|---|---|
| AC1 — authorized transitions, ownership/privacy, persistence, confirmation/errors | M5-A1, M5-02–M5-07 | NOT EXECUTED; schema/policy gates open |
| AC2 — authenticated return restores selected listing and intent; no open redirect/contact leak | M5-A2, M5-01, M5-04, M5-08 | NOT EXECUTED; source reviewed; browser/auth execution remains NOT RUN |
| AC3 — Draw.io validation and matching legible PDF/PNG | M5-A3 | NOT EXECUTED; source review does not replace structural/export validation and full visual QA |
| AC4 — trace to renter/auth-gatekeeper/ERD/RLS and state assumptions | M5-A4, X-05 | NOT EXECUTED; document review required |

`X-01` and `X-02` add end-to-end and recovery scenarios; `X-03`–`X-05` protect traceability and evidence integrity. Each of the four acceptance criteria in the live Jira descriptions for SCRUM-125, SCRUM-126, and SCRUM-127 maps above to one or more proposed case IDs. The repository Module 3–5 specifications and editable flowcharts were reviewed against the case traces at the exact commit snapshots and hashes listed below. Jira's original binary source attachments were not retrieved or hash-compared. Product test execution and independent QA acceptance remain NOT RUN.

## Source-spec reconciliation

Reviewed the planning sources directly from these immutable repository snapshots; hashes identify the exact text reviewed. The snapshots were not modified.

| Module | Spec/flowchart source snapshot | Review result and case mapping |
|---|---|---|
| 3 — Landlord listings | Commit `896abf636d8dba0818da23728953eca4505a22e7`: `landlord-listing-management-spec.md` SHA-256 `41db7b16c704cd21e6ea106c88602861e8154fa1ac3f7ee88916b703d6bf4dc6`; `landlord-listing-review-outcome-spec.md` SHA-256 `2c0e93a738cb02fb63f7ef09032ee49540d9dbb8156f00e1b3557ae00eccacce`; `landlord-listing-draft-submit.drawio` SHA-256 `f846e21a9348e84e5affec75a06c44df723579844e739eb638711375053d8abc`; `landlord-listing-review-outcomes.drawio` SHA-256 `ec32823020b1d75fe5e203b0de286a989f1086c973571178830990ac42dc7237`. | Reviewed role/owner checks, guest auth handoff, draft-before-submit gates, unresolved approved-listing edits/archive/pause authority, persisted moderation outcomes, safe retries, and available-unit discovery. Cases M3-01–M3-07 plus new M3-08 (guest/renter/disabled/landlord authorization and cross-owner isolation) and M3-09 (approved-listing edit and unsupported lifecycle policy gate). |
| 4 — Admin moderation | Commit `f3fb5841578831979327a66f95cecad6aabad6d7`: `admin-verification-moderation-spec.md` SHA-256 `9b4fec1fb11fbf9a4d8fa4b410b3dcf3531875b8c3e654881b3de78a4af967a0`; `admin-kyc-review.drawio` SHA-256 `4dfc87a05cb5a6ea237cf268733001188fc83cbe9d9263d78e7b8b059f104b5f`; `admin-listing-moderation.drawio` SHA-256 `5e2519b8c4e8d234f0a28ef9d210c0b22352ca4dd1999022e71d4949f9306b9c`. | Reviewed admin authorization, private evidence, decision/rejection reason, atomic audit, concurrency/retry, and explicit blocked report/appeal/escalation/suspension/resubmission policies. Cases M4-01–M4-06 plus new M4-07 for insufficient/suspicious evidence and fail-closed correction/escalation. |
| 5 — Renter engagement | Commit `507436d603ddb904d0a6ffe84cfaf74a4c973a4c`: `renter-engagement-spec.md` SHA-256 `5d789889927f461ef5ebc8a0b5b3926f8417e6c02d8e7d432a36719bbdd12e26`; `renter-favorites.drawio` SHA-256 `552ab0010688a41bed703d33c65be27f6cf4d11af6c76d50aa5eeb3488f6aad6`; `renter-contact-reveal.drawio` SHA-256 `709b6bfc467f7f5963ba2ec7a1e34c8e1e8469534b87a6dea3e64aeeb1983750`; `renter-inquiry-viewing.drawio` SHA-256 `672b64f3e341e109066003fcf48258eccb1135f1ede630dfb6dbcf404fd11fae`. | Reviewed auth intent restoration, favorite save/remove eligibility and privacy, minimum authorized contact, inquiry ownership/rate-limit gates, request-versus-confirmed viewing, and unresolved schema decisions. Cases M5-01–M5-07 plus new M5-08 for tampered IDs/actions and external/protocol-relative/`javascript:` return targets. |

The repository specs and editable flowcharts above were inspected and compared with the workbook case traces. Jira reports original source attachments 10503 and 10505, but their binaries were not retrieved or hash-compared; no claim is made about their contents. This is source-document planning coverage only: all 41 workbook cases remain `NOT RUN`; it is not product/runtime, staging, or production evidence.

## Execution preconditions

1. QA/product owners confirm the unresolved policy and schema gates identified above; record the decision and source in Jira/specs.
2. Use a disposable local Supabase/Postgres instance or another explicitly isolated, resettable test target. Never connect this plan to production or a shared database.
3. Apply the exact candidate migrations in a fresh disposable database; record commit, migration versions, tool versions, invocation, exit status, and logs. No local Supabase instance was verified when this plan was drafted.
4. Create synthetic, disposable identities for guest/anon, landlord A/B, renter A/B, and admin; seed only fake listing/unit/contact/KYC placeholder data. Never use real KYC images, credentials, contact details, or personal data.
5. Exercise each database/API path as the actual anon/authenticated/admin role, not only service role. Record role, request, expected and actual result, and evidence artifact path. Redact bearer tokens and sensitive values.
6. Use local storage/notification fakes only. No real email/SMS, remote load testing, billable infrastructure, production deployment, or shared-data destructive reset.

## Execution and defect handling

For every case, retain its ID and record: disposition (`PASS`, `FAIL`, `BLOCKED`, or `NOT RUN`), exact environment/build/commit, executor and timestamp, synthetic fixture identifier, steps and actual observed output, evidence path, linked defect, and cleanup confirmation. A `PASS` requires reproducible observation against the specified role and isolated target. A blocked policy/schema case remains `BLOCKED`; do not silently redefine expected behavior. On failure, preserve the isolated evidence, file/link a defect, and rerun the same case after the fix. Keep expected results separate from actual results.

## Release/evidence gate

The live Jira acceptance criteria for SCRUM-125/126/127 are indexed to proposed case IDs above, and the available repository specs/flowcharts were source-reviewed as recorded in the hash-bound reconciliation. The original Jira binaries were not available for content or byte-identity comparison. Resolve or explicitly accept policy/schema gates, independently review the final workbook/print output, and retain the validated plan and workbook on the ticket. All workbook cases remain NOT RUN; planning artifacts are not product execution evidence and do not imply staging validation. QA owns execution acceptance and the DONE transition.
