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
| AC2 — happy/invalid/save-resubmit/ownership/admin handoff paths | M3-A2, M3-02, M3-03, M3-06 | NOT EXECUTED; map/spec review required |
| AC3 — Draw.io validation and matching legible PDF/PNG | M3-A3 | NOT EXECUTED; structural + visual QA required |
| AC4 — no duplicate auth/map flows; assumptions listed | M3-A4 | NOT EXECUTED; document review required |

| SCRUM-126 acceptance criterion | Planned case(s) | Coverage state |
|---|---|---|
| AC1 — decisions trace to statuses, permitted roles, and persisted audit | M4-A1, M4-02–M4-04 | NOT EXECUTED; schema/security review required |
| AC2 — reject reasons, failed/suspicious submissions, appeal/resubmission, unauthorized outcomes | M4-A2, M4-02, M4-03, M4-06 | NOT EXECUTED; policy decisions may block |
| AC3 — Draw.io validation and matching legible PDF/PNG | M4-A3 | NOT EXECUTED; structural + visual QA required |
| AC4 — no implementation claims; unresolved policy questions documented | M4-A4, M4-06 | NOT EXECUTED; document review required |

| SCRUM-127 acceptance criterion | Planned case(s) | Coverage state |
|---|---|---|
| AC1 — authorized transitions, ownership/privacy, persistence, confirmation/errors | M5-A1, M5-02–M5-07 | NOT EXECUTED; schema/policy gates open |
| AC2 — authenticated return restores selected listing and intent; no open redirect/contact leak | M5-A2, M5-01, M5-04 | NOT EXECUTED; browser/auth QA required |
| AC3 — Draw.io validation and matching legible PDF/PNG | M5-A3 | NOT EXECUTED; structural + visual QA required |
| AC4 — trace to renter/auth-gatekeeper/ERD/RLS and state assumptions | M5-A4, X-05 | NOT EXECUTED; document review required |

`X-01` and `X-02` add end-to-end and recovery scenarios; `X-03`–`X-05` protect traceability and evidence integrity. Each of the four acceptance criteria in the live Jira descriptions for SCRUM-125, SCRUM-126, and SCRUM-127 is mapped above to one or more proposed case IDs. This is a Jira-criterion index, not proof of complete source-spec coverage: original binary source attachments and referenced Module 3–5 specification files were not available for content review. Source-document reconciliation, test execution, and QA acceptance remain NOT RUN.

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

The Jira acceptance criteria for SCRUM-125/126/127 are indexed to proposed case IDs above. Before treating source coverage as fully verified, QA must review the referenced source specs/flowcharts and reconcile them against this index; their content was not available in this pass. Resolve or explicitly accept policy/schema gates, validate workbook integrity and traceability, and retain the plan and workbook on the ticket. These planning artifacts are not test execution evidence and do not imply staging validation. QA owns execution acceptance and the DONE transition.
