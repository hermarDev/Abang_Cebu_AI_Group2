## Summary
- **FinderNavigation**: Removes the "Notifications" button (which opened the flyout via `onNotifications()`) from the Communication section.
- Keeps the "View all notifications" link (`<Link href="/notifications">`) that navigates to the notifications hub page.
- Removes `onNotifications`, `unreadNotificationCount` from `FinderNavigationProps`.
- Removes `useNotificationCenter` import and `unreadNotifications` logic.
- Removes the notification button test.

- **RestoredFinderShell**: Removes `onNotifications` callback passed to `FinderNavigation`, removes `notificationsOpen` state, and removes `NotificationsModal` import/usage (no longer needed in this shell).

- **Bell icon in header (upper right)**: Unchanged — still opens the flyout (Popover/Sheet).

## Verification
- Unit & component tests: `pnpm vitest run src/features/notifications/` (27 tests pass)
- Full test suite: `pnpm test` (1108 tests pass)
- Lint: `pnpm run lint` (0 errors)
- Production Build: `pnpm run build` (41/41 static routes green)

## Result
Navbar/drawer now has only "View all notifications" link → `/notifications`. Bell icon in header still opens flyout for quick triage.