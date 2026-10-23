# SCRUM-127 renter flowchart symbol QA

Corrected the three renter diagrams to use standard flowchart vocabulary: `start`, `end`, and explicit cancellation are ellipses; all question nodes are rhombi; renter/system inputs and outputs are parallelograms; other actions, including persistence, remain plain rectangles. No data-store entity is drawn, so no cylinder was introduced. Decision exit labels are preserved and present on every branch. Labels, vertex IDs, edge IDs, edge endpoints, and edge labels match the pre-change local copies in `/home/hrmr/.hermes/cache/scratch/scrum127-originals/`.

| Source stem | Vertices | Ellipse | Decision | I/O | Process | Edges | Page (px) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `renter-contact-reveal` | 11 | 2 | 4 | 4 | 1 | 14 | 1300 × 1547 |
| `renter-inquiry-viewing` | 17 | 3 | 4 | 8 | 2 | 20 | 1300 × 2065 |
| `renter-favorites` | 14 | 2 | 5 | 3 | 4 | 18 | 1300 × 1575 |

All three `.drawio` XML files parse, edge endpoints resolve, and every outgoing decision edge has a label. The targeted renderer emitted one SVG polyline per source edge; PNG and one-page PDF exports were regenerated from those SVGs. The targeted SVG geometry check excludes shared endpoints and flags strict interior connector crossings; verify it against final exports. No Jira work, commits, or pushes were performed.

Business logic remains unchanged: contact stays withheld unless the approved eligibility, abuse controls, and verified data gates pass; favorites preserves Save/Remove and permits Remove for unavailable listings; inquiry preserves schema/auth gates, form correction or explicit cancellation before persistence, duplicate-safe retry, and policy-gated scheduling.


## Flowchart symbol semantics correction

Applied the flowchart vocabulary in `/home/hrmr/.hermes/skills/drawio-skill/references/diagram-types.md` (Flowchart, lines 195–205): ellipses for start/end/cancel, rhombi for decision questions, parallelograms for input/output, and plain rectangles for action/persistence processes. Monochrome white/black is retained to match the supplied SCRUM-104 style. All question nodes are diamonds, each outgoing decision branch is labeled, and no rounded rectangles remain. No database entity is drawn; persistence operations remain processes. Output-result parallelograms may be terminal leaves when they explicitly report a result; they are not flow terminator symbols.

| Diagram | Ellipse | Decision | I/O | Process | Edges | Labelled branches | Export |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `renter-favorites` | 2 | 5 | 3 | 4 | 18 | PASS | SVG, PNG, one-page PDF |
| `renter-contact-reveal` | 2 | 4 | 4 | 1 | 14 | PASS | SVG, PNG, one-page PDF |
| `renter-inquiry-viewing` | 3 | 4 | 8 | 2 | 20 | PASS | SVG, PNG, one-page PDF |

The three diagrams retain their current graph semantics and pass XML, endpoint, decision-label, page-bound, vertex-overlap, SVG edge-count, PNG decode, and one-page PDF checks. Native diagrams.net review remains unverified; no Jira attachments were changed during this correction. SCRUM-127 remains IN DEVELOPMENT.
