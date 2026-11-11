import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NotificationCenter } from "./NotificationCenter";
import type { NotificationItem } from "@/types/database";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const dummyNotifications: NotificationItem[] = [
  {
    id: "n-1",
    recipient_id: "u-1",
    actor_id: "u-2",
    type: "message",
    title: "New message",
    body: "Your landlord replied to your inquiry.",
    link: "/messages?thread=t-1",
    entity_type: "conversation",
    entity_id: "t-1",
    is_read: false,
    read_at: null,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "n-2",
    recipient_id: "u-1",
    actor_id: "u-admin",
    type: "listing_update",
    title: "Listing updated",
    body: "A saved property has changed its price.",
    link: "/rentals/r-1",
    entity_type: "property",
    entity_id: "r-1",
    is_read: true,
    read_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

describe("NotificationCenter", () => {
  it("renders notifications with titles and relative timestamps", () => {
    const html = renderToStaticMarkup(
      <NotificationCenter
        notifications={dummyNotifications}
        unreadCount={1}
        loading={false}
        error={null}
        onRefresh={() => {}}
        onMarkAsRead={() => {}}
        onMarkAllAsRead={() => {}}
      />
    );

    expect(html).toContain("Notifications");
    expect(html).toContain("New message");
    expect(html).toContain("Your landlord replied to your inquiry.");
    expect(html).toContain("Listing updated");
    expect(html).toContain("Mark all read");
    expect(html).toContain('aria-label="Unread notification"');
  });

  it("coalesces concurrent loadNotifications calls for the same user into a single fetch", async () => {
    const { loadNotifications } = await import("./useNotificationCenter");
    let resolveFetch!: (value: Response) => void;
    const fetchSpy = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal("fetch", fetchSpy);

    const p1 = loadNotifications("dedupe-user-1", { force: true });
    const p2 = loadNotifications("dedupe-user-1", { force: false });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    resolveFetch({
      ok: true,
      json: async () => ({
        notifications: dummyNotifications,
        totalCount: 2,
        unreadCount: 1,
        hasMore: false,
      }),
    } as Response);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.unreadCount).toBe(1);
    expect(r2.unreadCount).toBe(1);

    // Subsequent non-forced call within 10s cooldown reuses cached state without fetching
    const r3 = await loadNotifications("dedupe-user-1", { force: false });
    expect(r3.unreadCount).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("renders empty state when there are no notifications", () => {
    const html = renderToStaticMarkup(
      <NotificationCenter
        notifications={[]}
        unreadCount={0}
        loading={false}
        error={null}
        onRefresh={() => {}}
        onMarkAsRead={() => {}}
        onMarkAllAsRead={() => {}}
      />
    );

    expect(html).toContain("You’re all caught up!");
    expect(html).toContain("New messages, inquiries, and listing updates will appear here.");
    expect(html).toContain("role=\"tablist\"");
    expect(html).toContain("role=\"tab\"");
    expect(html).not.toContain("Mark all read");
  });

  it("renders error state when error is provided", () => {
    const html = renderToStaticMarkup(
      <NotificationCenter
        notifications={[]}
        unreadCount={0}
        loading={false}
        error="Network timeout"
        onRefresh={() => {}}
        onMarkAsRead={() => {}}
        onMarkAllAsRead={() => {}}
      />
    );

    expect(html).toContain("Network timeout");
    expect(html).toContain("Retry");
  });
});
