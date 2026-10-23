# Sprint 2 Deliverables — Module 3: Landlord Onboarding & Listing Management

**Jira:** [SCRUM-125](https://abangcebuai.atlassian.net/browse/SCRUM-125)  
**Status:** Complete; all 4 standardized flowcharts audited (0 defects) and synchronized to Jira attachments (.drawio, .png, .pdf).

## Specification
- [Landlord listing management specification](landlord-listing-management-spec.md)
- [Review outcome and owner maintenance specification](landlord-listing-review-outcome-spec.md)

## Editable flowcharts and exports

| Workflow | Draw.io source | SVG preview | PNG | PDF |
|---|---|---|---|---|
| Master Orchestration 3.0 | `../../flowcharts/landlord-master-orchestration.drawio` | `../../assets/flowcharts/landlord-master-orchestration.svg` | `../../assets/flowcharts/landlord-master-orchestration.png` | `../../pdf/landlord-master-orchestration.pdf` |
| Sub-Process 3.1: Landlord Onboarding & KYC | `../../flowcharts/landlord-onboarding-kyc.drawio` | `../../assets/flowcharts/landlord-onboarding-kyc.svg` | `../../assets/flowcharts/landlord-onboarding-kyc.png` | `../../pdf/landlord-onboarding-kyc.pdf` |
| Sub-Process 3.2: Listing Draft & Submission | `../../flowcharts/landlord-listing-draft-submit.drawio` | `../../assets/flowcharts/landlord-listing-draft-submit.svg` | `../../assets/flowcharts/landlord-listing-draft-submit.png` | `../../pdf/landlord-listing-draft-submit.pdf` |
| Sub-Process 3.3: Review Outcomes & Maintenance | `../../flowcharts/landlord-listing-review-outcomes.drawio` | `../../assets/flowcharts/landlord-listing-review-outcomes.svg` | `../../assets/flowcharts/landlord-listing-review-outcomes.png` | `../../pdf/landlord-listing-review-outcomes.pdf` |

## Validation
- 100% ANSI X3.5 / ISO 5807 compliance verified via `python3 scripts/audit_flowcharts.py --sprint2` (0 defects across all 7 Quality Gates).
- High-contrast academic monochrome (`fillColor=#FFFFFF`, `strokeColor=#000000`), 1050px canvas width, central vertical spine centered at `x = 500`.
- All 12 artifact deliverables (.drawio, .png, .pdf across 4 workflows) uploaded and synchronized to Jira issue SCRUM-125.
