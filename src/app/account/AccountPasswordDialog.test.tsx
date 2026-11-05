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
});
