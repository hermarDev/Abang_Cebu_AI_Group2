# SCRUM-125 Flowchart QA — 2026-10-16

## Flowchart symbol correction

Applied the flowchart vocabulary from `/home/hrmr/.hermes/skills/drawio-skill/references/diagram-types.md` (Flowchart, lines 195–205): ellipses for START/END, rhombi for decision nodes, plain rectangles for actions/persistence processes, and parallelograms for input/output. This project intentionally uses monochrome white/black styling to match the supplied SCRUM-104 visual reference; the skill's flowchart role-to-symbol mapping is retained without its default colors. No data-store entity is represented, so no cylinder is used. All question-mark nodes are rhombi, all outgoing decision edges are labeled, and no rounded rectangles remain. Output notices remain parallelograms; terminal denials/blocked results now connect to explicit END ellipses. Recovery output for draft/persistence failure routes back to the existing editor through state-check/retry edges. Uncertain handoffs route to a reconciliation process and terminate without an acceptance claim or auto-resubmit. Invalid/unknown review outcomes end after pointing to Module 4 correction; they never perform moderation writes. The auth-gate process has a labeled resume edge.

| Diagram | Ellipse | Decision | I/O | Process | Edges | Labelled branches | Export |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `landlord-listing-draft-submit` | 8 | 9 | 9 | 4 | 33 | PASS | SVG, PNG, one-page PDF |
| `landlord-listing-review-outcomes` | 11 | 8 | 8 | 5 | 32 | PASS | SVG, PNG, one-page PDF |

## Preserved graph and verification

Compared against `.hermes/backups/flowchart-terminal-fixes-2026-10-16_121151`, original IDs, text values, and endpoints are unchanged; only the explicit recovery/terminal nodes and edges described below were added. All decision branches remain labeled. XML parses, no dangling endpoints, no out-of-page vertices, and no vertex rectangle overlaps. SVG edge-polyline counts match source edges; PNG files decode; `pdfinfo` reports one page for each PDF; exports are newer than their Draw.io sources. All seven diagrams' current exports passed these checks; this note covers the two SCRUM-125 diagrams.

Updated the layout-only terminal/recovery clarification after an independent review. These terminal fixes have not yet been replaced on Jira. Native diagrams.net visual inspection is still unverified; renderer-based geometry checks do not certify native routing or print-scale legibility. SCRUM-125 remains IN DEVELOPMENT; schema/RLS, product-policy, retry/idempotency gates remain open.


## Terminal and recovery resolution (2026-10-16)

A per-node independent review identified ambiguous sinks. Resolved without changing existing decision policy: `n_gate` stays a process rectangle because it represents the SCRUM-121 invocation and has a labeled `Resume` return to auth. `n_deny`, `n_draft_block`, `n_conflict`, and `n_block` remain output parallelograms and now terminate at explicit ellipses. Output messages remain parallelograms; final denial/blocked messages now lead to explicit END ellipses. Draft and submit persistence failures now have labeled state-check/retry edges back to the editor, as required by the module specification. Uncertain Module 4 handoff now routes to a reconciliation process and explicit END without claiming acceptance or automatically resubmitting. In the review-outcome flow, invalid/unknown outcome messages terminate explicitly after routing to Module 4 correction; blocked/denied resubmission output messages likewise lead to END; persistence failure returns to the owner editor after a state check; uncertain handoff routes to re-read the authoritative outcome, never to auto-resubmit.

Verification still required after these structural changes: preserve existing node/edge IDs and labels; add only uniquely named new nodes/edges; check every endpoint, decision-branch label, geometry overlap/page bound, all diagram leaves, and regenerate the two ticket exports. Do not re-upload until that verification passes.
