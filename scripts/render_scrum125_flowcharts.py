# SCRUM-125 Flowchart Validation Notes

## `landlord-listing-draft-submit`
- PASS (logical/structural): authenticated session and landlord role gates; valid/invalid property and unit paths; save-draft and pending-review handoff; persistence gate to end; no disconnected nodes or unresolved endpoints.
- Draw.io XML parses; SVG and PDF render outputs exist.
- Independent visual inspection: no overlapping nodes/connectors detected; branch labels readable; top-to-bottom layout clear.

## `landlord-listing-review-outcomes`
- REWORK (original): approval/rejection branches were conflated; no-resubmit route ended at incorrect state; resubmit outcome was not clear.
- Corrected source: approval goes directly to approved state; rejection reason required; declined resubmission ends rejected/non-public; resubmission leads to pending review in SCRUM-126; availability gates public discovery.
- Pending independent visual QA and validation against the ERD resubmission policy; state transition remains an explicit product/schema dependency.

The renderer above generates editable-source previews with orthogonal obstacle-aware connectors; PDF/PNG exports were raster/vector generated from the preview. Final diagram QA needs to confirm layout and labels after the correction.

