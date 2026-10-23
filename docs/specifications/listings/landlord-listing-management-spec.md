# AbangCebu AI — Module 3: Landlord Onboarding & Listing Management

**Version:** 1.1.0  
**Status:** Sprint 2 planning specification  
**Jira:** [SCRUM-125](https://abangcebuai.atlassian.net/browse/SCRUM-125)  
**Sprint 1 sources:** [SCRUM-54](https://abangcebuai.atlassian.net/browse/SCRUM-54), [SCRUM-55](https://abangcebuai.atlassian.net/browse/SCRUM-55), [SCRUM-62](https://abangcebuai.atlassian.net/browse/SCRUM-62)  
**Related Sprint 2:** SCRUM-104–108 (authentication), SCRUM-116–121 (discovery and auth gatekeeper), SCRUM-126 (admin review).

## 1. Purpose and boundaries
Define the landlord's workflow to prepare a property and rental units, submit a listing for review, and maintain it after moderation. This is a functional design, not implementation. Existing registration/authentication mechanics and map search are referenced, not repeated. A listing is publicly discoverable only after authorized approval and when it has at least one available unit.

## 2. Actors and permissions
- **Landlord:** authenticated owner may create and edit own drafts, attach property/unit details and photos, and submit according to supported lifecycle and schema contracts. Cannot approve, publish directly, or edit another landlord's data. Pause or post-rejection correction/resubmission is blocked without an approved transition contract; blocked actions leave persisted state unchanged.
- **System:** validates required fields, ownership, references, and media; persists state and timestamps; sends review handoff/notifications where supported.
- **Admin:** receives the pending-review handoff and makes the moderation decision in Module 4 (SCRUM-126). This specification does not duplicate its review workflow.
- Enforce role and ownership at the server/database boundary; UI hiding is not authorization. Apply SCRUM-55 RLS principles. KYC documents stay private; do not embed their URLs in public listing data.

## 3. Domain model and lifecycle
Use the Sprint 1 ERD (`docs/database/database-erd.md`): `properties` belongs to a `landlord_id`; `rental_units` belongs to a property; `property_photos` and `property_amenities` attach supporting data. The ERD currently describes `properties.status` as `pending | approved | rejected | archived`, while SCRUM-62 describes draft/pending/published/paused. Preserve the approved ERD states as persisted values and model draft, paused, and resubmission as workflow concepts until schema owners approve new states. Do not silently invent enum changes.

| Workflow state | Meaning / next allowed action |
|---|---|
| Draft (proposed workflow state) | Landlord edits incomplete/unsubmitted property and unit data. Not public. |
| Pending | Submitted for admin review; landlord may not alter the review snapshot. |
| Approved | Admin-approved property may be displayed, subject to available rental units and visibility rules. |
| Rejected | Admin decision must have a reason; listing remains rejected/non-public. Correction/resubmission is blocked until schema/RLS and product policy define an explicit transition. Until then, keep the persisted rejected state unchanged. |
| Archived | ERD-supported terminal/non-public status; who may archive and under which conditions remain policy questions, so do not expose an owner/archive action without that contract. |
| Pause request (proposed workflow concept) | No paused value exists in the ERD. The request is blocked pending schema/RLS and product-policy decision; do not mutate state or promise resume behavior. |

## 4. Functional requirements
1. Require authenticated `landlord` role. Send guests through SCRUM-121's deferred auth gate, preserving intended action without reproducing sign-in logic.
2. Create/edit property details: title, description, type, address (street/barangay/city/postal code), and map coordinates. Allow incomplete fields while editing/saving a draft under the approved draft contract. At submission, validate required fields, coordinate range/SRID, and location consistency; return field-level errors without accepting invalid submissions.
3. Create one or more rental units per property; capture rental type, positive PHP monthly rent, deposit/advance where supplied, bedrooms/bathrooms/area/occupancy, furnishing, availability and date, lease minimum, and amenities. Validate numeric bounds and required values; do not invent unsupported mandatory business fields.
4. Upload/reorder/remove photos using the configured storage policy; reject unsupported/oversized files per actual policy (limits require product confirmation). Protect ownership and avoid exposing private storage paths.
5. Save an incomplete draft without publishing only if an approved draft representation and RLS contract exists; otherwise block the write and preserve state. On submit, validate property and at least one valid unit, ownership, and required media/fields established by the approved schema; persist pending-review state and submitter/timestamp only under that approved contract. Prevent duplicate or concurrent submission from silently creating conflicting reviews.
6. Lock the submitted review snapshot against landlord edits. Provide a clear state and next action. Admin approve/reject flows are in SCRUM-126; consume their outcome and reason without replicating their decisions.
7. On approval, expose listing to SCRUM-116–120 search only if an eligible unit is available. Availability changes must update discovery eligibility. Pause, archive, and rejected-resubmission transitions are blocked without an approved policy/schema contract; no state mutation or success claim is permitted until supported.
8. Handle permission failures, missing/deleted records, stale updates, storage/network errors, and validation errors with safe retry/recovery. Never report a save/submit as successful unless persistence succeeds.

## 5. Workflow decomposition
### 5.1 Draft and submit
Start → authenticated? No: invoke SCRUM-121, preserve listing intent, then return through authentication and landlord-role checks before resuming. Non-landlord: deny. Landlord: edit own property, units, photos, and amenities → choose save draft or submit. **Save draft precedes all complete-property/valid-unit submit gates**: incomplete details and zero complete units do not by themselves prevent a draft save. Draft persistence remains blocked until the schema/RLS owner approves its representation; do not invent a draft enum. With an approved contract, enforce ownership and draft-safe validation, attempt persistence, and show saved/non-public only on success. On failure retain safe input and the last persisted state; retry from the editor.

Submit → recheck role, ownership, current version/state, complete property/location data, at least one valid unit, and required media under approved policy. Field errors → show errors and return to editor with safe input. Unauthorized → deny without disclosing other owners' records. Conflict → reload authoritative state and reconcile before retry. Unresolved required-field/KYC/media or lifecycle policy → retain state and show blocked, requiring product/schema owner decision. Only a valid submission under a supported contract may attempt pending snapshot persistence and Module 4 handoff. Persistence failure → no success or handoff; retain safe input and last persisted state, retry from editor after checking current state. Pending-review success requires successful persistence and accepted handoff. Handoff failure/uncertain acknowledgement → show the authoritative persisted state without claiming acceptance; retry/reconcile through the integration contract. Delivery/retry/idempotency semantics remain an integration-owner decision; do not assume rollback or create a duplicate review.

### 5.2 Review outcome and owner maintenance
Consume the already persisted Module 4 outcome for the owned submitted snapshot. Validate authorized provenance, current snapshot/version, reviewer/timestamp evidence, and a reason for rejection. Unauthorized/stale/missing evidence or unknown outcome → retain authoritative state and return the issue to Module 4 for admin correction; do not persist, repair, or infer a moderation decision here. Approved → display persisted approval and evaluate available-unit discovery eligibility. Rejected → display persisted reason and remain non-public. No correction → remain rejected. Correction → supported schema/policy? No: blocked pending owner decision, state unchanged. Yes: owner edits → recheck role/ownership/version and submit validation. Validation failure → return to editor; conflict → reload/reconcile; unauthorized → deny. Attempt supported resubmission persistence/handoff only after validation. Failure never claims success. Only accepted persisted handoff ends in pending review. Module 4 owns subsequent moderation. See the [review outcome specification](landlord-listing-review-outcome-spec.md).

### 5.3 Error and recovery paths
Unauthorized owner or non-landlord → deny without revealing record existence. Validation error → retain safe form state and return to editor with field errors. Upload/network failure → do not mark photo complete; allow retry. Stale version/state conflict → reload current state and ask owner to reconcile. Failed persistence → retain last persisted state and safe input; no save/submit success. Failed/uncertain handoff → reconcile authoritative state and acknowledgement; acceptance and duplicate-safe recovery require the integration owner's contract. Invalid or unknown admin outcome → retain authoritative state and route to admin correction, without inferring approval or resetting a persisted status. Unresolved product/schema policy is blocked, never an implicit permission to mutate.

## 6. Data and interface contract
- Property: `properties` (owner, address, coordinates, approved/rejected/pending/archived state and moderation metadata per ERD).
- Unit: `rental_units` (property relation, rent, capacity, availability).
- Media/amenities: `property_photos`, `property_amenities`, `amenities`.
- KYC: `kyc_verifications` and private storage; verification eligibility is enforced by the approved policy, not inferred from an undocumented client flag.
- Review handoff: property identifier, owner identifier, submitted snapshot/version, submit time; outcome returns status, reviewer, decision time, and rejection reason where rejected. Exact event/API is an integration detail to confirm.
- Discovery handoff: approved property plus available unit only; discovery/search implementation remains SCRUM-116–120.

## 7. Assumptions and open decisions
- ERD is authoritative for persisted property states. Draft/paused and post-rejection re-review require schema/RLS decision; no enum migration is implied by this planning spec.
- Exact photo MIME/size limits, required listing fields, landlord KYC gate (submission vs verification), review SLA, notification channel, and whether owners may edit approved listings are not settled by reviewed source docs. Confirm before implementation.
- Listing approval is never performed by the landlord; only authorized Module 4 moderation may approve.

## 8. Acceptance and validation checklist
- [ ] Role/ownership guard at each create/read/update/upload/submit action; reference SCRUM-55 and SCRUM-63.
- [ ] Incomplete draft save is reachable before submit completeness/valid-unit gates, subject to approved draft schema/RLS contract.
- [ ] Auth returns through auth/role checks; validation returns to editor; persistence/conflict/handoff failures never claim success.
- [ ] Property/unit validation and draft, submit, error, rejection/resubmission, approval, and availability paths. Withdrawal is not specified or diagrammed; it remains out of this deliverable until an owner-approved withdrawal policy and state transition are defined.
- [ ] Explicit non-public behavior before approval and when no unit is available.
- [ ] Draw.io source parses; nodes/edges and endpoints are connected; decision branches labeled; no unsupported lifecycle states presented as persisted schema.
- [ ] SVG, PNG, and PDF are regenerated from the current source; verify source/export fidelity, legibility, and shape/connector geometry. See `scrum125-flowchart-qa.md` for dated command output and observed visual-review limits.
- [ ] Traceability checked against Sprint 1 ERD, RLS, landlord capabilities and SCRUM-116–121; open decisions recorded rather than fabricated.
