import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ getUser: vi.fn(), redirect: vi.fn(), profile: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: session.getUser }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: session.profile }) }) }) }) }));
vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: async () => null }));
import LoginPage from "./page";

// SSR cannot render Radix portals; test route-to-form data flow inline.
vi.mock("@/components/ui/Modal", () => ({
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  redirect: session.redirect,
}));

describe("LoginPage", () => {
  beforeEach(() => {
    session.redirect.mockReset().mockImplementation((destination: string) => { throw new Error(`redirect:${destination}`); });
    session.getUser.mockReset().mockResolvedValue({ data: { user: null }, error: null });
  });
  it.each([
    ["/favorites", "/favorites"],
    ["https://example.com", "/"],
    ["/login", "/"],
  ])("redirects a signed-in user from login with next=%s", async (next, destination) => {
    session.getUser.mockResolvedValue({ data: { user: { id: "synthetic-user" } }, error: null });
    await expect(LoginPage({ searchParams: Promise.resolve({ next }) })).rejects.toThrow(`redirect:${destination}`);
    expect(session.redirect).toHaveBeenCalledWith(destination);
  });
  it.each(["expired_recovery_link", "invalid_recovery_link"])("preserves %s for signed-in users", async (error) => {
    session.getUser.mockResolvedValue({ data: { user: { id: "synthetic-user", user_metadata: {}, email: "fixture@example.test" } }, error: null });
    session.profile.mockResolvedValue({ data: { full_name: "Test Renter", role: "renter", avatar_url: null } });
    const page = await LoginPage({ searchParams: Promise.resolve({ error }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("This password reset link is invalid or expired. Manage your password in account settings.");
    expect(html).toContain('href="/account"');
    expect(html).toContain("Account options for Test Renter");
    expect(session.getUser).toHaveBeenCalledTimes(1);
    expect(session.redirect).not.toHaveBeenCalled();
  });
  it.each(["expired_recovery_link", "invalid_recovery_link"])("explains %s", async (error) => {
    const page = await LoginPage({ searchParams: Promise.resolve({ error }) });
    expect(renderToStaticMarkup(page)).toContain("This password reset link is invalid or expired. Request a new link using Forgot password.");
  });
  it("shows confirmation after a successful password reset", async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({ message: "password_reset_success" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Your password has been reset. Sign in with your new password.");
    expect(html).toContain('role="status"');
  });

  it("does not show confirmation for an unknown message", async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({ message: "unknown" }) });
    const html = renderToStaticMarkup(page);

    expect(html).not.toContain("Your password has been reset.");
  });
});
