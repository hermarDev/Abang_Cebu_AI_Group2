# V8 Acceptance-Gap Audit — Read-Only Independent Assessment

**Repo:** `/home/hrmr/abang-cebu-ai`\
**Date:** 2026-10-25\
**Branch:** main @ 8 commits ahead of origin\
**Test Baseline:** Vitest 245/245 pass, Lint 0 errors, Typecheck 0 diagnostics, Build success

---

## Executive Summary

| Verdict | Status |
|---------|--------|
| **Overall Readiness** | **CONDITIONAL GO** — Core UI/UX flows implemented and tested; external blockers (live Supabase RLS/KYC, AI backend contract) remain unverified |
| **Build Health** | ✅ PASS — `pnpm build`, `tsc --noEmit`, `eslint`, `vitest run` all green |
| **Test Evidence** | 245 unit/integration tests pass; Playwright E2E **not yet run** against production build (infra setup pending) |
| **DB Mutations** | NO DB CHANGE — No migrations applied or proposed |

**Top 5 Priority Unmet Criteria (Highest Risk → Lowest):**

| # | Criterion (V8 Section) | Current State | Evidence |
|---|------------------------|---------------|----------|
| 1 | **Overlay Z-Index Stack Contract (§5)** | PARTIAL — CSS vars defined but **not enforced** across components | `globals.css:256-266` defines `--z-index-*`; `RestoredFinderShell.module.css` and `MapCanvas.module.css` use hardcoded `z-*` classes instead |
| 2 | **Mobile 3-Snap Sheet with Non-Modal Gesture Pass-Through (§7)** | PARTIAL — Peek/half/expanded states exist; **non-modal pointer-events pass-through not implemented** | `RestoredFinderShell.tsx:144-163` has sheet handle but `styles.resultsRail` lacks `pointer-events: none/auto` gating |
| 3 | **Two-Tier Draft Filter Count / Honest "Apply filters" Label (§8)** | FAIL — Dialog button shows **"Apply filters"** hardcoded; never shows dynamic draft count | `RentalFilterDialog.tsx:97` — `<Button type="submit" disabled={Boolean(budgetError)}>Apply filters</Button>` |
| 4 | **AI Assistant — Honest Disconnected State with Working Bridges (§10)** | PARTIAL — Disconnected notice exists; **misleading "Reset chat" removed but composer still renders disabled** | `FinderAssistant.tsx:14-15` — Shows "AI Assistant Not Connected" but `onSearch`/`onFilters` callbacks work |
| 5 | **Canonical `selectedRentalId` Sync Across Shell/Map/Detail (§8)** | PARTIAL — Shell owns state, `MapCanvasLoader` forwards, **MapCanvas internal `selectedRental` shadows prop** | `MapCanvas.tsx:63-64` — `const activeSelectedRental = selectedRentalId !== undefined ? selectedRentalId : selectedRental;` |

---

## Detailed Acceptance Matrix (V8 §14)

| Domain | Requirement | Status | Exact Evidence |
|--------|-------------|--------|----------------|
| **Routes & Auth** | `/`, `/login`, `/register`, `/reset-password` | ✅ PASS | Pages exist at `src/app/(auth)/*/page.tsx`, `src/app/page.tsx` |
| | 4-stage password recovery UI | ✅ PASS | `ResetPasswordForm.tsx:76-166` — Request link / Check email / Choose new password / Password updated |
| | No "Guest account" / "Renter vs Landlord login" | ✅ PASS | `RestoredFinderShell.tsx:63` — "Browsing as guest"; `LoginForm.tsx` no role toggle; `RegisterForm.tsx:114-132` uses RadioGroup |
| | Consolidated "Log In" / "Register" CTA | ✅ PASS | `RestoredFinderShell.tsx:138` — single "Log In" button; `AccountAccessContent.tsx:22-23` tabs |
| **Validation Matrix** | Inline FieldError with aria-invalid/describedby | ✅ PASS | `RegisterForm.tsx:158-162`, `LoginForm.tsx:111-118` |
| | Non-enumerating auth errors | ✅ PASS | `sign-in.ts:33-36` — "Invalid email or password" |
| | minBudget ≤ maxPrice blocking | ✅ PASS | `RentalFilterDialog.tsx:26-35` — `getBudgetError` blocks submit |
| | First-invalid focus on submit | ⚠️ PARTIAL | Not explicitly implemented in form submit handlers |
| **Place Search** | Combobox ARIA (role=combobox, aria-expanded, activedescendant) | ✅ PASS | `MapSearch.tsx:77-86` |
| | ArrowUp/Down, Enter, Escape, Clear, IME guard | ✅ PASS | `MapSearch.tsx:47-71` |
| | "Search this area" pill on map pan | ✅ PASS | `MapCanvas.tsx:357-364` |
| | No client re-filter of server results | ✅ PASS | `usePlaceLookup.ts` uses AbortController; server ranking preserved |
| **Filters** | Draft vs Applied separation | ✅ PASS | `RentalFilterDialog.tsx:38-44` — draft state separate from applied |
| | Accordion groups (Essentials, Policies) | ✅ PASS | `RentalFilterDialog.tsx:70-94` |
| | Sync with FinderQuickFilters | ✅ PASS | `RestoredFinderShell.tsx:36-48` QuickFilters reads same `filters` state |
| **Map & List Sync** | Canonical selectedRentalId (marker ↔ card ↔ detail) | ⚠️ PARTIAL | Shell owns state; MapCanvas shadows prop (see #5 above) |
| | Overlapping marker Popover (no window.prompt) | ✅ PASS | `MapCanvas.tsx:367-391` — Radix Popover with role=listbox/option |
| | ResizeObserver + rAF for map.resize() | ✅ PASS | `MapCanvas.tsx:166-174` |
| | WebGL fallback Alert | ✅ PASS | `MapCanvas.tsx:124-133, 350-355` |
| | 6 distinct inventory states | ✅ PASS | `RestoredFinderShell.tsx:129-131` — loading/error/ready/no-inventory/filtered/permission |
| **Mobile & Viewports** | 430×932, 360×800, 320px verified | ❌ NOT RUN | No Playwright mobile viewport evidence yet |
| | Non-modal sheet peek/half/expanded | ⚠️ PARTIAL | States exist but pointer-events pass-through missing |
| | --mobile-sheet-peek-height control clearance | ✅ PASS | `globals.css:60`, `RestoredFinderShell.tsx:133` style var |
| | On-screen keyboard safety | ❌ NOT VERIFIED | No test evidence |
| **Map Attribution** | © OpenMapTiles, © OSM visible & clickable | ⚠️ UNVERIFIED | MapLibre AttributionControl config not inspected in source |
| **Accessibility** | Logical heading order | ⚠️ PARTIAL | `RestoredFinderShell.tsx:165` h1 in results; map lacks h2 |
| | Modal focus trap + trigger restoration | ✅ PASS | `Modal.tsx:32-36` — onCloseAutoFocus restores trigger |
| | ≥44×44px touch targets | ✅ PASS | `Button.tsx:21-25` min-h-11/min-w-11; `globals.css:287-293` utility |
| | prefers-reduced-motion | ❌ NOT IMPLEMENTED | No `prefers-reduced-motion` media query in CSS; `flyTo` duration not guarded |
| | 200% zoom reflow | ❌ NOT VERIFIED | No test evidence |
| | WCAG AA contrast | ⚠️ UNVERIFIED | Semantic tokens exist but no automated contrast audit |
| **Build & DB Gates** | tsc --noEmit | ✅ PASS | Exit 0 |
| | eslint | ✅ PASS | 0 errors |
| | vitest | ✅ PASS | 245/245 |
| | playwright test (single server) | ❌ NOT RUN | Config exists but not executed |
| | next build | ✅ PASS | Successful |
| | Supabase RLS/KYC verified | ❌ BLOCKED | No live DB access |

---

## Unverified Gaps (Requires Live Verification)

| Area | Gap | Blocker |
|------|-----|---------|
| **Supabase Auth/RLS** | Live policy/grant verification | No production DB credentials |
| **Turnstile** | Production verification flow | Requires CF credentials |
| **AI Backend** | Real chat transport existence | No API route/service found in `src/app/api/` or `src/lib/` |
| **Map Attribution** | License-compliant credits | MapLibre style JSON not inspected |
| **Mobile E2E** | 430×932, 360×800 sheet gestures | Playwright server not started |
| **Reduced Motion** | flyTo instant-jump when prefers-reduced-motion | Not implemented in `MapCanvas.tsx:274, 336` |

---

## Confirmed Defects (Code Evidence)

### 1. Overlay Z-Index Contract Violated
```typescript
// globals.css:256-266 defines canonical scale
--z-index-map-canvas: 0;
--z-index-map-controls: 30;
--z-index-modal: 50;
--z-index-toast: 60;

// BUT MapCanvas.module.css uses hardcoded z-index:
.mapControls { z-index: 10; }  // Should be var(--z-index-map-controls)
.rentalResults { z-index: 20; } // Should be var(--z-index-bottom-sheet)
```

### 2. Two-Tier Draft Count Not Implemented
```typescript
// RentalFilterDialog.tsx:97 — HARDCODED, never shows dynamic count
<Button type="submit" disabled={Boolean(budgetError)}>Apply filters</Button>

// V8 §8 requires:
// Tier 1: If inventory loaded, show "Show X rentals" with debounced count
// Tier 2: If unavailable, show "Apply filters (N)" with active filter count
```

### 3. MapCanvas selectedRentalId Shadowing
```typescript
// MapCanvas.tsx:63-64 — internal state shadows external prop
const [selectedRental, setSelectedRental] = useState<string | null>(null);
const activeSelectedRental = selectedRentalId !== undefined ? selectedRentalId : selectedRental;

// Breaks canonical sync: onSelectRental from shell updates prop but internal state may diverge
```

### 4. Non-Modal Sheet Gesture Pass-Through Missing
```css
/* RestoredFinderShell.module.css — resultsRail lacks pointer-events gating */
.resultsRail {
  /* Missing: pointer-events: none on wrapper, pointer-events: auto on visible surface */
}
```
V8 §7: "Wrapper containers must use `pointer-events: none` with `pointer-events: auto` only on the visible panel/sheet surface"

### 5. prefers-reduced-motion Not Implemented
```typescript
// MapCanvas.tsx:274, 336 — flyTo always uses duration
map.flyTo({ center, zoom, duration: 1000 });  // No reduced-motion guard
map.flyTo({ center: selected.coordinates, zoom, duration: 350 });
```
V8 §12: "Replace animated flyTo and spring transitions with instant jumps when reduced motion is active"

### 6. AccountAccessContent Uses Buttons as Tabs (Not RadioGroup)
```tsx
// AccountAccessContent.tsx:21-23 — Buttons with aria-pressed, NOT RadioGroup
<div role="group" aria-label="Account access">
  <button aria-pressed={mode === "sign-in"}>Log In</button>
  <button aria-pressed={mode === "sign-up"}>Register</button>
</div>
```
V8 §9: "Single Login Form: Never reintroduce... role resolution comes authoritatively from authenticated user's Supabase profile" — OK for mode switch but should use RadioGroup for consistency with RegisterForm

### 7. Sample Data Button Still Renders in Production Path
```tsx
// RestoredFinderShell.tsx:167 — guarded by samplesAllowed (dev/test only)
{samplesAllowed && <button onClick={() => setSampleMode(true)}>Use sample data</button>}

// V8 §6.3: "Remove public-facing 'Use sample data' buttons/toggles from production builds"
// Current: NODE_ENV check works but button still in DOM (hidden by condition)
```

### 8. Modal Z-Index Uses Hardcoded Value
```tsx
// Modal.tsx:28, 39 — uses z-[var(--z-index-modal-backdrop)] and z-[var(--z-index-modal)]
// BUT globals.css:265-266 defines --z-index-modal-backdrop: 50, --z-index-modal: 50
// These are SAME level — backdrop and content at same z-index
```

---

## Verified Working (✅ PASS with Evidence)

| Feature | Evidence |
|---------|----------|
| Radix primitive family locked (@radix-ui/react-dialog, radio-group, popover) | `package.json:18-20` |
| Unified coastal semantic tokens on :root/.dark | `globals.css:8-136` |
| Manrope font bound to --font-sans | `globals.css:244`, `layout.tsx:7,22` |
| RentalFilters canonical contract preserved | `src/contracts/rental-filters.ts` unchanged |
| RegisterForm uses RadioGroup for role selection | `RegisterForm.tsx:114-132` |
| MapSearch Combobox with full ARIA | `MapSearch.tsx:77-86` |
| ResizeObserver + rAF in MapCanvas | `MapCanvas.tsx:166-174` |
| Overlapping marker Popover (no window.prompt) | `MapCanvas.tsx:367-391` |
| Password recovery 4-stage UI | `ResetPasswordForm.tsx:76-166` |
| Non-enumerating auth errors | `sign-in.ts:33-36` |
| Turnstile gating in production | `RegisterForm.tsx:34, 65-68` |
| Safe redirect allowlist | `sign-in.ts:7-9`, `types/auth.ts:616-645` |

---

## Release Recommendation

### CONDITIONAL GO

**Conditions to resolve before production:**
1. **Run Playwright E2E** against single shared production server (mobile 430×932, 360×800, desktop 1440×900)
2. **Implement prefers-reduced-motion** guards on all `flyTo` calls
3. **Enforce z-index CSS variables** across all overlay components (remove hardcoded z-index)
4. **Implement Two-Tier Draft Count** in `RentalFilterDialog` per V8 §8
5. **Fix selectedRentalId shadowing** in `MapCanvas` — use prop exclusively
6. **Add pointer-events pass-through** for mobile sheet non-modal states
7. **Verify MapLibre AttributionControl** renders required OSM/OpenMapTiles credits
8. **Document AI backend blocker** — no `/api/chat` or transport service found; disconnected state is honest but external dependency unresolved

**No DB changes required.** All Supabase interactions use existing contracts. Live RLS/KYC verification remains **NOT VERIFIED** — recommend staging rehearsal before production deploy.

---

## Files Inspected (Key Evidence)

| File | Lines | Relevance |
|------|-------|-----------|
| `src/features/map/RestoredFinderShell.tsx` | 187 | Main shell, sheet, selection, filters, auth |
| `src/components/map/MapCanvas.tsx` | 454 | Map, markers, Popover, ResizeObserver, flyTo |
| `src/features/rentals/RentalFilterDialog.tsx` | 102 | Draft/applied filters, budget validation |
| `src/components/map/MapSearch.tsx` | 152 | Combobox ARIA, IME, AbortController |
| `src/components/auth/RegisterForm.tsx` | 287 | RadioGroup role, validation, Turnstile |
| `src/components/auth/LoginForm.tsx` | 140 | Unified login, non-enumerating errors |
| `src/components/auth/ResetPasswordForm.tsx` | 170 | 4-stage recovery |
| `src/app/globals.css` | 363 | Tokens, z-index, font, touch targets |
| `src/contracts/rental-filters.ts` | 252 | Canonical filter types |
| `src/lib/auth/sign-in.ts` | 83 | Server role resolution, safe redirects |
| `package.json` | 44 | Dependencies, Radix family locked |

---

**Audit Methodology:** Read-only source inspection, test execution (vitest), build/lint/typecheck verification, contract-to-implementation traceability. No network calls, no live DB access, no mutations.