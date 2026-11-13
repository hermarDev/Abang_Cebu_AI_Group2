import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/landlord/dashboard",
}));

vi.mock("@/features/messages/useUnreadMessageCount", () => ({
  useUnreadMessageCount: () => ({ unreadCount: 1 }),
}));

vi.mock("@/features/notifications/useNotificationCenter", () => ({
  useNotificationCenter: () => ({ unreadCount: 4, loading: false, items: [], markRead: vi.fn(), markAllRead: vi.fn() }),
}));

vi.mock("@/features/map/useFinderTheme", () => ({
  useFinderTheme: () => ({ preference: "system", resolvedTheme: "light", setPreference: vi.fn() }),
}));

import { LandlordWorkspaceLayout } from "./LandlordWorkspaceLayout";

describe("LandlordWorkspaceLayout", () => {
  it("renders unified workspace sidebar navigation, properties count pill, and single safe-area bottom clearance", () => {
    const html = renderToStaticMarkup(
      <LandlordWorkspaceLayout
        userId="u-1"
        propertiesCount={6}
        brand={<span>Brand</span>}
        actions={<span>Actions</span>}
      >
        <h1>Workspace Body</h1>
      </LandlordWorkspaceLayout>
    );

    expect(html).toContain('href="/landlord/dashboard#overview"');
    expect(html).toContain('href="/landlord/properties"');
    expect(html).toContain(">6</span>");
    expect(html).toContain('href="/landlord/map"');
    expect(html).toContain('href="/landlord/messages"');
    expect(html).toContain('href="/notifications"');
    expect(html).toContain('href="/account"');
    expect(html).toContain("Workspace Body");
    expect(html.match(/pb-\[calc\(5rem\+env\(safe-area-inset-bottom\)\)\]/g)).toHaveLength(1);
  });
});
