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

  it("aligns landlord header actions before NotificationBell and places AccountMenu last using explicit props", () => {
    const html = renderToStaticMarkup(
      <LandlordWorkspaceLayout
        userId="u-1"
        displayName="Lana Landlord"
        brand={<span>Brand</span>}
        actions={<a href="/landlord/map">Property map</a>}
      >
        <p>Body</p>
      </LandlordWorkspaceLayout>
    );

    const headerMatch = html.match(/<header[^>]*>([\s\S]*?)<\/header>/);
    const headerHtml = headerMatch?.[1] ?? html;

    const mapIndex = headerHtml.indexOf("Property map");
    const bellIndex = headerHtml.indexOf('aria-label="Notifications');
    const accountIndex = headerHtml.indexOf('aria-label="Account options for Lana Landlord"');
    expect(mapIndex).toBeGreaterThan(-1);
    expect(bellIndex).toBeGreaterThan(mapIndex);
    expect(accountIndex).toBeGreaterThan(bellIndex);

    expect(headerHtml.match(/aria-label="Notifications/g)).toHaveLength(1);
    expect(headerHtml.match(/aria-label="Account options for Lana Landlord"/g)).toHaveLength(1);
  });

  it("renders landlord sidebar Notifications badge from useNotificationCenter while messages badge remains and properties count stays muted", () => {
    const html = renderToStaticMarkup(
      <LandlordWorkspaceLayout
        userId="u-1"
        propertiesCount={6}
        brand={<span>Brand</span>}
        actions={<span>Actions</span>}
      >
        <p>Body</p>
      </LandlordWorkspaceLayout>
    );

    const asideMatch = html.match(/<aside[^>]*>([\s\S]*?)<\/aside>/);
    const asideHtml = asideMatch?.[1] ?? html;

    // Notifications link in sidebar has badge 4 from useNotificationCenter
    expect(asideHtml).toContain('href="/notifications"');
    expect(asideHtml).toContain('aria-label="Notifications, 4 unread"');
    expect(asideHtml).toContain(">4</span>");

    // Messages link in sidebar has badge 1 from useUnreadMessageCount
    expect(asideHtml).toContain('href="/landlord/messages"');
    expect(asideHtml).toContain('aria-label="Messages, 1 unread"');
    expect(asideHtml).toContain(">1</span>");

    // Properties count in sidebar is muted
    expect(asideHtml).toContain('href="/landlord/properties"');
    expect(asideHtml).toContain(">6</span>");
    expect(asideHtml).toContain("bg-muted px-2 py-0.5 text-foreground");
  });
});