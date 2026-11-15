import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/verification/queue" }));
import { VerificationWorkspaceLayout } from "./VerificationWorkspaceLayout";

const html = renderToStaticMarkup(
  <VerificationWorkspaceLayout
    userId="verif-1"
    title="Verification dashboard"
    subtitle="Manage verifications"
    displayName="Vera Verifier"
    avatarUrl="https://example.com/verif.jpg"
  >
    <p>Queue Content</p>
  </VerificationWorkspaceLayout>,
);

describe("VerificationWorkspaceLayout", () => {
  it("renders desktop sidebar with active page marked and NotificationBell with userRole", () => {
    expect(html).toContain('aria-label="Verification navigation"');
    for (const [label, href] of [
      ["Overview", "/verification/dashboard"],
      ["Verification queue", "/verification/queue"],
      ["Verification map", "/verification/map"],
      ["Help Center", "/help"],
      ["Account settings", "/account"],
    ]) {
      expect(html).toMatch(new RegExp(`aria-label="${label}"[^>]*href="${href}"`));
    }
    expect(html).toMatch(/aria-label="Verification queue" aria-current="page"/);
    // NotificationBell in header with userRole="verification_officer"
    expect(html).toContain('aria-label="Notifications"');
  });

  it("renders header with AbangCebu · Field Verification branding and mobile nav", () => {
    expect(html).toContain("AbangCebu · Field Verification");
    expect(html).toContain("Verification dashboard</h1>");
    expect(html).toContain("<p>Queue Content</p>");
    expect(html).toContain('aria-label="Verification mobile navigation"');
  });

  it("renders the account dropdown menu with Account settings and Log out links", () => {
    expect(html).toContain("<span>Account</span>");
    expect(html).toContain('src="https://example.com/verif.jpg"');
    expect(html).toMatch(/<a(?=[^>]*href="\/account")[^>]*>/);
    expect(html).toMatch(/<a(?=[^>]*href="\/auth\/logout")[^>]*>/);
  });

  it("renders collapsible sidebar with uppercase header and icon-only toggle button", () => {
    expect(html).toContain("Verification tools");
    expect(html).toMatch(/size-9/);
    expect(html).toMatch(/aria-expanded/);
  });

  it("renders theme controls at bottom of sidebar", () => {
    expect(html).toMatch(/theme/i);
  });

  it("gives each mobile navigation action a 44px minimum width", () => {
    const nav = html.match(/<nav aria-label="Verification mobile navigation"[\s\S]*?<\/nav>/)?.[0] ?? "";
    expect(nav).toMatch(/aria-label="Map"[^>]*min-w-11/);
    expect(nav).toMatch(/aria-label="More verification options"[^>]*min-w-11/);
  });

  it("renders mobile nav with links and More button opening modal with Notifications, Help, Account, ThemeControls, Logout", () => {
    expect(html).toContain('aria-label="Overview"');
    expect(html).toContain('aria-label="Queue"');
    expect(html).toContain('aria-label="Help"');
    expect(html).toContain('aria-label="Account"');
    expect(html).toContain('aria-label="More');
    expect(html).toContain('aria-label="Notifications');
    expect(html).toContain("Help Center");
    expect(html).toContain("Account settings");
    expect(html).toMatch(/Log out/);
  });
});