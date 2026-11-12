## Summary
- **NotificationBell**: Restores Popover (desktop) / Sheet (mobile) flyout with `NotificationCenter` — clicking the bell shows the notification dropdown.
- **FinderNavigation**: Restores "Notifications" button (opens flyout via `onNotifications`) and "View all notifications" link to `/notifications`.
- **LandlordMobileNav**: Restores "Notifications" button (opens `NotificationsModal`), "View all notifications" link, and `NotificationsModal` usage.
- **NotificationsModal.tsx + NotificationsModal.test.tsx**: Restored (used by LandlordMobileNav).
- **RestoredFinderShell**: Restores `notificationsOpen` state and `NotificationsModal` import/render.
- **FinderNavigationProps**: Restores `onNotifications` callback and `unreadNotificationCount` prop.
- **Tests**: Restores the notification button test.

## Verification
- Unit & component tests: `pnpm vitest run src/features/notifications/` (29 tests pass)
- Full test suite: `pnpm test` (1109 tests pass)
- Lint: `pnpm run lint` (0 errors)
- Production Build: `pnpm run build` (41/41 static routes green)

## Result
Dual notification surface restored:
1. **Flyout** (bell icon in header) — quick triage with dismiss, mark read, clear read
2. **Hub page** (`/notifications`) — full management with tabs, search, bulk actions
3. **Navbar/drawer** — "View all notifications" link for both