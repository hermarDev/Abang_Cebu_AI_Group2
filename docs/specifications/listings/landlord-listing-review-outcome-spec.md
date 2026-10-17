# SCRUM-125 — Review Outcome & Owner Listing Maintenance

**Version:** 1.2.0  
**Status:** Sprint 2 planning specification  
**Jira:** [SCRUM-125](https://abangcebuai.atlassian.net/browse/SCRUM-125)  
**Sprint 1 sources:** SCRUM-54, SCRUM-55, SCRUM-62.  
**Related Sprint 2:** SCRUM-104–108 authentication; SCRUM-116–121 discovery/auth gate; SCRUM-126 moderation.

## Purpose and boundary
Specify how an owner receives and acts on a moderation outcome. Module 4 (SCRUM-126) owns the decision; this workflow consumes its persisted status, reviewer, timestamp, and rejection reason. It does not let owners approve listings or bypass moderation.

## Flow
1. Start by reading an already persisted Module 4 outcome for the owned submitted snapshot. Module 3 does not persist moderation status, reviewer evidence, or audit outcomes.
2. Check authorized provenance, current snapshot/version, reviewer and decision timestamp, and required evidence (including a reason when rejected). Unauthorized, stale, missing-evidence, or unknown outcomes retain the authoritative persisted state and route the issue to Module 4 for admin correction. Do not infer rejection from “not approved,” infer approval, reset a status, or implement admin correction here.
3. For an explicit approved outcome, display the persisted approved state. Evaluate current unit availability: an eligible approved listing with an available unit may appear in SCRUM-116–120 discovery; otherwise remains approved but hidden until availability changes.
4. For an explicit rejected outcome, show the persisted actionable reason and remain rejected/non-public. If the landlord declines correction/resubmission, end there.
5. Before owner correction/resubmission, require an approved schema/RLS and policy contract. An unsupported transition is blocked pending product/schema owner decision, with state unchanged. Do not invent a resubmission enum or overwrite moderation history.
6. Under a supported contract, allow owner-scoped edits and validate required property/unit/media data, role, ownership, and current version/state. Field errors retain safe input and return to editor. Unauthorized access is denied without disclosing record existence. Conflicts reload authoritative state for reconciliation before retry. Unresolved validation/KYC/media policy remains blocked pending owner decision.
7. Attempt resubmission persistence and Module 4 handoff only after validation. Persistence failure retains the last persisted state and safe input, reports no success, and allows retry after checking authoritative state. A failed or uncertain handoff does not claim pending-review acceptance: show authoritative persisted state and reconcile acknowledgement under the integration contract. Do not assume rollback or duplicate-safe delivery; delivery/retry/idempotency semantics require integration-owner decision.
8. End in pending review only on successfully persisted, accepted Module 4 handoff. This is a submission acknowledgement, never moderation approval.

## States and controls
The ERD defines persisted property statuses `pending | approved | rejected | archived`. Do not invent `paused` or other enum values. Resubmission behavior and draft/pending transition after rejection require schema/RLS owner confirmation before implementation. Preserve the original moderation decision/audit record; a resubmission must not overwrite its history.

Role and ownership are checked server-side; apply SCRUM-55 RLS and SCRUM-63 RBAC. Non-owner access must not reveal record existence. On conflict, reload authoritative state. Do not claim success until persistence succeeds.

## Exceptions
- Unauthorized/stale/missing-evidence/unknown outcome: retain authoritative persisted state and return to Module 4 for admin correction. No moderation writes occur here.
- Rejection without reason: do not consume the invalid outcome; retain state and request admin correction. Do not reset a persisted status.
- Resubmission schema/policy transition unsupported: do not mutate state; show blocked next step requiring owner decision.
- Validation failure: preserve safe input and return to editor; no submission success.
- Conflict: reload and reconcile current state; unauthorized access: deny; neither path claims success.
- Persistence failure: retain last persisted state; retry after checking current state. Failed/uncertain handoff: reconcile actual persistence and acknowledgement; no accepted-pending claim or assumed rollback.
- No eligible available unit: listing may remain approved but is not discoverable.

## Traceability and acceptance
- SCRUM-62 requires landlord-controlled property lifecycle, verification, availability, and anti-scam boundaries.
- SCRUM-54/55 require schema-consistent state persistence, owner isolation, and server-side access controls.
- SCRUM-126 owns approval/rejection, reasons, reviewer metadata, and audit evidence.
- SCRUM-116–120 discovery includes approved listings with eligible available units only.
- [ ] Approval path ends in approved state, then availability evaluation.
- [ ] Rejected path requires persisted reason and remains non-public.
- [ ] Only persisted, accepted resubmission handoff ends in pending review; validation/conflict/persistence/handoff failures do not claim success.
- [ ] Invalid/unknown outcomes retain state and route to admin correction; Module 3 never persists moderation.
- [ ] Unsupported transitions/policy remain blocked pending owner decision.
- [ ] No-resubmit path ends rejected/non-public.
- [ ] Every decision branch, error, and end-state agrees with the editable flowchart and authorized schema.

The editable diagram separates approval from rejection/resubmission and labels blocked/failed outcomes as state-preserving. SVG/PNG/PDF currency and visual-review evidence are recorded in `scrum125-flowchart-qa.md`; do not infer policy approval from diagram validation.
