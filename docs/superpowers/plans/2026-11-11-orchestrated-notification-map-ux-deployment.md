# Consolidated Master Plan: Notification System, Map UI/UX, Listing Experience & Production Deployment

**Target Repository:** `/home/hrmr/abang-cebu-ai`  
**Author:** Team-Lead (Consolidating Investigator, Designer, and Architect Audits)  
**Date:** November 11, 2026  
**Auditor Artifacts:**
- Investigator Audit: `/tmp/audit_investigator.md` (22 KB)
- Designer Audit: `/tmp/audit_designer.md` (14 KB)
- Architect Audit: `/tmp/audit_architect.md` (19 KB)

---

## 1. Confirmed Defects

1. **Exposure of Unmoderated Pending Listings on Public Map (Security/Integrity Defect):**
   - In `supabase/migrations/20261108050000_public_submitted_rentals_rpc.sql` (`get_public_submitted_rentals`), the query selects:
     `WHERE p.status IN ('pending', 'approved')`
   - In `src/app/api/rentals/route.ts`:
     `const visibleSubmittedRows = submittedRows.filter(row => row.moderation_status === "approved" || row.moderation_status === "pending");`
   - In `src/server/rentals/map-listing.ts`:
     Pending properties are assigned `available: true` and `verificationStatus: 'unverified'`.
   - **Impact:** Unreviewed/unapproved rental listings submitted by landlords appear publicly on the renter discovery map before an admin reviews and approves them.

2. **Absence of Supabase Realtime Subscription for Notifications (Freshness Defect):**
   - While `MessagingInbox.tsx` subscribes to `supabase.channel('realtime:messages:...')`, `useNotificationCenter.ts` has no `postgres_changes` subscription for `public.notifications`.
   - Notifications rely on 30s interval polling, window focus, and cross-tab `BroadcastChannel`. New notifications for inactive tabs or backgrounded sessions lag up to 30 seconds.
   - `public.notifications` is also not added to the `supabase_realtime` publication in migration scripts.

3. **False "New Inquiry" Trigger on Continued Chat Messages:**
   - In `trg_notify_on_rental_message` (`20261110000000_notifications_system.sql`), every message from a renter produces a notification titled `"New inquiry"` with `type='inquiry'`, even if it is the 10th message in an ongoing conversation.
   - Triggers for declared types `'listing_pending'`, `'listing_update'`, and `'security'` are missing in backend migrations.

4. **Mobile Navigation Notification Wiring & Fragile DOM Queries:**
   - In `src/app/landlord/dashboard/LandlordWorkspaceLayout.tsx`, `<LandlordMobileNav>` was invoked without `userId`, disabling its notification polling and unread counter badge.
   - Mobile navigation actions in `FinderNavigation.tsx` and `LandlordMobileNav.tsx` historically relied on synthetic DOM clicks (`document.querySelector('header button[aria-label^="Notifications"]').click()`) rather than explicit state controls.

5. **Notification Review Deep-Link Destination:**
   - Review notifications sent landlords to `/landlord/dashboard`, which does not display moderation feedback notes. Landlords must manually navigate to `/landlord/properties?status=rejected` or `/landlord/properties?status=pending` to view review notes.

---

## 2. UI/UX Problems

1. **Centered Modal vs Contextual Popover (Desktop):**
   - The legacy notification interface used an oversized, centered modal dialog with an opaque backdrop overlay that completely disabled map interaction while reading notifications.
   - Desktop requires a compact popover (360–400px wide) anchored directly beneath the header notification bell, allowing concurrent map exploration.

2. **Notification Filter Chips Lack ARIA Tablist Semantics:**
   - In `NotificationCenter.tsx`, `All` and `Unread` filters are rendered as plain `<button type="button">` chips without `role="tablist"`, `role="tab"`, or `aria-selected` attributes, impeding screen-reader users.

3. **Empty Results Action Boundary:**
   - In `RestoredFinderShell.tsx`, the `Expand search` button in the listing sidebar empty state only appeared when `mapRadius < 5`. If the user was already at 5 km, the expand action vanished instead of offering 10 km.
   - Empty state previously offered a misleading "Use sample data" button that loaded fictional rentals.

4. **Map Controls & Floating Assistant Clearance:**
   - Floating action buttons (Zoom In/Out, Locate Me, Floating Chatbot Launcher, and Attribution info button) risked overlapping on mobile screens when the bottom sheet transitioned between `collapsed`, `half`, and `expanded`.
   - Touch targets for compact attribution controls required proper sizing (>= 44px) and z-index coordination.

5. **Dark Mode & Contrast Fidelity:**
   - Inactive filter chips and subtle borders lacked sufficient boundary contrast in high-ambient lighting conditions on dark mode.

---

## 3. Recommended Improvements

1. **Strict Public Rental Gating:**
   - Filter `public_submitted_rentals` strictly to `p.status = 'approved'`.
   - Update `/api/rentals/route.ts` to exclude `pending` listings from the public feed.
   - Only landlords (on their dashboard/properties) and admins (in review queue) should see `pending` or `rejected` properties.

2. **Realtime Push Integration for Notifications:**
   - Add `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;` with `REPLICA IDENTITY FULL`.
   - In `useNotificationCenter.ts`, establish a Supabase Realtime channel subscription for `INSERT` and `UPDATE` on `public.notifications` filtered by `recipient_id=eq.${userId}` to provide instant updates alongside 30s fallback polling.

3. **Refined Notification Content & Smart Thread Categorization:**
   - Check if previous messages exist in `rental_conversations` before naming a notification "New inquiry" vs "New message".
   - Deep-link listing review notifications directly to `/landlord/properties?status=${status}&highlight=${property_id}`, and update `LandlordPropertiesClient` to read the highlight query param and scroll/highlight the matching property card while preserving existing status tab filtering.

4. **Accessible Notification Filter Controls & Contextual Popover:**
   - Add `role="group"` with `aria-label="Notification filters"` and `aria-pressed` toggle buttons to `All`/`Unread` chips.
   - Retain Radix Popover on desktop (screens >= 640px) and bottom Sheet on mobile (< 640px).
   - In drawer navigation, open `NotificationsModal` with a dedicated state trigger to avoid anchor collision.

5. **Progressive Search Radius Expansion:**
   - In listing empty states, allow progressive expansion: 3 km -> 5 km -> 10 km -> 15 km before declaring zero regional inventory.

---

## 4. Affected Files

| Component / Layer | File Path |
|---|---|
| **Database Migrations** | `supabase/migrations/20261108050000_public_submitted_rentals_rpc.sql` |
| | `supabase/migrations/20261110000000_notifications_system.sql` |
| | `supabase/migrations/20261110030000_strict_public_rentals_and_realtime.sql` (new) |
| **API & Server** | `src/app/api/rentals/route.ts` |
| | `src/server/rentals/map-listing.ts` |
| | `src/server/notifications-api.ts` |
| | `src/app/api/notifications/route.ts` |
| **Notifications UI** | `src/features/notifications/useNotificationCenter.ts` |
| | `src/features/notifications/NotificationBell.tsx` |
| | `src/features/notifications/NotificationCenter.tsx` |
| | `src/features/notifications/NotificationsModal.tsx` |
| **Finder & Map Shell** | `src/features/map/RestoredFinderShell.tsx` |
| | `src/features/map/RestoredFinderShell.module.css` |
| | `src/features/map/FinderNavigation.tsx` |
| | `src/components/map/MapCanvas.tsx` |
| | `src/features/map/FinderAssistant.tsx` |
| **Landlord & Admin** | `src/app/landlord/dashboard/LandlordWorkspaceLayout.tsx` |
| | `src/features/landlord/LandlordMobileNav.tsx` |
| | `src/features/admin/AdminWorkspaceLayout.tsx` |
| **Automated Tests** | `src/app/api/rentals/route.test.ts` |
| | `src/features/notifications/notifications.test.tsx` |
| | `src/features/notifications/NotificationsModal.test.tsx` |
| | `src/features/map/RestoredFinderShell.test.tsx` |

---

## 5. Implementation Strategy

- **Stage 1 (Security & Data Integrity):**
  Create migration and API updates to ensure only `status = 'approved'` listings appear in public search and rentals feed.
- **Stage 2 (Notifications Realtime & Triggers):**
  Configure Supabase Realtime publication on `public.notifications`, add client Realtime listener in `useNotificationCenter.ts`, and fix trigger copy for recurring thread messages.
- **Stage 3 (Desktop Popover & Mobile Sheet):**
  Refine `NotificationBell.tsx` and `NotificationCenter.tsx` with ARIA tablist semantics, compact empty state ("You're all caught up!"), and clean dismiss handling.
- **Stage 4 (Listing Sidebar & Map Refinement):**
  Update empty results in `RestoredFinderShell.tsx` to support progressive radius expansion (up to 10 km/15 km) and verify map control positioning across viewports.
- **Stage 5 (Verification & Delivery):**
  Run full Vitest suite (120 files), typecheck (`tsc --noEmit`), lint (`eslint`), and production build (`next build`), commit scoped changes to feature branch, push, open PR, and verify automated deployment to EC2 via GitHub Actions.

---

## 6. Task Dependencies

```
[Stage 1: Public Rentals Security Fix]
                 │
                 ▼
[Stage 2: Realtime & Notification Triggers]
                 │
                 ▼
[Stage 3: Notification UI & Accessibility]
                 │
                 ▼
[Stage 4: Listing Sidebar & Map Clearance]
                 │
                 ▼
[Stage 5: Test Verification & EC2 Deployment]
```

---

## 7. Testing Requirements

1. **Unit & Integration Tests (Vitest):**
   - Rental API returns only approved listings for unauthenticated public requests.
   - Notification API permissions: rejects suspended users (HTTP 403), validates `x-expected-user-id`.
   - Notification hook: handles mark-all-read, single mark-read, optimistic cache decrements.
   - RestoredFinderShell: progressive radius expansion in empty results.
2. **Type Checking & Linting:**
   - `pnpm exec tsc --noEmit` must pass with 0 errors.
   - `pnpm run lint` must pass with 0 warnings/errors.
3. **Production Build:**
   - `pnpm run build` with Turbopack must generate all 41 routes statically/dynamically.
4. **End-to-End Smoke Testing on EC2:**
   - Health check: `https://abangcebu.tech/api/health` -> HTTP 200 `{"status":"ok"}`.
   - Public rentals feed: `https://abangcebu.tech/api/rentals` -> HTTP 200 containing approved inventory.
   - Caddy TLS & Docker container status healthy.

---

## 8. Risks and Rollback Considerations

- **Database Migration Safety:** The public RPC update (`status = 'approved'`) is backwards-compatible and does not drop tables or alter column types. Rollback is a single `CREATE OR REPLACE FUNCTION` restoring the previous filter logic, accompanied by reverting `/api/rentals/route.ts` to restore previous pending listing handling if needed.
- **Realtime Fallback:** If WebSocket connection to Supabase Realtime fails or is blocked by network firewalls, `useNotificationCenter.ts` automatically falls back to 30-second interval polling with zero UI disruption.
- **Deployment Rollback:** The production EC2 deployment uses Docker Compose (`/opt/abangcebu/docker-compose.yml`). Rollback is achieved by pinning the previous image digest or release tag in `docker-compose.yml` (e.g. `image: ghcr.io/hermardev/abang_cebu_ai_group2:9f0e632`) and running `docker compose up -d --force-recreate` to ensure the known good artifact is deployed.
