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
});
