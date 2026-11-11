# Orchestration Plan: Unified Notification System

## 1. Objectives & Overview
Implement a production-grade, role-aware notification system for AbangCebuAI spanning **Renter**, **Landlord**, and **Admin**.
- Consistent dark-mode UI with high-contrast text, circular dark gray buttons, red unread counter badge (`3`), and blue unread dot indicators matching wireframes.
- Desktop: Compact Radix-based `Popover`.
- Mobile: Responsive bottom `Sheet`.
- Header bell button placed uniformly across all three account experiences.
- Event triggers:
  - **Renter**: Landlord replies/messages (`rental_messages`), saved listing updates (`favorites` + `properties`), account security.
  - **Landlord**: Renter inquiries/messages, listing review verdicts (`property_reviews`), moderation notices.
  - **Admin**: Pending listing reviews submitted (`properties`), abuse reports filed (`abuse_reports`).
- Real-time polling (30s) + immediate local event dispatch (`abangcebu:notifications-updated`).

---

## 2. Work Breakdown & Stages

### Stage 1: Database Migration & Schema
- File: `supabase/migrations/20261110000000_notifications_system.sql`
- Table: `public.notifications`
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
  - `actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL`
  - `type text NOT NULL` (`message`, `inquiry`, `listing_update`, `listing_review`, `report`, `security`)
  - `title text NOT NULL`
  - `body text NOT NULL`
  - `link text NOT NULL`
  - `entity_type text` (`conversation`, `property`, `report`, `account`)
  - `entity_id uuid`
  - `is_read boolean NOT NULL DEFAULT false`
  - `read_at timestamptz`
  - `created_at timestamptz NOT NULL DEFAULT now()`
- RLS Policies:
  - Enable RLS on `public.notifications`.
  - Recipient SELECT: `auth.uid() = recipient_id`
  - Recipient UPDATE: `auth.uid() = recipient_id` (only allows updating `is_read` and `read_at`)
  - Recipient DELETE: `auth.uid() = recipient_id`
  - Direct INSERT disallowed from clients (only service-role / triggers).
- PostgreSQL Triggers:
  - `on_rental_message_created`: When `rental_messages` is inserted, create a notification for the counterpart participant in `rental_conversations`.
  - `on_property_review_created`: When `property_reviews` is inserted, create a `listing_review` notification for the property owner.
  - `on_abuse_report_created`: When `abuse_reports` is inserted, create a `report` notification for all admins.
- TypeScript definitions in `src/types/database.ts`.

### Stage 2: Backend API & Service Layer
- File: `src/server/notifications-api.ts`
  - Functions:
    - `fetchNotifications(userId: string, options: { unreadOnly?: boolean; limit?: number; offset?: number })`
    - `markNotificationRead(userId: string, notificationId: string)`
    - `markAllNotificationsRead(userId: string)`
    - `getUnreadNotificationCount(userId: string)`
- File: `src/app/api/notifications/route.ts`
  - `GET`: Return `{ notifications, unreadCount }` filtered by query params.
  - `PATCH`: Handles `{ action: "mark_read", id: string }` and `{ action: "mark_all_read" }`.
- Unit tests: `src/app/api/notifications/route.test.ts`.

### Stage 3: Shared UI Components & Hooks
- File: `src/components/ui/Popover.tsx`
  - Standard accessible Popover primitive powered by `@radix-ui/react-popover`.
- File: `src/features/notifications/useNotificationCenter.ts`
  - Polling hook, event listener for `abangcebu:notifications-updated`, optimistic unread count and read state updates.
- File: `src/features/notifications/NotificationBell.tsx`
  - Header icon button with circular badge, overlapping red pill for unread count.
  - Switches between `Popover` on desktop (screens >= 640px) and `Sheet` on mobile (screens < 640px).
- File: `src/features/notifications/NotificationCenter.tsx`
  - Notification panel matching Mockup 3:
    - Top header: "Notifications", "Mark all read" button.
    - Filter tabs: `All` and `Unread`.
    - Grouped list (e.g. `Today`, `Earlier`).
    - Notification card: Circular icon badge, headline, description, relative timestamp ("5 minutes ago"), bright blue unread dot.
    - Skeletons for loading state, empty state ("No notifications yet").
    - Action item click handler marking notification read and routing to target entity safely.

### Stage 4: Integration Across All 3 Roles
1. **Renter**:
   - `src/features/map/RestoredFinderShell.tsx`:
     - Render `NotificationBell` in desktop map header next to `Account` menu.
     - Render `NotificationBell` in mobile compact header next to profile avatar.
   - `src/features/map/FinderNavigation.tsx`:
     - Add `Notifications` link with unread badge in renter navigation drawer.
2. **Landlord**:
   - `src/app/landlord/dashboard/LandlordWorkspaceLayout.tsx`:
     - Add `NotificationBell` in top header `actions` area.
   - `src/features/landlord/LandlordMobileNav.tsx`:
     - Add `Notifications` action with unread badge in mobile "More" menu.
3. **Admin**:
   - `src/features/admin/AdminWorkspaceLayout.tsx`:
     - Add `NotificationBell` in admin header actions.
   - `src/features/admin/AdminWorkspaceLayout.tsx` (AdminMobileNav):
     - Add `Notifications` action with unread badge in mobile "More" options modal.

### Stage 5: Verification & Quality Assurance
- Automated unit & integration tests (`pnpm test src/features/notifications`, `pnpm test src/app/api/notifications`).
- Real-browser Playwright test harness testing popover trigger on desktop and sheet drawer on mobile across roles.
- `pnpm run lint` and `pnpm exec tsc --noEmit`.
