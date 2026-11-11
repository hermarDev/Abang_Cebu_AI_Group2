# AbangCebu AI — Listing Error UI/UX Audit & Remediation Plan

**Date:** November 11, 2026  
**Auditor:** Team-Lead / Full-Stack Engineer  
**Target Repository:** `/home/hrmr/abang-cebu-ai`  
**Classification:** Frontend UI/UX & API Resilience Remediation  

---

## 1. Audit Findings & Root Cause Analysis

When users navigate to the rental discovery map, an error-like or empty state is displayed in the listings results rail instead of showing available rental properties.

### Root Cause 1: Misleading "Filter Error" Empty State
- In `src/features/map/RestoredFinderShell.tsx`, default search radius is initialized to `2 km` centered at Fuente Osmeña / Cebu Capitol (`[123.8854, 10.3157]`).
- Live properties in the database are located in Cebu IT Park / Salinas Drive (2.87 km away) and M.J. Cuenco (2.6 km away).
- When a user lands on the site with default filters, `visibleRentals.length === 0` because properties fall just outside the 2 km radius.
- The UI previously rendered:
  - Heading: **"No rentals match these filters"** (even though the user never applied any filters).
  - Subtext: **"Try clearing filters or expanding your search radius."**
  - Dead-End Action: **"Clear filters"** button was displayed. Clicking it called `setFilters(DEFAULT_RENTAL_FILTERS)`, which resulted in a no-op because filters were already at default values.
- **User Experience Impact:** Users perceived this as a broken filter error UI/UX because the system falsely blamed filters and offered an interactive "Clear filters" action that did nothing.

### Root Cause 2: Fragile Error Propagation in `/api/rentals/route.ts`
- In `src/app/api/rentals/route.ts`:
  1. If `listingsQuery` returned an error or non-array data, the route immediately threw `new Error("Rental read failed")`, returning an HTTP 503 response and completely ignoring valid submitted properties returned by `get_public_submitted_rentals`.
  2. In `data.flatMap(row => [mapListing(row)])`, `catch (err)` caught only `err.message === "Invalid listing"`. If any row had an unsupported status, currency, or rental period, `mapListing` threw `"Unsupported listing"`, which re-threw to the outer catch and crashed the entire API endpoint with HTTP 503.
- When `/api/rentals` returned 503, `RestoredFinderShell` caught the error and rendered:
  - Icon: `Building2` inside emptyIcon circle.
  - Heading: **"Couldn’t load rentals"** with `role="alert"`.
  - Stale Copy: **"Live listings could not be loaded. No sample properties are shown."** (residual copy from legacy sample data opt-in).
  - Mobile Sheet Handle: **"Listings unavailable"**.
  - Count Badge: **"—"**.

### Root Cause 3: Stale Preview Server Listener
- A background process was running an old standalone Next.js server bound only to Tailscale IPv6 (`[fd7a:115c:a1e0::bb01:fab]:3217`) rather than `0.0.0.0` or `127.0.0.1`.
- Requests to `http://localhost:3217` or `http://127.0.0.1:3217` received `Connection refused`, and chunk scripts returned 404, freezing the browser in the SSR loading skeleton state.

---

## 2. Remediation Plan

### Phase 1: Robust API Error Handling & Graceful Degradation (`/api/rentals/route.ts`)
1. Separate `listingsQuery` and `submittedQuery` failures. If `listingsQuery` fails but `submittedQuery` succeeds, return the submitted rentals rather than throwing 503. Only return 503 if both data sources fail.
2. In `mapListing` row parsing, ensure all single-row mapping errors degrade gracefully rather than taking down the entire listing feed.

### Phase 2: Truthful & Actionable Empty States (`RestoredFinderShell.tsx`)
1. Integrate `getActiveFilterCount(filters)` to determine whether the user actually has active filters.
2. Distinguish three distinct non-error states when `visibleRentals.length === 0`:
   - **`noInventory` (`rentals.length === 0`):**
     - Title: *"No rentals found"*
     - Message: *"Try adjusting your search, expanding the search area, or browsing another location."*
     - Action: *"Expand search"*
   - **`outOfRadius` (`rentals.length > 0` and `hasActiveFilters === false`):**
     - Title: `No rentals within ${mapRadius} km`
     - Message: *"There are rentals available nearby in Metro Cebu. Expand your search area to discover them."*
     - Action: Primary *"Expand search"* button (auto-bumps to 3 km, 5 km, 10 km).
     - **Omit** the misleading *"Clear filters"* button.
   - **`filteredOut` (`rentals.length > 0` and `hasActiveFilters === true`):**
     - Title: *"No rentals match these filters"*
     - Message: *"Try clearing filters or expanding your search radius."*
     - Actions: *"Clear filters"* and *"Expand search"*.

### Phase 3: Modernize Error Copy & Action Hierarchy
1. Update `statusMessage` when `rentalStatus === "error"` from the stale *"Live listings could not be loaded. No sample properties are shown."* to *"Live listings could not be loaded. Please check your connection and try again."*.
2. Ensure the "Try again" button in the error state uses standardized primary action styling with high visual affordance.

### Phase 4: Verification
1. Run automated unit tests (`pnpm run test`).
2. Run linter (`pnpm run lint`).
3. Run production build (`pnpm run build`).
4. Verify in real browser with `browser_exec`.
