# Sprint 2 Deliverables — Module 4: Admin KYC Verification & Listing Moderation

**Jira:** [SCRUM-126](https://abangcebuai.atlassian.net/browse/SCRUM-126)  
**Status:** Draft deliverables; QA and Jira attachment/publishing remain pending.

## Specification
- [Admin verification and moderation specification](admin-verification-moderation-spec.md)
- Open policy dependencies include KYC eligibility criteria, escalation/appeals, suspension authority, evidence retention, notification guarantees, and outcome audit semantics.

## Editable flowcharts and exports

| Workflow | Draw.io source | SVG preview | PNG | PDF |
|---|---|---|---|---|
| Admin KYC review | `../../flowcharts/admin-kyc-review.drawio` | `../../assets/flowcharts/admin-kyc-review.svg` | `../../assets/flowcharts/admin-kyc-review.png` | `../../pdf/admin-kyc-review.pdf` |
| Admin listing moderation | `../../flowcharts/admin-listing-moderation.drawio` | `../../assets/flowcharts/admin-listing-moderation.svg` | `../../assets/flowcharts/admin-listing-moderation.png` | `../../pdf/admin-listing-moderation.pdf` |

## Validation
- Draw.io XML parses, all source/render/export files exist, and `python scripts/render_flowchart_previews.py` exits successfully.
- Repository-level checks: `pnpm lint`, `pnpm build`, and `pnpm test -- --run` exit 0. These do not prove module implementation or Jira acceptance.
- SCRUM-126 has zero Jira attachments. Deliverables are local only and the ticket remains IN DEVELOPMENT pending independent QA and Jira writer handoff.
