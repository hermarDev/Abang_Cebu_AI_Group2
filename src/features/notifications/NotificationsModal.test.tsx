import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NotificationsModal } from "./NotificationsModal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/ui/Modal", () => ({
  Modal: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="notifications-modal">{children}</div> : null,
}));

vi.mock("./useNotificationCenter", () => ({
  useNotificationCenter: () => ({
    notifications: [
      {
        id: "notif-1",
        title: "New message",
        body: "You have a message from landlord",
        read: false,
        created_at: new Date().toISOString(),
      },
    ],
    unreadCount: 1,
    loading: false,
    error: null,
    refresh: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  }),
}));

describe("NotificationsModal", () => {
  it("renders null when userId is null", () => {
    const html = renderToStaticMarkup(
      <NotificationsModal userId={null} open={true} onClose={() => {}} />
    );
    expect(html).toBe("");
  });

  it("renders notification center inside modal when open with userId", () => {
    const html = renderToStaticMarkup(
      <NotificationsModal userId="user-123" open={true} onClose={() => {}} />
    );
    expect(html).toContain('data-testid="notifications-modal"');
    expect(html).toContain("Notifications");
    expect(html).toContain("New message");
    expect(html).toContain("You have a message from landlord");
  });
});