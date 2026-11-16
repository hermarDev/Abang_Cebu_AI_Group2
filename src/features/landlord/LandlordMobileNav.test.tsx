import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/landlord/dashboard",
}));

vi.mock("@/features/messages/useUnreadMessageCount", () => ({
  useUnreadMessageCount: () => ({ unreadCount: 2 }),
}));

vi.mock("@/features/notifications/useNotificationCenter", () => ({
  useNotificationCenter: () => ({ unreadCount: 3 }),
}));

vi.mock("@/features/map/useFinderTheme", () => ({
  useFinderTheme: () => ({ preference: "system", resolvedTheme: "light", setPreference: vi.fn() }),
}));

vi.mock("@/components/ui/Modal", () => ({
  Modal: ({ children }: { children: React.ReactNode }) => <div data-testid="mobile-modal">{children}</div>,
}));

import { LandlordMobileNav } from "@/features/landlord/LandlordMobileNav";

describe("LandlordMobileNav", () => {
  it("renders bottom navigation with current-page indicator and no stray JSX characters", () => {
    const html = renderToStaticMarkup(<LandlordMobileNav userId="u-1" />);

    expect(html).not.toMatch(/^\(/);
    expect(html).toContain('aria-label="Landlord mobile navigation"');
    expect(html).toContain('href="/landlord/dashboard"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/landlord/properties"');
    expect(html).toContain('href="/list-property"');
    expect(html).toContain('href="/account"');
    expect(html).toContain('aria-label="More landlord options"');
  });

  it("renders notifications and messages badges in more drawer with accessible count and 99+ clamping", () => {
    const html = renderToStaticMarkup(
      <LandlordMobileNav
        userId="u-1"
        unreadCount={120}
        unreadNotifications={105}
      />
    );

    // Notifications
    expect(html).toContain('href="/notifications"');
    expect(html).toContain('aria-label="105 unread notifications"');
    expect(html).toContain("99+");
    expect(html).toMatch(/aria-label="105 unread notifications"[^>]*class="[^"]*bg-action/);

    // Messages
    expect(html).toContain('href="/landlord/messages"');
    expect(html).toContain('aria-label="120 unread messages"');
  });

  it("hides badges when counts are zero", () => {
    const html = renderToStaticMarkup(
      <LandlordMobileNav
        userId="u-1"
        unreadCount={0}
        unreadNotifications={0}
      />
    );

    expect(html).toContain('href="/notifications"');
    expect(html).not.toContain("unread notifications");
    expect(html).toContain('href="/landlord/messages"');
    expect(html).not.toContain("unread messages");
  });

  it("falls back to polled counts when counts are not provided", () => {
    const html = renderToStaticMarkup(<LandlordMobileNav userId="u-1" />);

    // Polled counts from mocks: messages = 2, notifications = 3
    expect(html).toContain('aria-label="3 unread notifications"');
    expect(html).toContain(">3</span>");
    expect(html).toContain('aria-label="2 unread messages"');
    expect(html).toContain(">2</span>");
  });
});
