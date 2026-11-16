import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "./page";

const session = vi.hoisted(() => ({ getUser: vi.fn(), redirect: vi.fn(), profile: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: session.getUser }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: session.profile }) }) }) }) }));
vi.mock("next/navigation", () => ({ redirect: session.redirect }));

describe("RegisterPage", () => {
  beforeEach(() => {
    session.getUser.mockReset().mockResolvedValue({ data: { user: null }, error: null });
    session.profile.mockReset().mockResolvedValue({ data: { role: "renter", is_suspended: false }, error: null });
    session.redirect.mockReset().mockImplementation(() => { throw new Error("redirected"); });
  });

  it("redirects an authenticated user away from registration", async () => {
    session.getUser.mockResolvedValue({ data: { user: { id: "synthetic-user" } }, error: null });
    await expect(Promise.resolve().then(() => RegisterPage())).rejects.toThrow("redirected");
    expect(session.redirect).toHaveBeenCalledWith("/");
  });

  it.each([
    ["admin", "/admin/dashboard"], ["customer_support", "/support-desk/dashboard"],
    ["verification_officer", "/verification/dashboard"], ["landlord", "/landlord/dashboard"],
  ])("returns signed-in %s to its workspace", async (role, destination) => {
    session.getUser.mockResolvedValue({ data: { user: { id: "user" } }, error: null });
    session.profile.mockResolvedValue({ data: { role, is_suspended: false }, error: null });
    await expect(RegisterPage()).rejects.toThrow("redirected");
    expect(session.redirect).toHaveBeenCalledWith(destination);
  });

  it("shows registration to a guest", async () => {
    const page = await RegisterPage();
    expect(page.props.initialAccountMode).toBe("sign-up");
    expect(session.redirect).not.toHaveBeenCalled();
  });
});
