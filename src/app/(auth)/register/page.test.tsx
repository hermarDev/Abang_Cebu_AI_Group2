import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "./page";

const session = vi.hoisted(() => ({ getUser: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: session.getUser } }) }));
vi.mock("next/navigation", () => ({ redirect: session.redirect }));

describe("RegisterPage", () => {
  beforeEach(() => {
    session.getUser.mockReset().mockResolvedValue({ data: { user: null }, error: null });
    session.redirect.mockReset().mockImplementation(() => { throw new Error("redirected"); });
  });

  it("redirects an authenticated user away from registration", async () => {
    session.getUser.mockResolvedValue({ data: { user: { id: "synthetic-user" } }, error: null });
    await expect(Promise.resolve().then(() => RegisterPage())).rejects.toThrow("redirected");
    expect(session.redirect).toHaveBeenCalledWith("/");
  });

  it("shows registration to a guest", async () => {
    const page = await RegisterPage();
    expect(page.props.initialAccountMode).toBe("sign-up");
    expect(session.redirect).not.toHaveBeenCalled();
  });
});
