# Landlord "My Properties" Loading Skeleton Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Landlord "My Properties" loading skeleton into a content-matched, 3-area layout (Header, Filter Chips, List Cards) that accurately mirrors the loaded page, eliminates oversized empty card boxes, and preserves the landlord workspace navigation shell during loading.

**Architecture:** 
1. Build `LandlordPropertiesSkeleton` using `@/components/ui/Skeleton` with semantic Tailwind tokens (`bg-muted`, `border-border`, `bg-card`).
2. Structure Area 1 (Page Header + "Add property" button + divider), Area 2 (Filter tab chips), and Area 3 (2 content-matched cards with thumbnail, 3-tier text, status pill, and action buttons).
3. In `loading.tsx`, wrap the skeleton inside `LandlordWorkspaceLayout` with placeholder brand/actions so the sidebar and header remain visible during transitions without layout shift.
4. Provide accessible loading semantics (`role="status"`, `aria-busy="true"`, `aria-label="Loading properties"`, `motion-reduce:animate-none`).

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS v4, Lucide React, Vitest, React Testing Library.

**Spec:** The attached wireframe mockup ("2. How the new skeleton should look") and live `LandlordPropertiesClient.tsx` layout.

## Global Constraints

- Use existing `@/components/ui/Skeleton` component; do not install new animation or UI libraries.
- Reuse existing Tailwind theme tokens (`bg-muted`, `bg-card`, `border-border`, `text-foreground`).
- Support reduced motion (`motion-reduce:animate-none`).
- Render 2 realistic property card placeholders (matching wireframe).
- Preserve page container dimensions and responsive behavior (320px, 375px, 768px, 1280px).
- Zero horizontal overflow.

## Review Focus

1. Mobile viewport at 320px/375px: Card flexes to column without horizontal scroll, action buttons wrap cleanly.
2. Dark vs light mode: Skeleton bars and cards use theme-aware tokens (`bg-muted`, `border-border`, `bg-card`) with proper contrast in both themes.
3. Accessibility: Container has `role="status"`, `aria-busy="true"`, `aria-label="Loading properties"` and an accessible sr-only loading announcement.
4. Reduced motion: `motion-reduce:animate-none` disables pulse animation when user prefers reduced motion.
5. Workspace layout preservation: Sidebar and top navbar remain visible during page loading.

---

### Task 1: Create Unit Tests for Landlord Properties Loading Skeleton

**Files:**
- Create: `src/app/landlord/properties/loading.test.tsx`

**Interfaces:**
- Tests `LandlordPropertiesLoading` and `LandlordPropertiesSkeleton`.
- Asserts presence of Header skeleton, Filter tabs skeleton, 2 Property card skeletons with thumbnails, titles, badges, address lines, price lines, and action buttons.
- Asserts accessible attributes (`role="status"`, `aria-busy="true"`, `aria-label="Loading properties"`, `motion-reduce:animate-none`).

- [ ] **Step 1: Write the failing test in `src/app/landlord/properties/loading.test.tsx`**
- [ ] **Step 2: Run test to verify it fails against the current `loading.tsx`**
- [ ] **Step 3: Confirm failure points (missing thumbnails, missing action buttons, missing text hierarchy)**

---

### Task 2: Implement `LandlordPropertiesSkeleton` and Update `loading.tsx`

**Files:**
- Modify: `src/app/landlord/properties/loading.tsx`
- Optional component export: `src/app/landlord/properties/LandlordPropertiesSkeleton.tsx`

**Interfaces:**
- Produces: `export default function LandlordPropertiesLoading()` and `export function LandlordPropertiesSkeleton()`.
- Area 1:
  - Title: `Skeleton className="h-8 w-44 sm:h-9 sm:w-52 rounded-xl"`
  - Subtitle: `Skeleton className="h-4 w-64 sm:w-80 rounded-lg"`
  - Action Button: `Skeleton className="h-11 w-36 rounded-full"`
  - Divider rule
- Area 2:
  - 3-4 Filter Chips: `Skeleton className="h-9 w-16 sm:w-20 rounded-full"`, `Skeleton className="h-9 w-24 sm:w-28 rounded-full"`, etc.
  - Border divider
- Area 3:
  - 2 Cards matching `LandlordPropertiesClient.tsx`:
    - Container: `rounded-2xl border border-border bg-card p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`
    - Left Thumbnail: `size-20 shrink-0 rounded-xl sm:size-24`
    - Content column:
      - Top line: Title bar + Status badge pill (`h-5 w-20 rounded-full`)
      - Address line: `h-4 w-48 sm:w-64 rounded`
      - Price line: `h-4 w-32 sm:w-40 rounded`
    - Action buttons: Preview button (`h-9 w-24 rounded-full`), Edit button (`h-9 w-20 rounded-full`), Map icon button (`size-9 rounded-full`)
- Shell Integration:
  - Uses `LandlordWorkspaceLayout` with placeholder brand and actions to keep navigation bar and sidebar visible during page load.

- [ ] **Step 1: Implement `LandlordPropertiesSkeleton` in `src/app/landlord/properties/loading.tsx`**
- [ ] **Step 2: Run `loading.test.tsx` to verify all tests pass**
- [ ] **Step 3: Run existing `page.test.tsx` to ensure no regressions**

---

### Task 3: Visual & Responsive Verification across Viewports

**Files:**
- Test/Verify: `src/app/landlord/properties/loading.tsx`

- [ ] **Step 1: Test at 320px, 375px, 768px, and 1280px widths**
- [ ] **Step 2: Verify light and dark mode appearance**
- [ ] **Step 3: Run full typecheck and linter**
- [ ] **Step 4: Verify production build output**
