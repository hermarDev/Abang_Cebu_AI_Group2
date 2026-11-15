import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ updateAccountProfile: vi.fn(), updateAccountPassword: vi.fn(), updateAccountAvatar: vi.fn(), removeAccountAvatar: vi.fn() }));
import { AccountSettingsForm } from "./AccountSettingsForm";

describe("account security card", () => {
  it("shows an available change action by default", () => {
    const html = renderToStaticMarkup(<AccountSettingsForm profile={{ fullName: "Test User", phoneNumber: null, email: "test@example.invalid", role: "renter", avatarUrl: null }} />);
    expect(html).not.toContain("Password changes are temporarily unavailable");
  });
  it("shows a change password action without password inputs by default", () => {
    const html = renderToStaticMarkup(<AccountSettingsForm profile={{ fullName: "Test User", phoneNumber: null, email: "test@example.invalid", role: "renter", avatarUrl: null }} />);
    expect(html).toContain("Manage your password and account security.");
    expect(html).toContain("Update your password to keep your account secure.");
    expect(html).toContain("Change password");
    expect(html).toContain('placeholder="Enter phone number"');
    expect(html).not.toContain('type="password"');
  });
  it("renders the Session logout with a divider and destructive styling", () => {
    const html = renderToStaticMarkup(<AccountSettingsForm profile={{ fullName: "Test User", phoneNumber: null, email: "test@example.invalid", role: "renter", avatarUrl: null }} />);
    const session = html.slice(html.indexOf('aria-labelledby="session-heading"'));
    expect(session).toContain('role="separator"');
    expect(session).toContain('href="/auth/logout"');
    expect(session).toContain("text-destructive");
    expect(session).toContain("lucide-log-out");
  });
  it("flattens the photo wrapper, uses readable disabled Save changes styling, aligns account metadata, and places support links below the two-column grid", () => {
    const html = renderToStaticMarkup(
      <AccountSettingsForm
        profile={{ fullName: "Test User", phoneNumber: null, email: "test@example.invalid", role: "admin", avatarUrl: null }}
      />,
    );
    expect(html).not.toContain("rounded-xl border border-border bg-muted/50 p-4");
    expect(html).toMatch(/<span[^>]*role="status"[^>]*>No profile changes to save<\/span>/);
    expect(html).toContain("disabled:bg-muted");
    expect(html).toContain("disabled:text-muted-foreground");
    expect(html).toContain("disabled:opacity-100");
    expect(html).toContain("lucide-badge-check");
    expect(html).toContain("bg-muted px-2.5 py-0.5 text-sm font-semibold capitalize text-foreground");
    expect(html).toContain("border-destructive/25");

    const asideClose = html.indexOf("</aside>");
    const supportIndex = html.indexOf("Need help with your account?");
    expect(asideClose).toBeGreaterThan(-1);
    expect(supportIndex).toBeGreaterThan(asideClose);
  });
});
