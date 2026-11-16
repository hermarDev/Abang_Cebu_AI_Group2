import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/support-desk/tickets" }));
vi.mock("@/features/notifications/useNotificationCenter", () => ({
  useNotificationCenter: (userId?: string, enabled = true) => ({
    unreadCount: userId && enabled ? 2 : 0,
    loading: false,
    error: null,
  }),
}));
vi.mock("@/components/ui/Modal", () => ({
  Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
import { SupportDeskWorkspaceLayout } from "./SupportDeskWorkspaceLayout";

const html = renderToStaticMarkup(
  <SupportDeskWorkspaceLayout
    userId="support-1"
    title="Support tickets"
    subtitle="Manage tenant complaints and inquiries"
    displayName="Sam Support"
    avatarUrl="https://example.com/support.jpg"
  >
    <p>Queue Content</p>
  </SupportDeskWorkspaceLayout>,
);

describe("SupportDeskWorkspaceLayout", () => {
  it("renders desktop sidebar with active page marked", () => {
    expect(html).toContain('aria-label="Support navigation"');
    for (const [label, href] of [
      ["Overview", "/support-desk/dashboard"],
      ["Complaints queue", "/support-desk/tickets"],
      ["Help Center", "/help"],
      ["Account settings", "/account"],
    ]) {
      expect(html).toMatch(new RegExp(`aria-label="${label}"[^>]*href="${href}"`));
    }
    expect(html).toMatch(/aria-label="Complaints queue" aria-current="page"/);
  });

  it("renders header with AbangCebu · Customer Support branding and notification bell", () => {
    expect(html).toContain("AbangCebu · Customer Support");
    expect(html).toContain("Support tickets</h1>");
    expect(html).toContain("<p>Queue Content</p>");
    expect(html).toContain('aria-label="Support mobile navigation"');
    expect(html).toContain('aria-label="2 unread notifications"');
    expect(html).toContain(">2</span>");
  });

  it("renders the account dropdown menu with Account settings and Log out links", () => {
    expect(html).toContain("<span>Account</span>");
    expect(html).toContain('src="https://example.com/support.jpg"');
    expect(html).toMatch(/<a(?=[^>]*href="\/account")[^>]*>/);
    expect(html).toMatch(/<a(?=[^>]*href="\/auth\/logout")[^>]*>/);
  });
});
