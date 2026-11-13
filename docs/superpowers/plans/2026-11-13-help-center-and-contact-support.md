# Unified Help Center & Contact Support Implementation Plan

> **For agentic workers:** Follow the file ownership matrix below. Keep database migrations, shared types/constants, and navigation layouts coordinated. Never touch `main` — all edits happen inside `.worktrees/feat-help-center-support` on branch `feat/help-center-support`.

**Goal:** Replace the inline drawer FAQ and `mailto:` links with a unified, accessible, responsive Help Center (`/help`), secure Contact Support + ticket history (`/support`), and Admin Support Ticket Management (`/admin/support`) built on AbangCebu's existing Supabase, Turnstile, rate-limiting, notification, and Tailwind/Radix design system.

**Architecture:** Server-first Next.js App Router routes backed by a single idempotent PostgreSQL migration (`support_tickets` table, private `support-attachments` storage bucket, `SECURITY DEFINER` RPCs, and notification triggers). Zero new npm packages or paid third-party services.

**Tech Stack:** Next.js 16.3.6, React 19.2.8, TypeScript, Tailwind CSS v4 tokens (`src/app/globals.css`), `lucide-react`, `@radix-ui/react-dialog` / `@radix-ui/react-select` via `@/components/ui/*`, Sonner via `notify()`, Cloudflare Turnstile (`TurnstileWidget` + `verifyTurnstileToken`), Supabase SSR/Admin clients, Vitest + Playwright.

---

## Phase 1 — Codebase Audit Findings

### 1. Sidebar & Navigation Entry Points
- `src/features/map/FinderNavigation.tsx` (lines 58, 185–209) & `FinderNavigation.module.css` (lines 186–188):
  - Holds inline `faqOpen` state toggling a 2-paragraph `<div id="finder-faq">` under `Help & FAQ`.
  - Uses `<a href="mailto:support@abangcebu.ai">` for `Contact support`.
- `src/app/landlord/dashboard/LandlordWorkspaceLayout.tsx` (lines 41–46):
  - `Support` section has `{ href: "mailto:support@abangcebu.ai", label: "Contact Support" }` and omits any Help Center link.
- `src/features/landlord/LandlordMobileNav.tsx` (line 64):
  - `More landlord options` modal has `<a href="mailto:support@abangcebu.ai">Contact support</a>` and omits Help Center.
- `src/features/admin/AdminWorkspaceLayout.tsx` (lines 15–31, 54–72):
  - Lacks a `Support tickets` route in both `linkGroups` (desktop sidebar) and `AdminMobileNav` modal.
- `src/app/account/AccountSettingsForm.tsx` (line 330):
  - Footer text links to `mailto:support@abangcebu.ai` instead of `/support`.

### 2. Reusable Primitives & Infrastructure Found
- **Design System:** `src/app/globals.css` defines `--background`, `--foreground`, `--card`, `--muted`, `--muted-foreground`, `--action` (`#2563eb`), `--border`, `--input`, `--ring`, `--destructive`, `--success`, `--warning`, and `.dark` theme tokens + `useFinderTheme` / `ThemeSync`.
- **UI Components (`src/components/ui/`):** `Button`, `Input`, `Select`, `Card`, `Badge`, `Modal`, `Skeleton`, `Empty`, `Alert`, `Field`/`FieldError`, `Pagination`, `notify()` (`AppToaster`), `BrandLogo`.
- **Standalone Page Shell Pattern:** `src/app/account/page.tsx` and `src/app/favorites/SavedRentalsContent.tsx` use a sticky top bar (`max-w-5xl` / `max-w-6xl`, back link + `<BrandLogo />`), clean semantic sections, and `pb-[calc(5rem+env(safe-area-inset-bottom))]` clearance when `LandlordMobileNav` is present.
- **Security & Validation:**
  - `src/server/rate-limit.ts` (`createRateLimiter`, `getClientIp`) & `src/server/api-limiters.ts`.
  - `src/server/turnstile.ts` (`verifyTurnstileToken`) & `src/components/auth/TurnstileWidget.tsx`.
  - `src/app/api/property-drafts/media-validation.ts` (`inspectDraftMedia` — magic-byte inspection for JPEG, PNG, WebP, PDF).
  - `src/server/admin-access.ts` (`requireActiveAdmin`, `adminRpc`, `pageParams`, `rateLimited`, `validUuid`, `noStoreHeaders`, `x-expected-user-id` guard).
- **Notifications & Audit:**
  - `public.notifications` (`20261110000000_notifications_system.sql`) and `public.admin_audit_logs` (`20261109020000_admin_workspace_and_audit.sql`) use explicit `CHECK` constraints on `type`/`entity_type` and `action_type`/`target_type`.

### 3. Gaps, Duplications & Risks
- **UX/Accessibility:** Inline FAQ in `FinderNavigation` bloats the map drawer, lacks search/categories, and gives landlords/admins no help docs. `mailto:` links fail silently for webmail users and bypass tracking/triage.
- **Security:** `mailto:` exposes no anti-spam, rate limiting, file magic-byte validation, or authenticated user context. Direct storage writes are denied in existing buckets (`property-draft-media` pattern) and must likewise be denied on `support-attachments`.
- **Data Isolation:** Ticket visibility must enforce `user_id = auth.uid()` for authenticated requesters, hide all guest/other-user tickets from non-admins, and restrict admin triage to active (`NOT is_suspended`) admins with `x-expected-user-id` verification.

---

## Phase 2 — Architecture & File Ownership Plan

### Shared Contracts & Migrations (Coordinated Ownership — Team-Lead)
1. `supabase/migrations/20261113100000_support_tickets_and_notifications.sql`
   - `public.support_ticket_seq` + `public.support_tickets` table + RLS (`SELECT` own or active admin; writes via `SECURITY DEFINER` RPCs / `service_role`).
   - Private `support-attachments` storage bucket (5 MB limit, `image/jpeg`, `image/png`, `image/webp`, `application/pdf`) + restrictive `storage.objects` deny policy.
   - Extend `admin_audit_logs` (`'support_ticket_updated'`, `'support_ticket'`) and `notifications` (`'support'`, `'support_ticket'`) `CHECK` constraints.
   - RPCs: `submit_support_ticket(...)`, `admin_list_support_tickets(...)`, `admin_update_support_ticket(...)` + trigger `trg_notify_on_support_ticket`.
2. `src/types/database.ts`, `src/lib/support/constants.ts`, `src/lib/support/validation.ts`
   - Support ticket types, categories, statuses, priorities, FAQ dataset (`HELP_FAQ_CATEGORIES`, `HELP_FAQ_ITEMS`), pure validation/sanitization helpers, and attachment limits (`MAX_SUPPORT_FILES = 3`, `MAX_SUPPORT_FILE_BYTES = 5 * 1024 * 1024`).
3. `src/components/auth/TurnstileWidget.tsx`, `src/server/notifications-api.ts`, `src/features/notifications/NotificationCenter.tsx`, `src/features/notifications/NotificationsHubContent.tsx`, `src/server/admin-access.ts`, `src/server/api-limiters.ts`, `src/features/admin/status-badge.ts`
   - Add `"support"` to `TurnstileAction`, `NotificationType`, `NOTIFICATION_TYPES`, `TAB_TYPES.system`, and badge status mappings (`in_progress`, `closed`, `normal`, `high`, `urgent`).

### Slice A — Backend API Routes (Disjoint Ownership)
- `src/server/support-api.ts`
- `src/app/api/support/tickets/route.ts` (`GET`, `POST`)
- `src/app/api/support/tickets/[ticketId]/attachments/route.ts` (`GET`)
- `src/app/api/admin/support/route.ts` (`GET`)
- `src/app/api/admin/support/[ticketId]/route.ts` (`POST`)
- Unit tests: `src/lib/support/validation.test.ts`, `src/app/api/support/tickets/route.test.ts`, `src/app/api/admin/support/route.test.ts`

### Slice B — Help Center (`/help`) & Contact Support (`/support`) UI (Disjoint Ownership)
- `src/features/support/HelpCenterClient.tsx`
- `src/app/help/page.tsx`, `src/app/help/loading.tsx`
- `src/features/support/SupportCenterClient.tsx`
- `src/app/support/page.tsx`, `src/app/support/loading.tsx`
- Unit tests: `src/features/support/HelpCenterClient.test.tsx`, `src/features/support/SupportCenterClient.test.tsx`

### Slice C — Navigation Updates & Admin Support Queue (`/admin/support`) (Disjoint Ownership)
- `src/features/map/FinderNavigation.tsx`, `src/features/map/FinderNavigation.module.css`, `src/features/map/FinderNavigation.test.tsx`
- `src/app/landlord/dashboard/LandlordWorkspaceLayout.tsx`
- `src/features/landlord/LandlordMobileNav.tsx`
- `src/app/account/AccountSettingsForm.tsx`
- `src/features/admin/AdminWorkspaceLayout.tsx`, `src/features/admin/AdminWorkspaceLayout.test.tsx`
- `src/features/admin/AdminSupportQueue.tsx`, `src/app/admin/support/page.tsx`, `src/app/admin/support/loading.tsx`
- Unit tests: `src/features/admin/AdminSupportQueue.test.tsx`

### Slice D — E2E & Cross-Role Verification
- `tests/support-help.spec.ts` (Playwright tests covering guest, renter, landlord, admin flows, cross-account isolation, mobile 430x932 & desktop 1280px, light & dark modes, keyboard accessibility, search/accordion, validation, anti-spam/rate-limit feedback).

---

## Global Constraints & Review Focus
1. **No new third-party dependencies**; reuse `@/components/ui/*`, `lucide-react`, `notify()`, `createRateLimiter`, `verifyTurnstileToken`, `inspectDraftMedia`.
2. **Neutral placeholders only** (`"Your full name"`, `"you@example.com"`, etc. — never `"Juan dela Cruz"`).
3. **Cross-account & suspended-user safety:** Always verify `x-expected-user-id` on authenticated mutations/reads; deny suspended admins; ensure guests cannot list tickets or read attachments; ensure authenticated users only see their own tickets.
4. **Honeypot + Turnstile + Rate Limiting + Magic-Byte Attachment Validation:** Reject spoofed extensions/MIME types, reject >3 files or >5 MB, clean up uploaded objects on DB failure, fail gracefully if storage service role key is absent for optional attachments.
5. **Preserve unrelated behavior:** Leave `main` untouched, preserve existing Finder/Landlord/Admin tests and routes.
