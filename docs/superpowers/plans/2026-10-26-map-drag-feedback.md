# Map Drag Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

Goal: Make choosing a Cebu rental search area understandable while preserving explicit search submission.
Architecture: Extend existing MapCanvas dragstart/dragend events with one boolean. Render a pointer-transparent center crosshair and movement instruction during dragging. After release, show the existing Search this area button with Search icon and current radius. Keep applied radius circle/results fixed until explicit search.
Tech Stack: React, installed MapLibre, Lucide, CSS modules, existing Playwright fixtures.
Spec: User request of 2026-10-26; delegated design choice: restrained feedback, no pulse or automatic search.

## Global constraints
- No dependencies, backend/geographic coverage changes, schema or auth changes.
- Cebu province is product context, not a claim that the current dataset covers the province or that a province boundary is enforced.
- Preserve light/dark tokens, 44px button, expanded-sheet hiding, current search callbacks and fictional listing disclosures.
- Parent is sole writer. Reviewer is read-only. Preserve all inherited dirty work; no commit/push without scoped authorization.

## Research
- Installed node_modules/maplibre-gl/src/ui/events.ts defines dragstart and dragend as MapMovementEvent. Use actual installed contracts.
- Online MapEventType documentation fetch returned 404; do not imply successful external research.
- Existing moveend marks dirty only for user input; do not trigger searches on drag events.

## Review focus
- No instruction remains after release; resumed dragging replaces the pending CTA.
- No search callback while dragging; search uses released map center.
- Crosshair cannot intercept map gestures or markers.
- Mobile expanded sheet hides optional feedback; collapsed/half preserve clickability.
- Theme change and reduced motion do not require animation; no per-frame React updates.

## Task 1: Feedback state and presentation
Files: src/components/map/MapCanvas.tsx, MapCanvas.module.css; tests/map-drag-feedback.spec.ts.
- [ ] Write browser regression: mouse down/move shows instruction/crosshair; release shows icon/radius CTA; click dismisses it; repeat drag remains functional at 430 and 1440 widths.
- [ ] Run against baseline and retain actual failure.
- [ ] Add isDragging, dragstart/dragend handlers and cleanup. Render pointer-transparent crosshair with aria-hidden; instruction uses polite live status. Replace CTA while dragging; retain original click callback and add applied zoom update.
- [ ] Use neutral semantic surface/text/border colors; small radius caption, Search icon. Hide feedback under expanded mobile sheet via existing state hook. No pulsing or extra animation.
- [ ] Run focused browser tests plus existing map-control/theme regressions; run typecheck/lint/unit/build.

## Task 2: Independent review and delivery
- [ ] One bounded read-only QA review of current diff/tests; report only demonstrated defects and missing checks. Parent verifies findings before fixes.
- [ ] Rerun affected checks after any final edits; report exact evidence and physical-device/live-provider gaps.
Rollback: revert only this increment, preserving inherited baseline.
