# Sprint 2 Deliverables — Module 5: Renter Favorites, Contact & Viewing Inquiry

**Jira:** [SCRUM-127](https://abangcebuai.atlassian.net/browse/SCRUM-127)  
**Status:** Draft deliverables; QA and Jira attachment/publishing remain pending.

## Specification
- [Renter engagement specification](renter-engagement-spec.md)
- Open policy dependencies include contact-disclosure eligibility, rate limits, data retention, and supported inquiry/viewing response states.

## Editable flowcharts and exports

| Workflow | Draw.io source | SVG preview | PNG | PDF |
|---|---|---|---|---|
| Save/remove favorites | `../../flowcharts/renter-favorites.drawio` | `../../assets/flowcharts/renter-favorites.svg` | `../../assets/flowcharts/renter-favorites.png` | `../../pdf/renter-favorites.pdf` |
| Landlord contact reveal | `../../flowcharts/renter-contact-reveal.drawio` | `../../assets/flowcharts/renter-contact-reveal.svg` | `../../assets/flowcharts/renter-contact-reveal.png` | `../../pdf/renter-contact-reveal.pdf` |
| Inquiry/viewing request | `../../flowcharts/renter-inquiry-viewing.drawio` | `../../assets/flowcharts/renter-inquiry-viewing.svg` | `../../assets/flowcharts/renter-inquiry-viewing.png` | `../../pdf/renter-inquiry-viewing.pdf` |

## Validation
- Draw.io XML parses, all source/render/export files exist, and `python scripts/render_flowchart_previews.py` exits successfully.
- Repository-level checks: `pnpm lint`, `pnpm build`, and `pnpm test -- --run` exit 0. These do not prove module implementation or Jira acceptance.
- SCRUM-127 has zero Jira attachments. Deliverables are local only and the ticket remains IN DEVELOPMENT pending independent QA and Jira writer handoff.
