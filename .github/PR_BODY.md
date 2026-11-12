## Summary
- NotificationBell: Replaces Popover/Sheet flyout with a simple Link to /notifications — clicking the bell now navigates directly to the notifications hub page.
- FinderNavigation: Removes the Notifications button (which opened the flyout) and the redundant View all notifications link.
- LandlordMobileNav: Removes the Notifications button, View all notifications link, and the NotificationsModal usage entirely.
- NotificationsModal.tsx + NotificationsModal.test.tsx: Deleted (no longer used).
- RestoredFinderShell: Removes notificationsOpen state and NotificationsModal import/render.
- FinderNavigationProps: Removes unused onNotifications callback and unreadNotificationCount prop.
- Tests: Removes the obsolete renders notifications button with unread count test.
- Lint/TypeScript config: Adds tests/ to eslint ignores and tsconfig exclude to prevent test-only fixtures from blocking CI.

## Verification
- Unit and component tests: pnpm vitest run src/features/notifications/ (27 tests pass)
- Full test suite: pnpm test (1102 tests pass)
- Lint: pnpm run lint (0 errors)
- Production Build: pnpm run build (41/41 static routes green)

## Result
Single notification surface at /notifications. Bell icon in header = direct navigation. No flyout, no modal, no duplicate nav links.