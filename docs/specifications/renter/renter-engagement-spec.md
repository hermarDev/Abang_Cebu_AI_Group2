# AbangCebu AI — Module 5: Renter Favorites, Contact & Viewing Inquiry

**Version:** 1.0.2  
**Status:** Sprint 2 planning specification (draft; independent QA and product/schema decisions pending)  
**Jira:** [SCRUM-127](https://abangcebuai.atlassian.net/browse/SCRUM-127)  
**Sprint 1 sources:** [SCRUM-61](https://abangcebuai.atlassian.net/browse/SCRUM-61) renter capabilities; [SCRUM-54](https://abangcebuai.atlassian.net/browse/SCRUM-54) identity/schema; [SCRUM-55](https://abangcebuai.atlassian.net/browse/SCRUM-55) RLS; [SCRUM-63](https://abangcebuai.atlassian.net/browse/SCRUM-63) permissions.  
**Related Sprint 2:** SCRUM-116–120 map discovery; SCRUM-121 high-intent auth gate; SCRUM-125 listing lifecycle; SCRUM-126 moderation.

## 1. Purpose and boundaries
Specify renter engagement after a renter discovers an approved rental: save/unsave a listing, reveal authorized landlord contact, and submit a property inquiry/viewing request. Guests may browse; sensitive/high-intent actions use SCRUM-121's authentication gate and restore the exact intended action for the same listing after sign-in. Do not duplicate map search, session internals, or landlord/admin review workflows.

## 2. Actors and authorization
- **Guest:** browse public approved listings; may initiate a high-intent action, but system defers it through SCRUM-121. No persistence under an anonymous identity, favorite, contact disclosure, or inquiry submission.
- **Renter:** authenticated, active renter; can save/remove their own favorites, create inquiries as self, and request contact reveal for eligible listings. Cannot access another renter's saved list or inquiry.
- **Landlord:** views/responds only to inquiries for own property/unit; may not view unrelated renter saved data. Exact response states are constrained to the schema and product decisions below.
- **System:** verifies listing approval/availability, owner routing, input, rate limits, privacy, persistence result, and notification outcome. Enforce at server/database layer and RLS.

## 3. Favorites flow
1. Renter selects Save or Remove for a listing from SCRUM-116–120.
2. If guest, invoke SCRUM-121; store only a bounded, same-origin pending intent and target listing ID; after authentication revalidate renter role, listing identity, and action before resuming.
3. Branch on action before any listing-visibility check. **Remove** deletes only an existing association for the current renter, keyed by renter and listing/property IDs; it must not require the listing to remain approved, available, or publicly discoverable. Do not reject removal because the listing is hidden, withdrawn, or unavailable, and do not expose hidden listing details. A missing association or deleted target returns a safe idempotent remove result. **Save** requires the target listing to be currently approved and to have an eligible available unit; recheck those conditions at action time and return a safe unavailable result without persistence when they fail.
4. Require an enforced unique constraint on the canonical renter/listing pair (the current ERD expresses this as `UNIQUE (renter_id, property_id)` on `saved_listings`; the canonical relation, columns, constraint, and deployment remain subject to schema-owner review). Use an upsert against the validated constraint. Duplicate saves are idempotent, not duplicate rows; this is a planning requirement, not a claim that the deployed schema has been verified.
5. Persist success before showing saved/removed state; retry safely on transient failure. Favorites are private and excluded from public search and other users' views.

## 4. Contact reveal flow
1. User selects contact action on an approved listing. Guest is intercepted by SCRUM-121 and intent restored after sign-in.
2. Verify renter role, listing is still approved, the landlord/contact is associated with that listing, and disclosure is allowed by current policy. Do not return contact data to guests or disclose via public DOM/API before authorization.
3. If contact data is absent/unverified/not permitted, show a safe unavailable state and offer inquiry path; do not invent or expose fallback data.
4. If permitted, return only the minimum verified contact details. Rate-limit/abuse controls and contact-access audit event are recommended; exact quotas/retention rules require policy confirmation. Log event metadata only, never unnecessary PII.
5. Fail closed on stale status, authorization, or service error; no contact data in errors/logs.

## 5. Inquiry / viewing request flow
1. Renter selects inquiry/viewing on listing; guest deferred via SCRUM-121 preserving listing and action.
2. Revalidate authenticated renter, approved property, target unit belongs to property, and eligible availability. Capture message and preferred move-in date; for viewing, capture requested appointment time/date if product confirms scheduling semantics.
3. Validate required fields, message bounds, valid date/time and non-past constraint as approved; apply abuse/rate-limits only according to defined policy. No automatic booking is implied.
4. Persist `inquiries` with renter, property, unit, landlord, message, preferred move-in date and supported status; ERD lists `pending | accepted | declined | scheduled` and `viewing_date`. Request is not a confirmed appointment until landlord accepts/schedules under agreed policy.
5. Route only to owning landlord. Show confirmation only after persistence. Notification delivery failure must not create duplicate inquiry on retry; expose pending delivery safely if tracked.
6. Landlord responses must be owner-scoped; on accepted/declined/scheduled, persist supported state and schedule details, then notify renter. Authentication, permission, or transient error fails closed and preserves the prior state.

## 6. Data contract and privacy
- **Favorites naming decision gate:** SCRUM-127's referenced ERD calls the relation `saved_listings` with renter ID and property ID; SCRUM-121 uses `saved_properties`. This specification does not assert either is the deployed name or that both exist. Before implementation, the **database/schema owner** must inspect the approved ERD and deployed schema, choose one canonical relation (or document an explicit compatibility mapping), and update this contract and dependent artifacts. Do not create/rename a table based on this document alone. Whatever relation is approved must enforce renter ownership and the unique renter/property pair required for idempotent save; verify constraint and conflict-target names during schema validation.
- **Inquiry/viewing naming decision gate:** SCRUM-127's ERD/spec references `inquiries`; SCRUM-121 refers to `viewing_appointments`. These are not assumed interchangeable or coexisting. Before implementation, the **database/schema owner**, with the **product owner**, must decide whether inquiry and appointment are one entity or separate lifecycle entities, select/confirm canonical table(s), map required fields/states, and validate against the approved ERD/deployed schema. No new table or persisted status is authorized by this planning document.
- Until that gate is resolved, `property_id`, `unit_id`, `renter_id`, `landlord_id`, message, preferred move-in date, status, and viewing date are planning references to ERD-described fields only; derive landlord from property ownership, never trust it from client. Status names/values are constraints to validate against the approved schema, not permission to add values.
- Contact data: read from protected profile/listing source only after successful authorization; do not assume a separate table/consent flag absent from approved schema.
- Pending auth intent: `action`, opaque listing ID, safe local route/state. No credentials or sensitive form text in storage; validate against same-origin allowlist and recheck target after sign-in.
- Keep guest map state restoration to SCRUM-121; favorite and inquiry persistence to the schema chosen at the decision gates.

## 7. Exceptions and alternative paths
- Unauthenticated → gatekeeper; cancel sign-in → return to discovery without committing action.
- Listing no longer approved/available → do not save new high-intent interaction or reveal contact; show unavailable result and return to map.
- Duplicate save → idempotent success; duplicate inquiry submission → prevent accidental repeats using explicit confirmation/idempotency strategy (implementation decision).
- RLS/ownership failure → safe access denied; no cross-renter/cross-landlord data.
- Invalid form/date → do not persist; preserve safe form state and show field errors with explicit correction/resubmission or cancel outcomes.
- Database/network failure → no false confirmation; allow safe retry.
- Contact unavailable → no disclosure; offer inquiry if enabled.
- Notification failure → retain persisted inquiry/response and use bounded retry; never create duplicate records.

## 8. Open decisions and fail-closed gates (do not guess)
- **Contact eligibility:** Product/privacy owner must define whether contact reveal requires verified landlord/KYC status, renter verification, consent, or other eligibility. Until approved, withhold contact data.
- **Abuse policy:** Product/security owner must define quotas, rate-limit windows, audit/log fields and retention, escalation, and contact-access controls. Until approved, fail closed for a request that cannot be evaluated against configured policy; never invent quotas or log unnecessary PII.
- **Viewing semantics:** Product owner must decide request-only versus confirmed slots, timezone, scheduling authority, cancellation/reschedule, and response SLA. No request is a confirmed appointment absent explicit approved scheduling semantics and landlord action.
- **Schema gates:** Resolve the `saved_listings` / `saved_properties` and `inquiries` / `viewing_appointments` compatibility decisions in §6 with the database/schema owner before implementation; validate actual tables, columns, uniqueness and supported states. No deployed schema or new persisted status is inferred here.
- **Inquiry policy:** Product/security owner must approve required fields, contact consent/notification channel, duplicate-submit/idempotency strategy, and message retention/moderation. Until validation and abuse policy are defined, invalid/unverifiable requests do not persist and cannot bypass correction or explicit cancel.

## 9. Acceptance and validation checklist
- [ ] Guest can browse but cannot access private favorites/contact/inquiries; high-intent intent resumes only same listing/action after auth.
- [ ] Role, renter ownership, landlord ownership and listing status are verified server-side; RLS scoped to owner.
- [ ] Favorite removal is available independently of listing approval/availability; save validates current eligibility; enforced renter/listing uniqueness makes add idempotent after schema validation.
- [ ] Contact reveal checks approval and policy before returning minimum data; failures reveal no PII.
- [ ] Inquiry captures schema-backed fields, routes to correct landlord, distinguishes request from confirmed appointment, and covers renter/landlord response outcomes.
- [ ] Draw.io source structurally validates; nodes/edges are connected, decisions labeled, exception branches present; rendered diagram is visually readable and has minimal crossings.
- [ ] Open schema/policy decisions are clearly marked, assigned to owner gates, and fail closed until approved; no schema/status is fabricated.
