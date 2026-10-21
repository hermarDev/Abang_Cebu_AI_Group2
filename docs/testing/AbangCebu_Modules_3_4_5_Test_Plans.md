# SCRUM-165 — Modules 3, 4 and 5 test plans

Status: planning only. No test execution, QA decision, staging validation, or production validation is represented here. All workbook cases start at `NOT RUN`.

## Traceability and scope

| Module | Source | Plan coverage | External dependency / decision gate |
|---|---|---|---|
| 3 — Landlord listing management | SCRUM-125; SCRUM-54/55/63; `docs/specifications/listings/landlord-listing-management-spec.md`; `docs/specifications/listings/landlord-listing-review-outcome-spec.md`; database ERD and RLS policy docs | Owner-scoped create/edit, draft/save versus submit, validation, approved/available discovery, media privacy, moderation handoff and persisted outcomes | Confirm supported property status/draft representation, required fields, media policy, supported transitions, and schema/RLS contract. Do not invent states or validation policies. |
| 4 — Admin KYC and listing moderation | SCRUM-126; SCRUM-55/63; `docs/specifications/moderation/admin-verification-moderation-spec.md`; `docs/flowcharts/admin-kyc-review.drawio`; `docs/flowcharts/admin-listing-moderation.drawio` | Admin-only queue, KYC privacy, reasoned decisions, reviewer/time evidence, pending snapshot, atomic audit, duplicate/concurrent decisions and fail-closed policy cases | Confirm exact admin role, KYC schema/storage, audit contract, decision atomicity, notification behavior and explicitly approved report/appeal/escalation/suspension rules. |
| 5 — Renter engagement | SCRUM-127; SCRUM-121; SCRUM-61/62/74; `docs/specifications/renter/renter-engagement-spec.md`; favorite/contact/inquiry flows; database ERD/RLS | Guest-to-auth intent, owner-only favorites, approved listing eligibility, minimum-data contact, inquiry ownership, request versus confirmed appointment and retry/privacy | Reconcile `saved_listings` vs `saved_properties`; `inquiries` vs `viewing_appointments`; contact eligibility, appointment lifecycle, rate/idempotency and notification policies. |

Each `Case ID` in the workbook is a planned check. Match each live Jira acceptance bullet to one or more cases before execution. Update this mapping if Jira criteria or source specs change. Do not treat a flowchart/specification as authorization to mutate data or as a substitute for an approved schema/security contract.

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

Before SCRUM-165 can be submitted for QA acceptance, verify live Jira acceptance for SCRUM-165 and source tickets SCRUM-125/126/127; complete the source-to-case crosswalk; have all necessary policy/schema gates resolved or explicitly accepted as out-of-scope; validate workbook integrity and traceability; and attach or link both this plan and the workbook. The artifacts alone are not test execution evidence and do not imply staging validation. QA owns execution acceptance and the DONE transition.
