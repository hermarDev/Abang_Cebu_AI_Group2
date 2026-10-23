# AbangCebu AI Sprint 2 Coverage and Sprint 3 Planning Report

**As of:** 2026-10-16  
**Project:** Abang Cebu AI (`SCRUM`), board 1.  
**Jira:** https://abangcebuai.atlassian.net

## Executive status

Sprint 1 and Sprint 2 boundaries verified from Jira sprint endpoints: Sprint 1 `#4` has 27 issues and is closed; Sprint 2 `#70` has 20 issues and remains active. Current Sprint 2 count: 17 Done, 3 IN DEVELOPMENT (`SCRUM-125/126/127`). Its recorded end date was 2026-10-15, now past; no sprint action was taken.

The latest tracked Combo_V4 reviews passed planning logic/structure for all three module designs, but native-size visual QA remains blocked and product/schema decisions remain open. On 2026-10-16, the user approved publication of draft deliverables: one ZIP per ticket was uploaded and verified in Jira (SCRUM-125 attachment 10238; SCRUM-126 10239; SCRUM-127 10240). These are not acceptance PASS; all three tickets remain IN DEVELOPMENT and Sprint 2 remains open.

## A. Sprint 1 requirements analysis

The sprint endpoint reported 27 Sprint 1 issues, all shown as Done. The available requirements matrix covers Sprint-2-relevant scope; it is not a full description-by-description review of every Sprint 1 ticket or attachment. Core verified baseline items are listed below.

| Requirement | Sprint 1 source | Approved baseline | Sprint 2 linkage | Status |
|---|---|---|---|---|
| Identity/profile schema and KYC metadata | SCRUM-54 | Profiles extend Supabase Auth, role and KYC status; schema documentation/migration | SCRUM-125/126/127 | Covered by module drafts; schema policy questions remain |
| Tenant and public-read isolation | SCRUM-55 | Landlord ownership-based writes; profiles isolated; public reads restricted to approved listings | SCRUM-125/126/127 | Addressed in drafts; no policy execution test yet |
| Renter persona/capabilities | SCRUM-61 | Geospatial search, favorites, inquiries, privacy boundaries | SCRUM-127 | Drafted; independent QA FAIL, remediation required |
| Landlord persona/lifecycle | SCRUM-62 | Property listing, rent/photos/availability; draft→pending→published/paused concept; anti-scam safeguards | SCRUM-125 | Logical QA PASS; policy/schema and visual QA gates remain |
| RBAC | SCRUM-63 | Guest/renter/landlord/admin permissions, route/API guards | SCRUM-125/126/127 | Drafted; runtime verification pending |
| Admin console | SCRUM-74 | KYC inspection, reject reason, scam/listing moderation, suspension concepts | SCRUM-126 | Independent QA FAIL; authority and policy need owner decisions |
| System process architecture | SCRUM-10 | System-level flowchart coverage | SCRUM-125/126/127 | Referenced by module decomposition; no complete source-to-flow trace |
| Database model | SCRUM-53 | Initial ERD design | SCRUM-125/126/127 | ERD constraints cited; owner confirmation of state transitions pending |

Other Sprint 1 tickets include foundation/environment/project setup (`SCRUM-6,48–53`), auth contracts (`SCRUM-56–60`), wireframes (`SCRUM-64,66–68`), and authentication/authorization test planning (`SCRUM-69–72`). The table covers only requirements relevant to current Sprint 2 module deliverables; it is not a substitute for reviewing all 27 Sprint 1 issue descriptions and attachments.

## B. Orchestration

- Roles dispatched: read-only Sprint 1 analyst; read-only Sprint 2 gap auditor; independent QA for SCRUM-125 and for the three module deliverables. Workers had explicit scope and no Jira write permission.
- Actual parallelism: independent Jira requirements analysis and sprint auditing were dispatched concurrently; independent diagram QA was also dispatched.
- Delegation: earlier AGY/Gemini subagent tasks exhausted quota. After user direction, the delegation default was set to `Combo_V4`, and tracked Hermes QA workers were dispatched for SCRUM-125/126/127; those workers did not yet return usable completed reports at this checkpoint.
- Orchestrator work: direct Jira reads, local file/source checks, renderer execution, visual inspection where available, repo verification, and cross-checking Jira attachments/statuses.
- Handoffs: local draft deliverables exist, but the handoff to Jira writer was intentionally not made because independent QA and product/schema acceptance gates are unresolved. No Jira writer mutation occurred.

## C. Sprint 2 coverage inventory

Jira `get_sprint_issues(sprintId=70)` returned 20/20 issues over pages. Status count: 17 Done; 3 IN DEVELOPMENT.

### Done-ticket attachment evidence audit (read-only)

A tracked Combo_V4 audit checked all 17 Done tickets' Jira attachment metadata against deliverables named in each issue description. It did not inspect attachment contents, and Jira returned no separate Acceptance Criteria field. Every Done ticket has at least one attachment, but metadata alone cannot establish artifact completeness or content quality.

- **Partial metadata coverage — SCRUM-104–114:** attached files are planning/specification/test-design artifacts, but requested formats are not fully represented. SCRUM-104–108 have Draw.io/PDF/PNG but no `.md` or SVG shown. SCRUM-109–112 have PDF/XLSX but no requested `.md`; SCRUM-113 and SCRUM-114 have PDF but no requested `.md`. No implementation or executed-test evidence was identified in the attachment metadata.
- **Required planning formats present — SCRUM-116–120:** Draw.io/PDF/PNG attachments are listed; SCRUM-116 and SCRUM-117 have duplicate versions in metadata. Choose a canonical revision if needed.
- **SCRUM-122:** function specification PDF attachment ID `10237` is present; content was not inspected.
- No Done status change is recommended based on filenames alone. Absent formats in Jira metadata are an evidence gap, not proof no equivalent file exists elsewhere.

| Sprint 1 requirement | Sprint 2 ticket | Required/claimed deliverable | Evidence found | Coverage |
|---|---|---|---|---|
| SCRUM-56–60 auth registration/session/error workflows | SCRUM-104–108 | Auth functional specs and flowcharts | Jira has Draw.io/PDF/PNG attachments; examples include `auth-registration-pkce.drawio/.pdf/.png` on SCRUM-104 and `auth-login-session-rtr.drawio/.pdf/.png` on SCRUM-105 | Covered by attached planning artifacts; not implementation proof |
| SCRUM-69–71 auth and access testing | SCRUM-109–113 | Master and focused test plans/cases | Jira attachments include auth test plan PDF/XLSX on SCRUM-109–112 and middleware test scenario PDF on SCRUM-113 | Covered as test-design artifacts; execution evidence not established |
| SCRUM-72 performance baseline plan | SCRUM-114 | Baseline latency/load strategy | Jira has `AbangCebu_Auth_Performance_Baseline.pdf` | Covered as strategy; measured performance not established |
| SCRUM-10 system flowcharts; SCRUM-53 ERD; map foundation | SCRUM-116–121 | Master map/discovery flow and subprocesses | Jira attachment listings show Draw.io/PDF/PNG artifacts on SCRUM-116–121; SCRUM-116 has duplicate versions of master files | Covered by attached planning artifacts; duplicate versions merit selecting one canonical revision |
| SCRUM-10/53/54/55/62/121 | SCRUM-125 | Landlord listing specification + editable diagrams + exports | Draft bundle attached in Jira as ID 10238; tracked Combo_V4 logic/structure QA passed. Native-size visual QA and owner/schema/integration contracts remain open. | Partial / visual and policy gates remain |
| SCRUM-10/53/54/55/63/74 | SCRUM-126 | Admin KYC/moderation spec + diagrams + exports | Draft bundle attached in Jira as ID 10239; latest tracked Combo_V4 planning coverage/structure QA passed. Visual QA and policy/authority gates remain open. | Partial / visual and policy gates remain |
| SCRUM-54/55/61/63/121 | SCRUM-127 | Renter favorites/contact/inquiry spec + diagrams + exports | Draft bundle attached in Jira as ID 10240; latest tracked Combo_V4 review verified remediated planning paths and structure. Native-size visual QA and schema/privacy decisions remain open. | Partial / visual and policy gates remain |
| Sprint 2 planning scope | SCRUM-122 | Abang Cebu function specification PDF | Jira attachment ID 10237, 3,134,293 bytes | Covered as attached spec; not independently reviewed in this audit |

Sprint 2 complete key list: `SCRUM-104–114`, `SCRUM-116–121`, `SCRUM-122`, `SCRUM-125–127` (20 total; SCRUM-115 is not in this sprint). Statuses: Done `104–114`, `116–122`; IN DEVELOPMENT `125–127`.

## D. Jira ticket changes

Three ticket-specific draft bundles were attached after explicit user approval and verified in Jira: SCRUM-125 ZIP ID 10238 (11 files), SCRUM-126 ZIP ID 10239 (9 files), SCRUM-127 ZIP ID 10240 (13 files). At the user's correction, the same source files were then uploaded as individual Jira attachments: SCRUM-125 IDs 10241–10251 (11 files), SCRUM-126 IDs 10252–10260 (9 files), SCRUM-127 IDs 10261–10273 (13 files). Ticket comments 10132–10134 identify the individual attachments as preferred, note the ZIPs are redundant, and document the outstanding gates. The ZIPs remain attached; they were not deleted. No ticket was created, assigned, linked, or transitioned. Visual QA and owner/schema decisions remain open.

## E. Module design deliverables

Local files:
- `docs/specifications/listings/landlord-listing-management-spec.md`
- `docs/specifications/listings/landlord-listing-review-outcome-spec.md`
- `docs/specifications/moderation/admin-verification-moderation-spec.md`
- `docs/specifications/renter/renter-engagement-spec.md`
- Artifact indexes: `docs/specifications/listings/README.md`, `docs/specifications/moderation/README.md`, `docs/specifications/renter/README.md`

The specs address purpose/boundaries, actors, authorization, inputs/states, workflows, exceptions, interfaces, traceability, and open decisions. They are planning artifacts; no feature implementation was done. Open matters include draft/paused state persistence, rejected-listing resubmission schema transition, KYC verification requirements/retention, suspension and appeal authority, contact-disclosure criteria, inquiry states and notification limits.

## F. Flowchart deliverables

Seven editable `.drawio` sources and corresponding SVG preview, PNG, and PDF files exist:

| Diagram | Source | QA note |
|---|---|---|
| Landlord draft/submission | `docs/flowcharts/landlord-listing-draft-submit.drawio` | Latest tracked Combo_V4 QA PASS on planning logic and XML structure; SVG/PNG/PDF refreshed from source at 09:17–09:21. Native-size visual inspection blocked by image tool. Schema/RLS, policy and retry/idempotency contracts remain open. |
| Landlord review outcomes | `docs/flowcharts/landlord-listing-review-outcomes.drawio` | Latest tracked Combo_V4 QA PASS on planning logic and XML structure; exports refreshed at 09:17–09:21. Native-size visual inspection blocked; resubmission policy/schema remains open. |
| Admin KYC review | `docs/flowcharts/admin-kyc-review.drawio` | Latest tracked Combo_V4 QA PASS on corrected planning coverage/structure, BLOCKED for visual acceptance. Report/appeal/escalation/resubmission remain policy-gated; no unsupported mutation. |
| Admin listing moderation | `docs/flowcharts/admin-listing-moderation.drawio` | Latest tracked Combo_V4 QA PASS on corrected planning coverage/structure, BLOCKED for visual acceptance. Suspension/unpublishing authority and audit policy remain open. |
| Renter favorites | `docs/flowcharts/renter-favorites.drawio` | Latest tracked Combo_V4 QA verifies remove-before-availability gate and save-only approved/available gate; structural PASS, visual BLOCKED. |
| Renter contact reveal | `docs/flowcharts/renter-contact-reveal.drawio` | Latest tracked Combo_V4 QA verifies fail-closed policy gate; structural PASS, visual BLOCKED. Contact eligibility/abuse decisions remain open. |
| Renter inquiry/viewing | `docs/flowcharts/renter-inquiry-viewing.drawio` | Latest tracked Combo_V4 QA verifies invalid-input correction/cancel paths; structural PASS, visual BLOCKED. Inquiry/viewing schema/status contract remains open. |

Scoped renderer calls regenerated all seven SVG previews from the current editable sources, followed by PNG and one-page PDF conversions at 09:17–09:21. XML parsing, edge-endpoint and page-bound checks passed for all seven; independent reviewers found no overlapping vertex boxes. `pnpm lint`, `pnpm build`, and `pnpm test -- --run` passed (20 tests). These checks do not replace visual inspection or resolve product/schema policy gates.

## G. Independent QA and findings

- Latest independent read-only tracked Combo_V4 QA of the refreshed artifacts: SCRUM-125 logical planning QA PASS, visual QA BLOCKED; SCRUM-126 planning coverage/structure PASS, visual QA BLOCKED; SCRUM-127 spec/structure PASS, full acceptance BLOCKED by visual QA. Transcripts: `/home/hrmr/.hermes/cache/delegation/live/deleg_9bbdfa54/task-0.log`, `/home/hrmr/.hermes/cache/delegation/live/deleg_9bbdfa54/task-1.log`, `/home/hrmr/.hermes/cache/delegation/live/deleg_9bbdfa54/task-2.log`. SCRUM-125 withdrawal checklist mismatch was corrected after this review; no workflow source changed.
- Prior tracked QA found SCRUM-126/127 gaps (transcripts: `/home/hrmr/.hermes/cache/delegation/live/deleg_74126cb0/task-0.log` and `task-1.log`). The latest review confirms the fixable path/geometry defects were addressed. Product/schema approvals for gated operations remain unresolved.
- Native-size visual inspection of the exact latest PNG/PDFs remains blocked because the image tool did not return usable current renders. Do not mark any module Done. No target Jira attachments exist yet.


## H. Sprint 3 research plan

The [Sprint 3 candidate backlog](sprint3-candidate-backlog.md) is a read-only proposal; no Sprint 3 Jira or project resources were changed.

## I. Sources

Jira source records:
- Sprint 1 #4 and Sprint 2 #70; SCRUM-124–127; SCRUM-54/55/61/62/63/74; SCRUM-104–122.
- https://abangcebuai.atlassian.net/browse/SCRUM-124
- https://abangcebuai.atlassian.net/browse/SCRUM-125
- https://abangcebuai.atlassian.net/browse/SCRUM-126
- https://abangcebuai.atlassian.net/browse/SCRUM-127

- Sprint 3 planning references researched and applied in `sprint3-candidate-backlog.md`:
- Scrum Guide 2020: https://scrumguides.org/scrum-guide.html
- Atlassian requirements and acceptance criteria: https://www.atlassian.com/agile/product-management/requirements
- OWASP Authorization Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- OWASP API Security Top 10 (2023): https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- NIST Privacy Framework: https://www.nist.gov/privacy-framework

## J. Safety and final gate

- Sprint 2 remains OPEN/active; confirmed directly by Jira Sprint #70 state.
- Complete Sprint action was never executed.
- No ticket was marked Done. All target module tickets remain IN DEVELOPMENT; draft ZIP attachments exist but do not establish complete acceptance.
- Sprint 3 Jira resources remain unchanged; a local proposal is available at `docs/specifications/sprint3-candidate-backlog.md`.
- No destructive Git operations were run. Existing dirty/untracked repo content was preserved; draft bundles and module artifacts were added to the active repo.
- The only Jira mutation in this publication step was the three user-approved draft attachments; no sprint transition occurred.

**Next action:** inspect the current PNG/PDF exports at native size, resolve remaining schema/product decisions, and document full independent QA before considering ticket transitions. Never complete Sprint 2.
