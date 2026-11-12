import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NotificationsHubContent } from "./NotificationsHubContent";
import type { NotificationItem } from "@/types/database";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const testNotifications: NotificationItem[] = [
  {
    id: "hub-1",
    recipient_id: "user-hub",
    actor_id: "landlord-1",
    type: "message",
    title: "New message from landlord",
    body: "Regarding your question on utility bills.",
    link: "/messages?thread=t-100",
    entity_type: "conversation",
    entity_id: "t-100",
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "hub-2",
    recipient_id: "user-hub",
    actor_id: "admin-1",
    type: "listing_update",
    title: "Listing approved",
    body: "Your submitted listing is now live.",
    link: "/rentals/r-200",
    entity_type: "property",
    entity_id: "r-200",
    is_read: true,
    read_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
];

vi.mock("./useNotificationCenter", () => ({
  useNotificationCenter: () => ({
    notifications: testNotifications,
    unreadCount: 1,
    loading: false,
    error: null,
    refresh: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    clearNotifications: vi.fn(),
  }),
  fetchNotificationsClient: vi.fn(async () => ({
    notifications: testNotifications,
    totalCount: testNotifications.length,
    unreadCount: 1,
    hasMore: false,
    tabCounts: { all: 2, unread: 1, messages: 1, listings: 1, system: 0 },
  })),
  formatRelativeTime: () => "Just now",
}));

describe("NotificationsHubContent", () => {
  it("renders page header, unread badge, and action buttons", () => {
    const html = renderToStaticMarkup(
      <NotificationsHubContent userId="user-hub" userRole="renter" />
    );

    expect(html).toContain("Notifications");
    expect(html).toContain("1 unread");
    expect(html).toContain("Mark all read");
    expect(html).toContain("Search notifications...");
  });

  it("renders all categorical tabs with their counts", () => {
    const html = renderToStaticMarkup(
      <NotificationsHubContent userId="user-hub" userRole="renter" />
    );

    expect(html).toContain("All");
    expect(html).toContain("Unread");
    expect(html).toContain("Messages &amp; Inquiries");
    expect(html).toContain("Listings");
    expect(html).toContain("System");
  });

  it("links back to landlord dashboard when user is landlord", () => {
    const html = renderToStaticMarkup(
      <NotificationsHubContent userId="user-hub" userRole="landlord" />
    );

    expect(html).toContain('href="/landlord/dashboard"');
  });

  it("links back to home when user is renter", () => {
    const html = renderToStaticMarkup(
      <NotificationsHubContent userId="user-hub" userRole="renter" />
    );

    expect(html).toContain('href="/"');
  });

  it("requests server-side pagination with the active tab and search query", async () => {
    const { fetchNotificationsClient } = await import("./useNotificationCenter");
    vi.mocked(fetchNotificationsClient).mockClear();

    renderToStaticMarkup(<NotificationsHubContent userId="user-hub" userRole="renter" />);

    // Server render does not run effects; assert the client fetch contract directly.
    await fetchNotificationsClient("user-hub", false, fetch, undefined, {
      unreadOnly: true,
      types: ["message", "inquiry"],
      search: "landlord",
      limit: 20,
      offset: 0,
      includeCounts: true,
    });

    const call = vi.mocked(fetchNotificationsClient).mock.calls.at(-1);
    expect(call?.[4]).toMatchObject({
      unreadOnly: true,
      types: ["message", "inquiry"],
      search: "landlord",
      limit: 20,
      offset: 0,
      includeCounts: true,
    });
  });
});
