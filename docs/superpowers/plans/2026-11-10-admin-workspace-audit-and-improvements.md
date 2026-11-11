# AbangCebuAI — Admin Workspace Audit and Improvements Plan

**Date:** 2026-11-10  
**Status:** In Progress (Execution via Orchestrator)  
**Coordination Claim:** `71301c74-8eb4-415f-bc1e-294e60613a84`  
**Owner:** `ponytail-dev`  

---

## 1. Executive Summary & Objective

Modernize, tighten, and elevate the AbangCebu Admin Workspace to match the production quality and design standards established in the Renter and Landlord experiences, strictly adhering to existing database models, authentication roles, and shadcn/Tailwind design tokens.

The Admin workspace must effectively answer three core questions:
1. **What needs my attention?** (Pending listing reviews, open abuse/safety reports)
2. **What happened recently?** (Audit log entries for all moderation, suspension, and approval actions)
3. **Is the platform operating normally?** (Live listing counts, active accounts, system status)

---

## 2. Scope & Target Sections

1. **Admin Overview (`/admin/dashboard`):**
   - Implement the "2. Improve the Admin Overview" concept:
     - 2×2 metric grid (Pending reviews, Open reports, Live listings, Active accounts) with ↗ outward navigation links.
     - "Needs attention" panel with direct links to the Listing review queue and Reports queue with badge counts.
     - Preserve status breakdown metrics and live recent audit activity.
2. **Listing Reviews (`/admin/reviews`):**
   - Compact review card layout with submitted date/time, price, location, landlord, and unit specs.
   - Live sorting (Newest, Oldest, Rent High-Low, Rent Low-High, Title A–Z).
   - Live search input synchronized via `?search=`.
   - Inspection modal with detailed property attributes, photo gallery, and verifiable **Submission Checklist** (Address, Location pin, Monthly rent, Photos, Permit documents).
   - Explicit "Approve" (primary) and "Request changes / Reject" (outline) actions.
3. **Accounts Management (`/admin/accounts`):**
   - Compact, responsive account rows with user initials avatar, role badge, status badge, property/listing counts, and open report counts.
   - Live sorting (Name A–Z, Most properties, Most reports).
   - "Inspect account" modal displaying portfolio breakdown, abuse report status, and shortcuts to landlord listings and audit logs.
   - Safe suspension/reinstatement dialog requiring justification, with `Protected admin` safeguards preventing root admin suspension.
4. **Reports & Moderation (`/admin/reports`):**
   - Priority-styled category badges (Harassment, Scam, Safety highlighted).
   - Evidence inspector with reporter/reported chat history and target property links.
   - Resolution/Dismissal dialog with audit trail recording.
5. **Mobile & Theme Responsiveness:**
   - Eliminate bottom navigation clipping by adding content bottom padding (`pb-24` on mobile main containers).
   - Verify 100% readability, border clarity, and contrast across both Dark Mode and Light Mode on mobile (430px iPhone 14 Pro) and desktop (1280px).

---

## 3. Work Breakdown & Phased Execution

### Phase 1: Admin Overview Concept & Navigation Alignment (Completed & Verified)
- Implemented 2×2 grid with `ClipboardCheck`, `Flag`, `Building2`, `Users` icons and live counts from `admin_dashboard_overview` RPC.
- Implemented "Needs attention" panel linking to `/admin/reviews?status=pending` and `/admin/reports?status=open`.
- Cleaned unused icons, maintained zero lint/TS errors, and verified 7/7 tests passing in `src/app/admin/dashboard/page.test.tsx`.

### Phase 2: Listing Reviews & Permit Verification (Completed & Verified)
- Added Sort dropdown (`newest`, `oldest`, `price_desc`, `price_asc`, `title_asc`) and wired `initialSearch` to URL search params.
- Added data-driven `reviewChecklist(property)` checking address, coordinate pin, rent, photos, and permits.
- Formatted submitted timestamp `formatAdminDate(property.createdAt)`.
- Verified 10/10 tests passing in `src/features/admin/AdminReviewQueue.test.tsx` and 3/3 in `src/app/admin/reviews/page.test.tsx`.

### Phase 3: Accounts Management (Completed & Verified)
- Added avatar initials, live sorting (`name_asc`, `properties_desc`, `reports_desc`), and "Inspect account" modal.
- Verified 5/5 tests passing in `src/features/admin/AdminAccountsManager.test.tsx` and 3/3 in `src/app/admin/accounts/page.test.tsx`.

### Phase 4: Mobile Viewport Layout Fix (Immediate Action)
- Fix mobile bottom clipping: ensure `AdminWorkspaceLayout.tsx` main scroll area has adequate bottom padding (`pb-24 sm:pb-8`) so bottom navigation doesn't clip content.
- Ensure light mode CSS tokens render cleanly.

### Phase 5: Browser Verification & Vision Inspection (Immediate Action)
- Capture desktop (1280px) and mobile (430px) in both Dark Mode and Light Mode.
- Verify with `vision_analyze`.

### Phase 6: Independent QA & Breaker Gate (Immediate Action)
- Delegate independent acceptance and boundary testing to QA and Breaker roles via `delegate_task`.
- Run full regression suite (109+ test files, lint, typecheck).
