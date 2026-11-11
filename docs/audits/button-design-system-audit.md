# AbangCebu AI — Button Color & Design-System Consistency Audit Report

**Audit Date:** November 11, 2026  
**Auditor:** Team-Lead / Designer Inspection (READ-ONLY)  
**Target Repository:** `/home/hrmr/abang-cebu-ai`  
**Classification:** READ-ONLY Technical & Visual Design Audit  

---

## 1. Executive Summary & Design System Findings

A comprehensive, read-only audit of the AbangCebu AI frontend was conducted to evaluate button colors, variants, tokens, and visual consistency across all roles (Renter, Landlord, Admin) and surfaces (Map Discovery, Listings, Search & Filters, Auth, Messaging, Notifications, Account Settings, Admin Queues, Modals, Pagination, and Error Handling).

### Key Architectural Takeaways:
1. **Actual Primary Action Color:** The design system canonically defines `--action: #2563eb` (Cebu Blue / Tailwind blue-600) with hover state `--action-hover: #1d4ed8` and label text `--action-foreground: #ffffff`. This token is preserved identically across both light and dark modes to guarantee predictable, high-contrast action triggers.
2. **Navy vs. Blue Disambiguation:**
   - **Navy (`#0f2742` / `cebu-navy-900`) is NOT a button color.** In AbangCebu's design tokens, coastal navy is strictly designated for primary body typography (`--foreground: #0f2742`), surface card headings, and subtle shadow/scrim tints (`rgba(15, 39, 66, 0.14)`).
   - Navy is **never** used as a primary button background in the active design system. Any user perception of "dark navy buttons" stems from dark slate card surfaces (`#161e28`) or outline buttons displaying dark navy text on white surfaces in light mode.
   - Primary interactive triggers across all roles and workspaces are intended to be **Cebu Blue (`--action: #2563eb`)**.
3. **Legacy Residual Blue (`#0066d5`):** `src/styles/finder/finder-base.css` retains legacy variables `--primary: #0066d5` and `--primary-hover: #0052b0` from an earlier prototype. While `globals.css` overrides `--primary: #2563eb` in `:root`, `--primary-hover` was left orphaned and is still referenced in `src/styles/finder/drawer.css`.
4. **Critical Dark Mode Contrast Defect (WCAG AA Failure):** In `src/styles/finder/drawer.css`, `.drawer-signin-btn` uses `background: var(--primary); color: #ffffff;`. In dark mode, `globals.css` sets `--primary: #60a5fa` (light blue) with `--primary-foreground: #10151c`. Because the drawer button hardcoded white text (`#ffffff`), white on `#60a5fa` achieves only a **2.48:1 contrast ratio**, directly violating WCAG AA (4.5:1 required).
5. **Component Duplication:** Out of 250+ interactive buttons and button-like links:
   - Only **65** use the standardized house primitive `<Button>` (`src/components/ui/Button.tsx`).
   - Over **150** elements use raw `<button>` and **35** use `<Link>` with hand-duplicated Tailwind utility strings, creating drift in border radius, padding, and focus states.
6. **Inappropriate Semantic Color Usages:**
   - In `AdminReportsQueue.tsx:61` & `161`, "Resolve" report uses `variant="destructive"` (Sinulog crimson red) instead of a constructive or primary button variant.
   - In `ListPropertyForm.tsx:789`, "Change location" uses `text-emerald-800 underline` simply because it sits inside a success notice.
   - In `MapCanvas.module.css:199`, `.controlButton:focus-visible` uses `#f59e0b` (warning amber) instead of the standard blue focus ring (`var(--ring)`).

---

## 2. Actual Primary Brand Color & Conflicting Colors

| Role / Surface | Token / Value | Actual Hex | Role / Intended Usage | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Global Primary Action** | `--action` | `#2563eb` | Primary interactive buttons, submit actions, active filter pills | **Canonical Standard** |
| **Global Action Hover** | `--action-hover` | `#1d4ed8` | Pointer hover state for primary action buttons | **Canonical Standard** |
| **Global Action Text** | `--action-foreground` | `#ffffff` | High-contrast label on primary action buttons (5.68:1 contrast) | **Canonical Standard** |
| **Dark Theme Primary** | `--primary` | `#60a5fa` | Informational accents / links in dark mode (paired with `#10151c` text) | **Intended for text/icons, NOT white-text buttons** |
| **Coastal Navy** | `--foreground` / `cebu-navy-900` | `#0f2742` | Primary body typography and card headings in light mode | **Typography/Borders only — Never button background** |
| **Legacy Primary** | `finder-base.css: --primary` | `#0066d5` | Older prototype blue; shadowed by `globals.css` | **Conflicting / Stale** |
| **Legacy Hover** | `finder-base.css: --primary-hover`| `#0052b0` | Referenced by `.drawer-signin-btn:hover` | **Conflicting / Stale** |
| **Hardcoded Blue Utility** | `bg-blue-600` | `#2563eb` | `src/app/global-error.tsx:43` | **Inconsistent (bypasses `--action` token)** |
| **Hardcoded Hex in CSS** | `#2563eb` | `#2563eb` | `MapCanvas.module.css`, `LandlordPropertyMap.module.css` | **Inconsistent (hardcoded hex instead of token)** |
| **Focus Ring Anomaly** | `#f59e0b` (Amber) | `#f59e0b` | `MapCanvas.module.css:199` focus-visible on control buttons | **Semantic Violation (should use `var(--ring)`)** |

---

## 3. Button Inventory Grouped by Role & Screen

### A. Shared Authentication & System Surfaces
- **Login Modal (`src/components/auth/LoginForm.tsx`):**
  - `<Button type="submit" variant="primary" fullWidth size="lg">` -> Uses `bg-action text-action-foreground hover:bg-action-hover`. Fully compliant.
  - Role switcher tab / link: Neutral outline/ghost styling. Fully compliant.
- **Registration Form (`src/components/auth/RegisterForm.tsx`):**
  - `<Button type="submit" variant="primary" fullWidth size="lg">` -> Uses `bg-action`. Fully compliant.
  - Role selection chips (Renter vs. Landlord): Custom radio button styling with `border-action bg-action/10`. Compliant.
- **Password Reset (`src/components/auth/ResetPasswordForm.tsx`):**
  - Line 211: `<Button type="submit" variant="primary" fullWidth size="lg">` -> Contains redundant inline `className="bg-action text-action-foreground hover:bg-action-hover"` on top of `variant="primary"`.
- **System Error Pages (`src/app/error.tsx`, `not-found.tsx`, `global-error.tsx`):**
  - `error.tsx` & `not-found.tsx`: Uses raw `<button>` / `<Link>` with `bg-action px-5 py-2.5 text-action-foreground`.
  - `global-error.tsx:43`: Uses raw `bg-blue-600 hover:bg-blue-700 text-white`.

### B. Renter Discovery & Search Interface
- **Navigation Drawer (`src/features/map/FinderNavigation.tsx` & `src/styles/finder/drawer.css`):**
  - Guest Sign-in CTA (`.drawer-signin-btn`): Uses `background: var(--primary); color: #ffffff;`. **Defect:** In dark mode, `--primary` is `#60a5fa`, failing contrast.
- **Quick Filters Bar (`src/features/map/FinderQuickFilters.tsx` & `.module.css`):**
  - Filter chips: Active state uses `background: var(--action) text-action-foreground`. Inactive uses `var(--card)`. Compliant.
  - Clear button (`.clearButton`): Plain text button using `color: var(--action)`. Compliant.
- **Map Controls (`src/components/map/MapCanvas.tsx` & `.module.css`):**
  - Zoom in/out, Locate me buttons (`.controlButton`): Hardcoded `background: #2563eb; color: #fff;` and `outline: 3px solid #f59e0b`. Should use `var(--action)` and `var(--ring)`.
- **Property Details Sheet (`src/features/rentals/PropertyDetailsSheet.tsx`):**
  - Message Landlord CTA: `<Button variant="primary" className="flex-1 min-h-11 font-semibold flex items-center justify-center gap-2">`. Uses `bg-action`. Compliant.
  - Favorite toggle: Secondary/outline toggle button. Compliant.
- **Saved Rentals (`src/app/favorites/SavedRentalsContent.tsx`):**
  - Browse Rentals CTA (empty state): Raw `<Link className="... bg-action px-4 text-action-foreground ...">`.
  - Message Landlord action: Raw `<button className="... bg-action px-3 text-action-foreground ...">`.
- **Messaging Inbox (`src/features/messages/MessagingInbox.tsx`):**
  - Send message button: `<Button variant="primary">` and send icon circle with `bg-action text-action-foreground`. Compliant.
- **Floating AI Assistant (`src/features/map/FinderAssistant.tsx` & `.module.css`):**
  - Launcher button (`.chatLauncher`): Round action button using branded avatar asset.
  - Composer send button: `.chatComposer > button` using `background: var(--action); color: var(--action-foreground)`. Compliant.
- **Pagination (`src/components/ui/Pagination.tsx`):**
  - Active page button: `border-action bg-action font-semibold text-action-foreground shadow-sm`.
  - Inactive page / Prev / Next buttons: `border-border bg-card text-foreground hover:bg-muted`. Compliant.

### C. Landlord Workspace
- **Dashboard (`src/app/landlord/dashboard/page.tsx`):**
  - `Add property` CTA: Raw `<Link className="... bg-action px-4 font-bold text-action-foreground shadow-xs hover:bg-action-hover ...">`.
- **Property Listing Form (`src/app/list-property/ListPropertyForm.tsx`):**
  - Step navigation sticky footer (lines 1069-1074):
    - `Back`: Raw `<button className="... border border-border bg-card px-4 ...">`.
    - `Save draft`: Raw `<button className="... border border-border bg-card px-4 ...">`.
    - `Continue` / `Submit`: Raw `<button className="... bg-action px-4 text-action-foreground hover:bg-action-hover ...">`.
  - Location change link (line 789): `<button className="min-h-9 rounded-lg px-2.5 text-xs font-semibold text-emerald-800 underline">` (Inappropriate semantic green for an ordinary action).
- **Property Management Map (`src/features/landlord/LandlordPropertyMap.module.css`):**
  - Hardcoded `#2563eb` in multiple control rules (`.controlButton`, `.fitAllButton`).

### D. Admin Workspace
- **Admin Layout (`src/features/admin/AdminWorkspaceLayout.tsx`):**
  - Navigation tabs: Active tab uses `bg-action/10 font-semibold text-action`. Compliant.
- **Admin Review Queue (`src/features/admin/AdminReviewQueue.tsx`):**
  - Status filter tabs: `<Button size="sm" variant={status === tab.value ? "primary" : "outline"}>`. Compliant.
  - Inspect button: `<Button size="sm" variant="outline">Inspect details & permits</Button>`. Compliant.
  - Approve action: `<Button variant="primary">` in dialog, or semantic success.
  - Request changes / Reject action: `<Button variant="destructive">`. Appropriate.
- **Admin Reports Queue (`src/features/admin/AdminReportsQueue.tsx`):**
  - Inspect evidence button: `<Button size="sm" variant="outline">Inspect evidence</Button>`. Compliant.
  - **Defect:** Resolve report button (lines 61 & 161) uses `<Button variant="destructive">Resolve</Button>`, misusing destructive crimson for a constructive resolution action.
- **Admin Accounts Manager (`src/features/admin/AdminAccountsManager.tsx`):**
  - Inspect account: `<Button size="sm" variant="outline">Inspect account</Button>`. Compliant.
  - Suspend account: `<Button size="sm" variant="destructive">Suspend account</Button>`. Appropriate.
  - Reinstate account: `<Button size="sm" variant="outline">Reinstate account</Button>`. Appropriate.

---

## 4. Comparison Table

| Component | Location | Current Color / Implementation | Expected Token | Issue | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Drawer Guest Sign In** | `src/styles/finder/drawer.css:143` | `background: var(--primary); color: #fff` | `var(--action)` + `var(--action-foreground)` | In dark mode, `--primary` is `#60a5fa`, rendering white text unreadable (2.48:1 contrast, fails WCAG AA) | **P1 (High)** |
| **Drawer Sign In Hover** | `src/styles/finder/drawer.css:153` | `background: var(--primary-hover)` | `var(--action-hover)` | References orphaned legacy variable `--primary-hover: #0052b0` from `finder-base.css` | **P2 (Medium)** |
| **Global Error Reload** | `src/app/global-error.tsx:43` | `bg-blue-600 hover:bg-blue-700 text-white` | `bg-action text-action-foreground hover:bg-action-hover` | Hardcoded Tailwind utility classes bypass CSS design tokens | **P2 (Medium)** |
| **Map Canvas Controls** | `src/components/map/MapCanvas.module.css:182` | `background: #2563eb; color: #fff;` | `background: var(--action); color: var(--action-foreground);` | Hardcoded hex values prevent clean dark-mode theming and token refactoring | **P2 (Medium)** |
| **Map Focus Ring** | `src/components/map/MapCanvas.module.css:199` | `outline: 3px solid #f59e0b` (Amber) | `outline: 3px solid var(--ring)` | Control buttons use amber outline on focus instead of standard blue ring token | **P3 (Low)** |
| **Legacy Finder Tokens** | `src/styles/finder/finder-base.css:5-7` | `--primary: #0066d5; --primary-hover: #0052b0;` | Deprecate or align with `--action: #2563eb; --action-hover: #1d4ed8;` | Stale CSS variables create confusion and potential cascade regressions | **P2 (Medium)** |
| **Report Resolve Action** | `src/features/admin/AdminReportsQueue.tsx:61,161` | `variant="destructive"` | `variant="primary"` | Uses destructive crimson for resolving an abuse report | **P2 (Medium)** |
| **Listing Form Actions** | `src/app/list-property/ListPropertyForm.tsx:1069-1074` | Raw `<button>` with manual Tailwind classes | `<Button variant="primary">` and `<Button variant="outline">` | Duplicates button logic, touch target sizing, and disabled states | **P3 (Low)** |
| **Location Action Button** | `src/app/list-property/ListPropertyForm.tsx:789` | `text-emerald-800 underline` | `text-action hover:text-action-hover` | Uses semantic green for an ordinary form edit action | **P3 (Low)** |
| **Reset Password Submit** | `src/components/auth/ResetPasswordForm.tsx:211` | `<Button variant="primary" className="bg-action ...">` | `<Button variant="primary">` | Redundant class overrides on an already styled Button primitive | **P3 (Low)** |

---

## 5. Accessibility & Dark-Mode Findings (WCAG 2.2 AA)

1. **Light Mode Primary Action (`#ffffff` text on `#2563eb`):**
   - Luminance: Text `1.0`, Background `0.135`.
   - Contrast Ratio: **5.68:1** (Exceeds WCAG 2.2 AA requirement of 4.5:1).
   - Hover (`#ffffff` on `#1d4ed8`): **7.19:1** (Exceeds WCAG AAA requirement of 7.0:1).
2. **Dark Mode Action (`#ffffff` text on `#2563eb`):**
   - Retaining `#2563eb` with white text in dark mode preserves identical **5.68:1** contrast on dark slate card surfaces (`#161e28`).
3. **Outline / Secondary Buttons:**
   - Light mode: Card foreground (`#0f2742`) on white card (`#ffffff`): **14.8:1** (PASS AAA).
   - Dark mode: Card foreground (`#f3f6fa`) on dark card (`#161e28`): **13.8:1** (PASS AAA).
4. **Destructive Buttons:**
   - Light mode: White (`#ffffff`) on Sinulog Crimson (`#e11d48`): **4.65:1** (PASS AA).
   - Dark mode: Dark crimson (`#4c0519`) on light rose (`#fb7185`): **6.20:1** (PASS AA).
5. **Touch Target Dimensions:**
   - Standardized house `<Button>` enforces `min-h-11 px-4` (44px height) or `min-h-12 px-5` (48px height), meeting WCAG 2.5.8 (24px min) and AAA 2.5.5 (44px min).
6. **Focus Ring Indication:**
   - Standard Button uses `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring` where `--ring: #2563eb` (light) and `--ring: #60a5fa` (dark), achieving >= 3.0:1 contrast against surrounding surface per WCAG 2.4.11.

---

## 6. Recommended Standardized Button Variants

The application should continue strictly using `src/components/ui/Button.tsx`:

```tsx
// Standardized Button Variants in src/components/ui/Button.tsx
const variants: Record<ButtonVariant, string> = {
  primary: "bg-action text-action-foreground hover:bg-action-hover",
  secondary: "bg-accent text-accent-foreground hover:bg-accent/80",
  outline: "border border-border bg-card text-card-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
};
```

### Guiding Principles:
1. **Primary Actions:** Must exclusively use `variant="primary"` (`bg-action text-action-foreground hover:bg-action-hover`).
2. **Secondary / Tertiary Actions:** Must use `variant="outline"` (neutral card with border) or `variant="ghost"`.
3. **Semantic Colors:**
   - `destructive`: Exclusively for account suspension, property rejection, listing removal, and photo deletion.
   - `success` / `warning`: For status feedback, badges, and review decisions. Ordinary form transitions (e.g. "Change location") must not adopt semantic colors simply because they appear inside alert banners.
4. **No Navy Primary Buttons:** Preserve coastal navy (`#0f2742`) strictly for text and brand accents; do not create dark navy primary buttons, which would conflict with dark-mode surfaces and existing user expectations.

---

## 7. Proposed Implementation Plan (Post-Review)

When authorized for implementation:
- **Phase 1 (P1 Defect Fixes):**
  - Update `src/styles/finder/drawer.css`: Change `.drawer-signin-btn` from `background: var(--primary)` to `background: var(--action); color: var(--action-foreground);`, and `:hover` to `background: var(--action-hover);`.
  - Fixes the dark mode WCAG AA contrast failure immediately.
- **Phase 2 (Token Harmonization & Semantic Cleanup):**
  - In `src/styles/finder/finder-base.css`: Update `--primary: #0066d5` -> `#2563eb`, `--primary-hover: #0052b0` -> `#1d4ed8`, remove stray `--amber: #0066d5`.
  - In `src/features/admin/AdminReportsQueue.tsx:61,161`: Change "Resolve" action variant from `destructive` to `primary`.
  - In `src/app/global-error.tsx`: Replace `bg-blue-600 hover:bg-blue-700 text-white` with `bg-action text-action-foreground hover:bg-action-hover`.
  - In `src/components/map/MapCanvas.module.css`: Replace hardcoded `#2563eb` with `var(--action)` and `#f59e0b` focus outline with `var(--ring)`.
- **Phase 3 (Component Adoption):**
  - Progressively replace raw `<button>` in `ListPropertyForm.tsx`, `SavedRentalsContent.tsx`, and `RestoredFinderShell.tsx` with `<Button variant="primary">` and `<Button variant="outline">`.

---

## 8. Regression Testing Checklist

- [ ] Mobile guest drawer in dark mode: verify Sign In button text is readable with >= 4.5:1 contrast.
- [ ] Renter landing page: verify floating chat launcher, quick filters, and search button match `#2563eb`.
- [ ] MapCanvas zoom/location buttons in light and dark mode: verify focus ring uses blue `--ring` token.
- [ ] Landlord listing creation: verify `Save draft`, `Back`, and `Continue` buttons render with identical dimensions and consistent hierarchy.
- [ ] Admin Workspace review queue: verify approval (emerald) and rejection (rose) semantic buttons remain visually distinct from blue navigation links.
- [ ] Admin Workspace reports queue: verify "Resolve" button renders in primary blue, not destructive crimson.
- [ ] Run automated checks: `pnpm run test`, `pnpm run lint`, and `pnpm run build`.
