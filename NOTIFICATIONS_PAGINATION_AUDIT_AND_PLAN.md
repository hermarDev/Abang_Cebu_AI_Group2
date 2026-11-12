# Notifications Pagination — Audit & Implementation Plan

## Executive Summary

**Finding:** The notifications hub page (`/notifications`) **already has full server-side pagination** implemented. The gap is in the `NotificationCenter` component used by the notification bell (modal/popover), mobile sheet, and drawer — these currently render all notifications without pagination.

**Scope:** Add pagination to `NotificationCenter` to match the hub page behavior. No backend changes needed — the API and hook already support `limit`, `offset`, and `totalCount`.

---

## Audit Results

### ✅ Already Implemented (Hub Page — `NotificationsHubContent.tsx`)

| Feature | Status | Location |
|---------|--------|----------|
| Server-side pagination (limit/offset) | ✅ | `loadPage()` calls `fetchNotificationsClient` with `limit=20`, `offset=(page-1)*20` |
| Total count from API | ✅ | `payload.totalCount` → `totalPages = Math.ceil(totalCount / PAGE_SIZE)` |
| Pagination UI component | ✅ | `<Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalCount} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />` |
| Page reset on tab/search change | ✅ | `setCurrentPage(1)` in tab click handler and search input |
| Tab counts (all/unread/messages/listings/system) | ✅ | `includeCounts=true` in fetch |

### ❌ Missing (NotificationCenter — used by Bell, Sheet, Drawer)

| Feature | Status | Required Changes |
|---------|--------|------------------|
| Pagination state (currentPage, totalPages) | ❌ | Add `useState` for page, compute `totalPages` from `totalCount` |
| Fetch with limit/offset | ❌ | Pass `limit`, `offset` to `useNotificationCenter` fetch |
| Total count from API | ❌ | Hook returns `hasMore` but not `totalCount` — need to expose it |
| Pagination UI component | ❌ | Import and render `<Pagination>` at bottom of list |
| Page reset on filter change | ❌ | Reset page when "All/Unread" filter changes |

### Backend / Hook Support (Already Ready)

| Component | Pagination Support |
|-----------|-------------------|
| `/api/notifications` GET | ✅ Accepts `limit`, `offset`, returns `totalCount` |
| `fetchNotificationsClient()` | ✅ Accepts `limit`, `offset` in query |
| `useNotificationCenter` hook | ⚠️ Shared cache returns `hasMore` but **not `totalCount`** — needs extension |
| `fetchNotifications()` (server) | ✅ Returns `totalCount` via `.select("*", { count: "exact" })` |

---

## Implementation Plan

### Phase 1: Extend `useNotificationCenter` to Support Pagination (Shared Hook)

**File:** `src/features/notifications/useNotificationCenter.ts`

**Changes:**
1. Add `pageSize` parameter (default 20) to hook options
2. Add `currentPage` state (internal or controlled)
3. Modify `loadNotifications` to accept `page` / `offset` and return `totalCount`
4. Expose `totalCount`, `totalPages`, `currentPage`, `setPage` in return value
5. Reset page to 1 when `force` fetch is triggered (refresh, realtime update)

**Type Changes:**
```typescript
// Add to FetchNotificationsResponse
totalCount: number;  // already exists
// Add to hook return
currentPage: number;
totalPages: number;
setPage: (page: number) => void;
pageSize: number;
```

### Phase 2: Add Pagination to `NotificationCenter` Component

**File:** `src/features/notifications/NotificationCenter.tsx`

**Changes:**
1. Accept new props: `currentPage`, `totalPages`, `totalCount`, `pageSize`, `onPageChange`
2. Or consume from `useNotificationCenter` directly (preferred — single source of truth)
3. Render `<Pagination>` component at bottom of notification list when `totalPages > 1`
4. Reset page to 1 when filter changes ("All" ↔ "Unread")

### Phase 3: Wire Up Consumers

**Files to update:**
1. `NotificationsModal.tsx` — Pass pagination props through to `NotificationCenter`
2. `NotificationBell.tsx` — Pass pagination props (both Popover and Sheet paths)
3. `LandlordMobileNav.tsx` — Uses `useNotificationCenter` directly for badge count only; no pagination UI needed

### Phase 4: Tests

- Update `notifications.test.tsx` to verify pagination renders and page changes trigger fetch
- Add test for filter change resetting page

---

## File Change Summary

| File | Change Type | Est. Lines |
|------|-------------|------------|
| `useNotificationCenter.ts` | Extend hook with pagination state & fetch params | ~40 |
| `NotificationCenter.tsx` | Add Pagination UI, consume pagination state | ~25 |
| `NotificationsModal.tsx` | Pass pagination props (minimal) | ~5 |
| `NotificationBell.tsx` | Pass pagination props (two render paths) | ~10 |
| `notifications.test.tsx` | Add pagination tests | ~30 |

**Total: ~110 lines across 5 files**

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Shared cache inconsistency across components (bell, modal, hub) | Medium | Medium | Hook already shares cache via `shared` Map; pagination state must be per-component or synchronized |
| Realtime updates resetting page unexpectedly | Low | Low | Reset page only on explicit refresh, not on realtime push |
| Mobile sheet UX with pagination (scroll + paginate) | Medium | Medium | Keep "load more" pattern on mobile; pagination better suited for hub page |

---

## Recommended Approach: Minimal, Lazy

1. **Hub page stays as-is** — already complete
2. **NotificationCenter gets pagination** — reuses existing `Pagination` component
3. **Hook extends minimally** — add `pageSize`, `currentPage`, `totalCount`, `setPage`
4. **No new API, no new types, no new components** — everything exists

---

## Acceptance Criteria

- [ ] Notification bell popover shows pagination when >20 notifications
- [ ] Mobile bottom sheet shows pagination when >20 notifications
- [ ] Page change fetches correct offset from API
- [ ] Switching "All" ↔ "Unread" filter resets to page 1
- [ ] Refresh button resets to page 1
- [ ] Total count displays correctly in Pagination summary ("Showing 21–40 of 150")
- [ ] Existing hub page pagination unaffected
- [ ] Tests pass

---

## What Was Skipped / Not Checked

- Did not verify realtime subscription behavior with pagination (realtime pushes full refetch currently)
- Did not check if `LandlordMobileNav` unread badge needs pagination awareness (badge uses `unreadCount` only)
- Did not audit test coverage for `useNotificationCenter` hook internals