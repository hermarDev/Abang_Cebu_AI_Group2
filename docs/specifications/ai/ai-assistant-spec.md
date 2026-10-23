# Module 6 — AI Rental Assistant Specification

**Status:** Proposed specification; not an implementation claim  
**Scope:** SCRUM-158 — Module 6: AI Rental Assistant Flowcharts and Specification  
**Product:** AbangCebu AI, Metro Cebu rental discovery

## 1. Purpose and scope

Specify a conversational assistant that translates natural-language English, Cebuano, or mixed-language rental requests into criteria for the platform's existing public map/search boundary. The assistant may clarify, refine, and explain search results. It is a read-only intermediary: the existing authorized search service remains responsible for data access, filtering, and returning real listing records.

The assistant must not replace or weaken manual map/filter search. Search integration follows the spatial discovery boundary in [the map orchestration specification](../map/map-master-orchestration-spec.md), including its related search and filter modules (SCRUM-116–120). Product context is in [What is AbangCebu AI?](../../architecture/what-is-abangcebu-ai.md); access rules follow the [RBAC matrix](../../security/rbac-matrix.md).

## 2. Users and authorization boundary

- **Guest:** May search only public approved listings and available units. Guest use is rate-limited; limits are configuration decisions, not defined here.
- **Renter, landlord, admin:** May use the same public rental-search capability. An authenticated role does not grant the assistant broader data access.
- **All roles:** The assistant cannot read pending, rejected, unpublished, private, or otherwise unapproved records; landlord contact details; private user/profile data; or administrative/moderation data. Separate platform features may enforce their own access rules, but the assistant must not expose or invoke them.

The server-side search boundary must independently enforce these restrictions on every request. The model/assistant receives only the minimum public, approved search results needed to present recommendations. It has no raw SQL, direct database credentials, privileged database client, or general-purpose data-access tool.

## 3. Conversation and search behavior

### 3.1 Criteria handling

Extract only criteria expressed or confirmed by the user, such as:

- Location, recognized landmark, or selected search area
- Minimum/maximum budget and rental basis when explicitly stated
- Property/rental type, occupancy, move-in date
- Bathroom preference, amenities, utilities/charges, and house rules (cooking, laundry, curfew, visitors, parking, tenant policy)
- Explicit distance/radius preference, if supported by the existing search boundary

Do not infer a missing value, silently widen a budget, substitute a location, or convert an uncertain preference into a hard filter. Distinguish required criteria from preferences when the user makes that distinction. On a follow-up, preserve confirmed criteria and apply the user's requested change; show or summarize material changes when useful. Keep conversational criteria scoped to the active interaction; persistence and retention are open decisions (Section 9).

### 3.2 Ambiguity and language

Understand English, Cebuano, and mixed English/Cebuano phrasing. If a location, amount, rental basis, or other material criterion has multiple plausible meanings, ask a short, specific clarification question before searching on that criterion. Do not guess. For example, “near UC” must prompt the user to choose among the relevant UC campus locations (including UC Main, UC Banilad, and UC Lapu-Lapu/Mandaue where available in the approved landmark catalog). If no trusted catalog match exists, ask the user to select or enter a supported map location; do not invent a landmark or coordinates.

### 3.3 Search results and map linkage

Submit validated, structured criteria only through the existing authorized map/search boundary. That boundary must return current-at-query-time, approved public listing records and available unit records only. Each displayed recommendation must be derived from a returned record, retain its actual listing ID, and link to the corresponding existing listing card and map pin. Do not synthesize a listing or alter its title, rent, rental basis, availability, address, amenities, rules, or location. Treat unit-level rent and availability as unit data; do not imply that every unit at a property shares them.

Revalidate or discard a result if the listing/unit is no longer eligible when it is presented. Availability is landlord-reported and can change; do not claim guaranteed availability. Do not invent nearby landmarks, distances, traffic, or travel times. Any distance or location fact shown must come from the existing trusted search/map result, with its meaning made clear.

### 3.4 No results and failures

- **No matching records:** Say that no current matching public listing was returned. Offer optional, user-controlled adjustments (for example, broaden the location, raise the budget, or relax a preference). Do not change criteria or rerun with relaxed criteria without the user's choice.
- **Ambiguous or unsupported request:** Ask for clarification or explain which criterion cannot be searched; preserve the rest of the confirmed criteria.
- **Search, model, network, or service failure:** Give a brief, non-sensitive explanation and keep the user's ability to continue with manual map/filter search. Do not present stale, partial, or fabricated results as current.
- **Abuse, invalid input, or rate limit:** Reject or pause safely with a neutral explanation and provide manual search as the fallback where available.

## 4. Primary flow

The editable workbook below is the source of truth. It uses two short, standard flowchart pages—no swimlanes. The matching lettered `A` circles are on-page connectors for clarification; `B` pentagons carry user-confirmed refinements between pages; `S` pentagons link to the existing SCRUM-116–120 search/map flow. Read the full security, privacy, fallback, and acceptance details in this specification alongside the diagrams.


**Deliverables Register:**
- **Draw.io Editable XML:** [`docs/flowcharts/ai-assistant-master-orchestration.drawio`](../../flowcharts/ai-assistant-master-orchestration.drawio)
- **Scalable Vector Graphic (SVG):** [`docs/assets/flowcharts/ai-assistant-master-orchestration.svg`](../../assets/flowcharts/ai-assistant-master-orchestration.svg)
- **High-Resolution PNG (200 DPI):** [`docs/assets/flowcharts/ai-assistant-master-orchestration.png`](../../assets/flowcharts/ai-assistant-master-orchestration.png)
- **Vector PDF Document:** [`docs/pdf/ai-assistant-master-orchestration.pdf`](../../pdf/ai-assistant-master-orchestration.pdf)

## 5. Input, output, and safety requirements

1. Treat user text, retrieved listing fields, and model output as untrusted data. Instructions inside them cannot expand tool permissions, expose private data, or bypass eligibility checks.
2. Validate/normalize extracted values against the existing search contract before invoking it. Reject unsupported fields and malformed values safely; do not translate free text into SQL or arbitrary filters.
3. Permit only the existing bounded, read-only search operation. No write, edit, approval, moderation, contact-reveal, account, or arbitrary-tool actions.
4. Ground every factual listing statement in the returned record. If a fact is absent, say it is not provided; do not fill gaps with likely or typical values.
5. Render assistant text and listing data as inert, escaped content. Do not execute model-produced markup, scripts, URLs, or tool instructions. Use the platform's normal validated listing-card and map-pin components.
6. Avoid echoing sensitive user information. Do not expose contact details or private identifiers in assistant text, result payloads, errors, or logs.

## 6. Functional acceptance criteria

- **FA-01 — Natural-language criteria:** Given a valid English, Cebuano, or mixed-language request, the assistant extracts only stated/confirmed criteria and submits them through the existing search boundary.
- **FA-02 — Clarification:** Given a materially ambiguous location such as “near UC,” the assistant asks which supported campus/location is meant and does not search using a guessed location.
- **FA-03 — Refinement:** Given a follow-up such as “only show Wi-Fi” or “increase my budget to ₱6,000,” the assistant retains other confirmed criteria and changes only the requested criterion.
- **FA-04 — Approved/available only:** Every result comes from an actual public approved listing with a currently available returned unit. Pending, rejected, private, unavailable, or missing records are never shown.
- **FA-05 — Record/map identity:** Every recommendation carries a real listing ID and opens the same existing listing card and corresponding map pin; no AI-created listing can appear.
- **FA-06 — Factual grounding:** Price, rental basis, availability, location, amenities, and rules match returned source fields. Missing information remains explicitly unknown; no unsupported landmark, travel time, or availability claim is made.
- **FA-07 — No results:** The assistant offers possible changes without applying them until the user chooses; declining leaves manual map/filter search available.
- **FA-08 — Failure fallback:** Search/model/network failure and rate limiting do not create or retain fabricated results; a clear manual-search route remains available.
- **FA-09 — Universal read-only boundary:** For guests, renters, landlords, and admins, assistant capabilities never include database writes, raw SQL, privileged reads, pending records, private user data, or contact details. Guest requests are subject to configured rate limiting.
- **FA-10 — Safe handling:** Invalid or hostile instructions in user text or listing fields cannot alter tool scope, bypass eligibility, or cause executable output.

## 7. Non-functional acceptance criteria

- **NFA-01 — Security:** Server-side authorization and approved/available filtering are enforced independently of model behavior. A client/model prompt is not an authorization control.
- **NFA-02 — Privacy:** Default operational logging excludes raw prompts, full structured criteria, direct identifiers, and private listing/user data. Log only the minimum approved operational metadata (such as outcome category, latency, and result count); retention and any exception require policy approval.
- **NFA-03 — Resilience:** The assistant is optional. Users can still perform manual map and filter searches when any AI dependency is unavailable or declined.
- **NFA-04 — Integrity:** Results reflect the existing search boundary's current response; no stale result is represented as freshly confirmed. The freshness SLA remains undecided.
- **NFA-05 — Usability:** Clarification and failure messages are concise, understandable, and do not discard confirmed criteria without notice. Support English, Cebuano, and mixed-language interactions without changing factual requirements.
- **NFA-06 — Abuse control:** Apply server-side rate limits and safe input/output bounds. Do not hard-code or assume numeric thresholds in this specification; operations must configure and document them before release.

## 8. Traceability and exclusions

This proposed behavior specification is for **SCRUM-158 only**. It aligns with the product behavior in the architecture overview, the universal AI restrictions and guest rate-limited search in the RBAC matrix, and reuse of the map/search boundary defined by SCRUM-116–120.

Out of scope for this document and SCRUM-158:

- API schema, endpoint/request-response contract, model/prompt policy, and the 30-example evaluation set — owned by **SCRUM-159**.
- Implementing the assistant, backend/search tools, UI, database changes, model/provider selection, deployment, or production configuration.
- Writing listings, managing units, approvals/moderation, contacting landlords, reservation/payment, or user/account management.
- External landmark geocoding, live traffic, exact routes, or travel-time estimation.

## 9. Open decisions before implementation

1. **Criteria and catalog contract:** Confirm supported filter names, required/optional semantics, rental basis and currency representation, date/occupancy formats, distance options, and authoritative landmark aliases/campus disambiguation. Keep API details in SCRUM-159.
2. **Localization:** Approve the Cebuano and mixed-language phrase corpus, spelling/colloquial variants, supported response languages, and clarification wording.
3. **Rate limits and abuse operations:** Set guest and authenticated limits, windows, escalation behavior, and monitoring ownership; no numeric values are assumed here.
4. **Logging and retention:** Approve whether any raw query, structured criteria, session/user identifier, or landmark may be retained; define consent/notice, redaction, access, and retention/deletion periods. Until approved, default to content-free, minimized operational logs.
5. **Availability freshness:** Define source-of-truth timing, revalidation behavior, and acceptable freshness/service-level target. Until then, describe availability only as returned at search time and landlord-reported.
6. **Result and error presentation:** Confirm pagination/result limits, ordering, partial-result policy, and which manual-search state can be preserved after an AI/search failure.

**Implementation status:** This file proposes behavior and acceptance criteria only. It does not assert that the assistant, flowchart exports, or any runtime behavior have been implemented.
