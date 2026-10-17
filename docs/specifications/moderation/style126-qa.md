# STYLE126 — SCRUM-126 flowchart QA

Reference: `/home/hrmr/Downloads/auth-registration-pkce.drawio` and its one-page PDF. The reference has 21 vertices, 25 edges, a 1050 × 1640 page, Helvetica black-on-white shapes, 13–14 pt labels, rounded terminals, rectangular actions, diamond decisions, and orthogonal labeled arrows. The two admin charts retain their larger pages for readable policy-gated branches.

| Source | Before / after vertices | Before / after edges | Starts reachable | Page | Export pages |
|---|---:|---:|---:|---|---:|
| `admin-kyc-review.drawio` | 33 / 33 | 32 / 32 | 4 | 1540 × 2320 | 1 |
| `admin-listing-moderation.drawio` | 44 / 44 | 42 / 42 | 6 | 1540 × 3000 | 1 |

RED: both backed-up sources fail the reference typography/shape checks (32 and 43 mismatched nodes respectively). GREEN: all original IDs, node labels, edge IDs, endpoints, and edge labels match the backed-up sources. XML parses; all non-title vertices are reachable from a start/trigger. No rectangular node overlaps or out-of-page nodes. All non-title nodes have white fill/black stroke, Helvetica 13 pt, and decision/action/terminal shapes; arrows have black orthogonal styles and Helvetica 13 pt labels. Renderer line wrapping found no text overflow by its width/height estimate. All two targeted SVG previews parse; PNG and PDF exports are nonempty and each PDF is one page. This is structural and renderer-based QA; no independent native Draw.io visual inspection was performed.

Exports: `docs/assets/flowcharts/admin-{kyc-review,listing-moderation}.{svg,png}` and `docs/pdf/admin-{kyc-review,listing-moderation}.pdf`. Rendered only the two source names via targeted `render(name)` calls; PNG/PDF were converted from those SVGs. No Jira change or publish was made.

SCRUM-126 arrowhead correction (2026-10-16): changed all 32 KYC and 42 listing edge `endArrow=block` styles to `endArrow=classic`. Against `.hermes/backups/sprint2-flowcharts-2026-10-16_100414`, all 33/44 vertex IDs and labels and all 32/42 edge IDs, source/target endpoints, and labels remain identical. The local SVG preview renderer hardcodes its arrowhead rather than reading `endArrow`; after targeted rerender, the two SVG marker paths were corrected from the filled triangle `M0,0 L10,4 L0,8 Z` to the classic notched profile `M0,0 L10,4 L0,8 L3,4 Z`, then only their PNG/PDF exports were regenerated with ImageMagick. This is an export-only fix, not a renderer change: running the unmodified renderer again would revert the SVG marker until the same correction is applied.

Objective output checks: both XML/SVG parse; every source edge has `endArrow=classic` and every exported SVG connector uses the corrected marker (32/42 SVG polylines). All vertices fit source page dimensions; no non-title vertex rectangles overlap. SVG connector points and text anchors fit the SVG viewport (1540 × 2320 KYC; 1540 × 3040 listing); PNGs decode at 1925 × 2900 and 1925 × 3800, and PDFs each have one page. Listing's preview viewport is 40 units taller than its 1540 × 3000 Draw.io page because the preview renderer adds bottom clearance; it is not a newly introduced source geometry change. Pixel comparison against the original backup PNGs is non-identical but cannot isolate arrowhead changes because those backups precede the broader style/layout work. The preview renderer does not implement Draw.io itself, and no independent native Draw.io visual QA was available; these checks do not establish exact Draw.io rendering equivalence.


## Flowchart symbol semantics correction

Applied the flowchart symbol vocabulary in `/home/hrmr/.hermes/skills/drawio-skill/references/diagram-types.md` (Flowchart, lines 195–205): ellipses for START/END/TRIGGER/HANDOFF, rhombi for every decision question, parallelograms for input/output, and plain rectangles for process actions. The charts keep the user's monochrome white/black style rather than the skill's default role colors. Corrected `kyc-inspect` and `listing-inspect` from parallelograms to process rectangles: both are inspection actions, not data I/O; their values, IDs, geometry, edge endpoints, and waypoint geometry are unchanged. No data-store entity is shown; persistence operations are actions, so they remain process rectangles. All question-mark nodes are diamonds; each outgoing decision branch has a label; no rounded rectangles remain. Output-result parallelograms may end a path because they represent returned messages, not terminators.

| Diagram | Ellipse | Decision | I/O | Process | Edges | Labelled branches | Export |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `admin-kyc-review` | 13 | 9 | 6 | 4 | 32 | PASS | SVG, PNG, one-page PDF |
| `admin-listing-moderation` | 19 | 12 | 8 | 4 | 42 | PASS | SVG, PNG, one-page PDF |

Against `.hermes/backups/sprint2-flowcharts-2026-10-16_100414`, both diagrams retain exact node/edge IDs, text, endpoints, and edge labels. XML/SVG parses; all edge endpoints resolve; no node overlaps or out-of-page vertices; every source edge is represented in the SVG; PNGs decode; `pdfinfo` reports one page each; exports are newer than their sources. Native diagrams.net rendering and print-scale legibility remain unverified. For this correction, rerendered only these two source names and regenerated their SVG, PNG, and PDF exports; verified export freshness and one-page PDFs. No Jira attachments were changed during this symbol correction. SCRUM-126 remains IN DEVELOPMENT.
