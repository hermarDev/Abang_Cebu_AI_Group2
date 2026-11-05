# Feedback component decision matrix

Proposed rules, not a claim that the current application implements them. Evidence and finding IDs: [audit](validation-feedback-audit.md); copy: [inventory](error-message-inventory.md); tests: [matrix](validation-e2e-test-matrix.md).

| Condition | Component / placement | Behavior and timing | Accessibility / responsive requirements |
|---|---|---|---|
| A field-specific invalid value | Visible label above, input, then associated error; retain helper | Validate on submit and meaningful blur, update prior errors while correcting; retain input. Include server field errors; no toast. | `aria-invalid` only in invalid state; `aria-describedby` includes helper and error; focus first invalid after submit; text plus color. Avoid repeated assertive announcements. |
| Form-level recoverable failure | Inline alert near form action or summary | Preserve values; specify next step where known, keep persistent until corrected/dismissed. | Clear focus/navigation, error summary where many fields; announce appropriately, no color alone. |
| Completed low-risk action | Nonblocking toast/status | Only after actual operation confirmation. Start with 3–4 sec for simple success, 4–5 sec info; avoid duplicates. No toast substitutes for persistence. | `role=status`, polite; allow enough read time, avoid overlap with navigation/map credits, safe areas and keyboard. |
| Recoverable global failure | Persistent inline error, or actionable toast for a genuinely nonblocking event | About 5–8 sec only where no important action is lost; persistent/dismissible if retry requires time. No blind replay of unsafe writes. | Error text and reachable retry; announce without multiple simultaneous alerts. |
| Destructive or sensitive action | Explicit confirmation dialog only for consequential/irreversible action | Name outcome; cancel, confirm, pending and retained failure state. Reauthenticate when verified contract requires. | Dialog title/description, focus trap, keyboard cancel when safe, restore original connected trigger or stable fallback. |
| Continued action required | Persistent alert/banner in context | Remains until resolved; e.g. verification, restricted state, sync failure. | Action and cause when safe; do not expose account existence or provider internals. |
| Request in flight | Button label and/or local status; skeleton for loading content | Disable only conflicting submissions; do not erase prior content. Show real progress only when measurable. | `role=status` as appropriate; reduced motion; no misleading numeric progress. |
| No results / empty data | Contextual empty state in content | Explain how to recover (clear filters, widen map, browse); distinguish fetch error from zero results. | Action is keyboard reachable; no fabricated example inventory. |
| Unexpected rendering failure | Next route error boundary where a realistic failure warrants it | Offer retry/reload without revealing details; expected validation errors stay inline. | Focus/announcement of failure and action. Server diagnostics sanitized. |
| Unsaved meaningful input | Scoped leave/discard prompt | Warn only on genuine loss; cover navigation, modal close and browser unload where supported. Preview must continue to say it does not save. | Clear consequences and cancel/leave; do not block unrelated navigation unnecessarily. |

## Existing baseline

`src/components/ui/Field.tsx:7-12` supplies wrapper and error, callers supply association; `Modal.tsx:27-56` uses Radix; `Toast.tsx:23-44` has a five-second timer and polite/assertive roles. The toast is only observed in `src/components/ui/examples.tsx:50`, not a shared production notification system. `src/components/ui/Skeleton.tsx` exists. Preserve these until a demonstrated gap and a tested migration justify changes.

## Acceptance

At mobile/tablet/desktop and light/dark, verify field and action bounds, focus, scrolling, safe-area clearance, toast stacking, contrast and reduced motion in an authorized browser run; source inspection cannot establish rendered behavior. WCAG 2.2 AA is the target, not a conformance claim. Reference: https://www.w3.org/TR/WCAG22/ (direct access encountered a bot challenge during audit).
