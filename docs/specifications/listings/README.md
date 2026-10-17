# Sprint 2 Deliverables — Module 3: Landlord Onboarding & Listing Management

**Jira:** [SCRUM-125](https://abangcebuai.atlassian.net/browse/SCRUM-125)  
**Status:** Draft deliverables; QA and Jira attachment/publishing remain pending.

## Specification
- [Landlord listing management specification](landlord-listing-management-spec.md)
- [Review outcome and owner maintenance specification](landlord-listing-review-outcome-spec.md)
- Source note: ERD/schema confirmation is still required for rejected-listing resubmission and draft/paused persistence semantics.

## Editable flowcharts and exports

| Workflow | Draw.io source | SVG preview | PNG | PDF |
|---|---|---|---|---|
| Listing draft and submission | `../../flowcharts/landlord-listing-draft-submit.drawio` | `../../assets/flowcharts/landlord-listing-draft-submit.svg` | `../../assets/flowcharts/landlord-listing-draft-submit.png` | `../../pdf/landlord-listing-draft-submit.pdf` |
| Review outcomes and owner maintenance | `../../flowcharts/landlord-listing-review-outcomes.drawio` | `../../assets/flowcharts/landlord-listing-review-outcomes.svg` | `../../assets/flowcharts/landlord-listing-review-outcomes.png` | `../../pdf/landlord-listing-review-outcomes.pdf` |

## Validation
- Draw.io XML parses, all source/render/export files exist, and `python scripts/render_flowchart_previews.py` exits successfully.
- `pnpm lint`, `pnpm build`, and `pnpm test -- --run` exit 0. Build/test are repository-level checks, not module implementation or acceptance evidence.
- SCRUM-125 has zero Jira attachments. Deliverables are local only and the ticket remains IN DEVELOPMENT pending independent QA and Jira writer handoff.
