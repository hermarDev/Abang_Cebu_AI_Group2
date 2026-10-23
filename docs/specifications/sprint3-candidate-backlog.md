# Sprint 3 Candidate Backlog — Research Proposal (Read-only)

**Project:** Abang Cebu AI (`SCRUM`). **Sprint input:** Sprint 1 #4 (27 issues, closed); Sprint 2 #70 (20 issues, active); SCRUM-124 states Modules 3–5 are planning artifacts and implementation/QA are separate future work.  
**Proposal only:** No Sprint 3 Jira or project changes were made.

## Candidate Sprint Goal

Resolve product/schema decisions and deliver a security-reviewed implementation vertical slice for landlord listing submission, admin moderation, and renter engagement. Product Owner/team must validate scope and capacity during Sprint Planning.

Estimates are illustrative story points; velocity/capacity were not provided.

## Proposed backlog

### S3-01 — Approve listing, KYC, inquiry and privacy state transitions
- **Purpose:** Remove product/schema ambiguity before implementation.
- **Description:** Decide draft, rejection/resubmission and paused/archived persistence; KYC eligibility/evidence/retention; moderation escalation, appeal and suspension authority; contact reveal consent; inquiry/viewing states; notification guarantees; upload and abuse limits. Update ERD/RLS and module specs.
- **Deliverables:** Decision table, approved transition contract, ERD/RLS disposition, acceptance criteria, decision log with owners.
- **Acceptance:** All open SCRUM-125/126/127 policy points are decided or excluded; transitions align with schema; security/privacy owner approves; no undocumented behavior blocks implementation.
- **Priority:** P0. **Dependencies:** Product Owner, schema/security stakeholders, Sprint 2 design QA. **Related:** SCRUM-53/54/55/61/62/63/74; SCRUM-125/126/127. **Estimate:** 3 points.

### S3-02 — Implement landlord listing draft and submission
- **Purpose:** Enable owner-scoped listing preparation and admin submission.
- **Description:** Implement property/unit data entry, validation, approved photo-storage constraints, draft persistence per S3-01, and duplicate-safe submission to moderation. Reuse SCRUM-104–108 authentication and SCRUM-121 auth-intent handoff.
- **Deliverables:** UI/API, approved migrations/RLS if needed, tests, safe errors, traceability to SCRUM-125.
- **Acceptance:** Only owner reads/writes private listing data; invalid data/files do not persist; draft is non-public; valid submit enters pending review; retries do not duplicate; state changes follow S3-01.
- **Priority:** P1. **Dependencies:** S3-01; SCRUM-55/62/121; SCRUM-125 QA. **Related:** SCRUM-53/54/55/62/125. **Estimate:** 8 points; assumes auth/storage baseline exists.

### S3-03 — Implement admin KYC verification and listing moderation
- **Purpose:** Enable authorized, auditable admin decisions.
- **Description:** Implement least-privilege queues, private evidence retrieval, state/version checks, mandatory rejection reasons, audit events and outcome delivery/reconciliation per approved policy.
- **Deliverables:** Admin UI/API, audit/data contract, permission/concurrency/error tests, SCRUM-126 traceability.
- **Acceptance:** Only active provisioned admins retrieve/decide; KYC evidence stays private; stale/replayed decisions cannot override newer state; rejection requires reason; decision/audit persist consistently; failure is not reported as success; owner sees only own outcome.
- **Priority:** P1. **Dependencies:** S3-01/02; SCRUM-55/63/74; SCRUM-126 QA. **Related:** SCRUM-54/55/63/74/125/126. **Estimate:** 8 points; assumes admin auth/private storage/audit foundation.

### S3-04 — Implement renter favorites and inquiry/viewing workflow
- **Purpose:** Support renter engagement for eligible approved listings.
- **Description:** Implement renter-only favorite add/remove, inquiries, owner-scoped responses and approved notification contract. Recheck listing/unit eligibility at action time.
- **Deliverables:** UI/API/data updates, RLS/tests, statuses/safe errors, SCRUM-127 traceability.
- **Acceptance:** Renters access only own favorites/inquiries; guest auth resumes same-origin intent for same listing; ineligible/hidden listings fail closed; retries avoid duplicates; do not report a viewing scheduled until approved scheduling conditions hold.
- **Priority:** P1. **Dependencies:** S3-01/02/03 contracts; SCRUM-55/61/63/121; SCRUM-127 QA. **Related:** SCRUM-54/55/61/63/121/127. **Estimate:** 8 points; assumes notification/data contracts agreed.

### S3-05 — Independently test authorization, privacy and abuse controls
- **Purpose:** Verify the vertical slice at high-risk boundaries.
- **Description:** Test cross-role/cross-owner access, KYC/contact disclosure, uploads, PII logging, concurrency/replay, and approved abuse controls; extend Sprint 1 test plans.
- **Deliverables:** Executed matrix, automated integration/security tests where feasible, findings and remediation evidence.
- **Acceptance:** No cross-owner read/write; guests cannot access protected data; KYC/contact PII is not exposed via public responses/errors/logs; only approved file policies accepted; critical/high findings fixed or formally accepted.
- **Priority:** P0. **Dependencies:** S3-01–04 testable in non-production. **Related:** SCRUM-55/63/69–71/109–113/125–127. **Estimate:** 5 points; assumes seeded role data and QA environment.

### S3-06 — Measure performance and operational readiness
- **Purpose:** Turn baseline strategy into measured evidence.
- **Description:** Benchmark listing submission, moderation, discovery and renter inquiry under agreed workloads; review monitoring, recovery and rollback readiness.
- **Deliverables:** Reproducible setup, environment/workload description, measured results, thresholds, bottlenecks, readiness checklist.
- **Acceptance:** Report states environment, dataset, workload, duration and measured p50/p95/error rates; distinguishes targets from outcomes; assigns blocker owners.
- **Priority:** P2. **Dependencies:** S3-02/03/04 on stable staging. **Related:** SCRUM-72/114/116–120/125–127. **Estimate:** 3 points; assumes staging and workload agreement.

## Suggested order and planning risks

1. S3-01 policy/schema gate.
2. S3-02 and S3-03 against the approved shared interface.
3. S3-04 against approved listing/availability outcomes.
4. S3-05 throughout and at integrated acceptance.
5. S3-06 after stable staging.

Sprint 2 #70 is still active past its end date and has no Sprint Goal; confirm owner disposition before Sprint 3 planning. SCRUM-125/126/127 remain IN DEVELOPMENT with no Jira attachments. Local plans are not implementation or executed-test evidence. Revise estimates against actual team capacity and velocity.

## Research sources

- Scrum Guide 2020, Sprint Goal and Sprint Planning: https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-US.pdf
- Atlassian Scrum Backlogs: https://www.atlassian.com/agile/scrum/backlogs
- OWASP Authorization Cheat Sheet (least privilege, deny-by-default): https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- OWASP API Security Top 10 (2023): https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- NIST Privacy Framework: https://www.nist.gov/privacy-framework
