# AbangCebu AI — Module 4: Admin KYC Verification & Listing Moderation

**Version:** 1.2.0  
**Status:** Sprint 2 planning specification  
**Jira:** [SCRUM-126](https://abangcebuai.atlassian.net/browse/SCRUM-126)  
**Sprint 1 sources:** SCRUM-54 (users/KYC schema), SCRUM-55 (RLS), SCRUM-63 (RBAC), SCRUM-74 (admin dashboard wireframe), SCRUM-10 (system flowchart scope).  
**Related Sprint 2:** SCRUM-125 (listing submission), SCRUM-104–108 (auth), SCRUM-116–121 (public discovery and gatekeeper).

## 1. Purpose and boundaries
Specify authorized administrator workflows to review landlord KYC and submitted listings, provide reasoned decisions, preserve an audit trail, and return outcomes to landlords. This is a functional planning artifact, not implementation. SCRUM-74 defines dashboard layout; SCRUM-104–108 define authentication. This module defines moderation behavior, not login UI or general admin dashboard design.

## 2. Actors, access, and evidence
- **Admin:** explicitly provisioned `admin` role; may retrieve eligible review queues and make decisions only within approved policy and authority. Role and access are enforced server/database-side; never trust client role claims.
- **Landlord:** may view own KYC outcome and listing moderation result only; correction/resubmission is subject to the owner-flow, schema and policy gates below.
- **Reporter/complainant:** may submit a listing report/complaint only through an approved intake channel; channel, required fields, evidence handling and access policy remain unresolved. Do not imply an intake form or persist new record type.
- **System:** validates supported status transitions and mandatory reasons, records decision metadata and audit events atomically when required, and emits outcome notification if configured.
- **Renter/guest:** no access to submitted identity documents or moderation queue. Public read is limited to approved listings eligible for discovery.
- **Evidence:** `kyc_verifications` includes `landlord_id`, private ID/proof paths, status (`pending | verified | rejected`), `reviewed_by`, `reviewed_at`, and `rejection_reason`; `properties` has reviewer/approval metadata in ERD; `audit_logs` includes actor/action/target/details. KYC media stays in a private bucket. Do not expose signed URLs, document contents, or storage paths.

## 3. KYC review workflow
1. Admin opens queue; server verifies active admin. Unauthorized → deny without leaking queue or submission existence.
2. Retrieve eligible pending submissions with least-privilege access. Open a submission; access only required ID/proof evidence using short-lived authorized access.
3. Inspect completeness, legibility and consistency. Verify only checks approved by policy. Insufficient or suspicious evidence is not approval. Escalation requires an explicit approved workflow and authority; absent those, block escalation/action, leave the current state unchanged, and end safely.
4. Decision is `verified` or `rejected`; require reviewer identity, timestamp and a consistent status update. Rejection requires a nonblank actionable reason. Missing reason → block and prompt admin.
5. Persist decision and audit record atomically. Conflict/stale state → reload current submission; do not overwrite another reviewer's decision.
6. Notify landlord using the configured channel (channel/SLA is not established; no delivery guarantee). A rejected landlord may correct and attempt resubmission only through an approved owner flow and supported schema. If that owner flow, record semantics, or policy is not approved, block the attempt with no state mutation; do not reset `rejected` to `pending`, create a new persisted state, or imply a new record. If approved, hand off to that flow; this moderation module does not define its transition.

## 4. Listing moderation workflow
1. Queue receives SCRUM-125 submission with property/unit snapshot. Verify active admin and pending status; only an authorized admin can decide.
2. Inspect property content, location, rental units, claimed availability and supporting media; verify owner/KYC prerequisite only according to approved policy (exact KYC gating condition remains unresolved).
3. Decision: approve or reject. Reject requires a nonblank actionable reason. Invalid/incomplete details → request correction only if an approved owner flow permits it; otherwise block with no state mutation. Complaints/reports are handled through the gated intake in section 5, not by inventing an automatic outcome.
4. Persist supported property status and reviewer metadata plus audit event; decision should be atomic and idempotent. On persistence failure, keep previous state and tell reviewer action did not complete.
5. Approved property may enter SCRUM-116–120 discovery only when an eligible unit is available. Rejected/pending listings remain non-public. Owner correction/resubmission returns via SCRUM-125 only if its schema and transition are approved; otherwise no state change. Suspension/unpublishing and appeals follow section 5; they do not authorize unsupported property states.

## 5. Policy-gated intake, appeals, escalation, and visibility actions
- **Report/complaint intake:** reporters/complainants may submit a report or complaint only through an approved intake channel and handling policy. Until channel, required information, evidence/privacy access, triage authority and audit requirements are approved, block receipt/processing and any listing mutation; do not imply that a working intake form or persisted report/complaint record exists. Do not invent a persisted report/complaint entity, status, retention period or SLA. If approved, route only to that defined process; this spec does not set evidentiary thresholds or outcomes.
- **Appeal intake:** a landlord appeal or request to reconsider may proceed only if a product-approved channel, eligibility, reviewer authority, timing, evidence and outcome policy are defined. Until then, block the request before intake/processing; do not imply an available appeal form or persisted appeal record, change KYC/property state, reopen a decision, create an `appealed` state, or promise a review. Once approved, hand off to the named process without this module inferring an outcome.
- **Escalation:** suspected fraud, safety concerns, unresolved report/complaint or uncertain authority may be escalated only under an explicit approved escalation policy naming the destination, permitted information, authorized recipient and audit requirements. Without it, block the escalation/action, preserve the current supported state, and end safely. Do not infer automatic suspension, rejection, or account action.
- **Suspension/unpublishing:** removal from public visibility or suspension is prohibited unless explicit approved authority covers the actor, trigger, scope and action. Check that authority before any mutation. Missing/unavailable/ambiguous authority → fail closed: block, leave persisted status and public visibility unchanged, and record no claimed moderation outcome. Even when authority exists, act only if an approved persistence/visibility mechanism maps to an already supported state or mechanism; do not add `suspended`, `paused`, or another state here. Record actor, authority reference, reason, target, timestamp and action in the required audit event atomically with the approved action. If the mechanism or required audit cannot be completed, do not mutate; report failure for safe operational handling.
- **Resubmission:** KYC and listing corrections/resubmissions are attempts, not permission to invent state transitions. Gate on approval of the owner flow, current schema support, and policy. If any is unresolved, block with no mutation and identify the open decision; if all are approved, hand off to that flow, leaving its transition rules outside this spec.

## 6. State and data contract
- KYC persisted states are schema-defined: `pending → verified | rejected`; rejection requires reason, reviewer and timestamp. No implicit transition from `rejected` to `pending` is defined.
- Property persisted states in ERD: `pending | approved | rejected | archived`. Do not use unsupported states `suspended`, `appealed`, or `paused` as database values until migration and policy are approved. `archived` is not assumed to mean suspended or unpublished.
- Review command: target ID, expected current state/version, decision, reason when rejected, authenticated reviewer context. Actor identity comes from trusted auth, never request payload.
- Audit event: actor, action, target type/ID, timestamp and minimal decision details. Exclude ID document content, secrets and unnecessary PII. Policy-gated actions need an authority reference and reason; audit schema support must be confirmed before enabling them.
- Outcome notification: target owner, status, reason (if rejected), and next-step link restricted to the same application. No open redirects.

## 7. Exceptions and controls
- Unauthorized/disabled admin → deny with no sensitive queue metadata.
- Missing/inaccessible evidence → leave state unchanged; request corrected evidence only through an approved owner flow; never approve by default.
- Duplicate/stale decision → idempotent no-op or conflict response; do not double-notify or overwrite.
- Missing rejection reason → block.
- Audit write failure → do not commit moderation state if audit is required atomically; alert through safe operational channel.
- Storage failure → no ID preview; do not expose storage path.
- Concurrent review → optimistic state/version check and explicit reload.
- Notification failure after decision → retain decision and retry notification without repeating decision; precise transactional/outbox mechanism remains implementation choice.
- Any unresolved authority, intake, appeal, escalation, visibility mechanism or resubmission gate → fail closed, no unsupported state mutation, and safely terminate or return to a policy-approved retry point.

## 8. Traceability and open policy questions
| Sprint 1 requirement | This module coverage | Open decision |
|---|---|---|
| SCRUM-54 KYC schema and rejection metadata | KYC queue, reviewer, timestamp, reason, private evidence | Define permissible ID/proof checks; resolve KYC correction/resubmission transition and record semantics; confirm retention/deletion schedule |
| SCRUM-55 RLS/private KYC access | Admin-only review, owner-only result, public approved listings | Verify deployed policies/storage bucket policies match design |
| SCRUM-63 admin moderation capability | Authorized listing/KYC decision | Confirm role-specific authority for KYC decisions, listing decisions, and exceptional actions; define grants for suspension/unpublishing and audit contract |
| SCRUM-74 admin dashboard wireframe | Queue/action behavior only; no layout duplication | Confirm queue fields/filters with design |
| SCRUM-10 moderation/system flow scope | KYC/listing decisions, report/complaint intake, appeal/escalation and visibility-action gates | Approve intake channel/requirements, evidence/privacy controls, appeal policy, escalation destination/authority, suspension/unpublishing authority and audit contract |
| SCRUM-125 listing submission | Pending snapshot and response handoff | Confirm KYC gate, correction/resubmission transition and supported schema behavior |

## 9. Acceptance and validation checklist
- [ ] Every queue and decision path requires verified admin; denial paths reveal no unauthorized records.
- [ ] KYC and listing state transitions match ERD; rejected paths require reason and reviewer/time evidence.
- [ ] Private evidence access is limited; public surfaces never expose KYC paths or review-only data.
- [ ] Audit event records who/what/when without sensitive document payloads; failure behavior is explicit.
- [ ] Listing approval makes only eligible/available approved properties discoverable; rejected/pending remain hidden.
- [ ] Report/complaint and appeal request/intake stay blocked until owner-approved channel, eligibility/requirements, evidence/privacy handling, authority and audit policy are supplied; no intake form, persisted record/state or outcome is implied.
- [ ] Escalation and suspension/unpublishing stay blocked until owner-approved authority, triggers, scope, mechanism and audit obligations are supplied; blocked attempts cause no state or visibility mutation and invent no state.
- [ ] KYC/listing correction or resubmission is blocked until owner-flow, schema and policy decisions are approved; no rejected-to-pending or other unsupported transition is assumed.
- [ ] Draw.io source IDs/endpoints are unique and valid, all nodes are reachable from START or an explicitly labeled external trigger, page bounds contain every node, and SVG/PNG/PDF exports are current.

## 10. SCRUM-126 QA evidence and remediation
- **Tracked QA findings addressed:** the report/complaint, appeal, escalation, suspension/unpublishing and KYC/listing resubmission pathways are explicit policy gates; absent owner approval, they are blocked before intake/processing/mutation, terminate without a fabricated outcome, and preserve current supported state and visibility. No new persisted entity or state is introduced.
- **Schema/RBAC reconciliation:** retain SCRUM-54 KYC states `pending | verified | rejected`, `rejection_reason`, `reviewed_by`, and `reviewed_at`; retain ERD property states `pending | approved | rejected | archived`. RBAC authorizes admin `unpublish` in principle, but SCRUM-126 does not turn that capability into action authority: explicit action authority, trigger/scope, supported existing mechanism/state and audit contract are still required. `archived` is not silently treated as suspended/unpublished. SCRUM-55 public reads remain limited to approved listings; private KYC evidence remains restricted.
- **Source validation:** verify XML parsing, one diagram per file, globally unique cell IDs, valid edge endpoints, explicit START/external-trigger reachability, no unintended overlaps, and every vertex inside the Draw.io page bounds. Render SVG and regenerate PNG/PDF from those SVGs; confirm each export is non-empty/current and includes the policy gate content.
- **Acceptance gate:** all SCRUM-126 source and render checks may pass while product-policy questions remain open. Do not represent report/complaint, appeals, escalation, suspension/unpublishing, or resubmission behavior as product-approved until owners decide the listed policy/schema questions.
