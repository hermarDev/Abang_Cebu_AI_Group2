import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
}) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));
import AdminDashboardPage from "./page";

describe("admin dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });
    mocks.notFound.mockImplementation(() => { throw new Error("not found"); });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-a" } }, error: null });
    mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: false }, error: null });
  });
  it("redirects guests and denies other roles and suspended administrators", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(AdminDashboardPage()).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/login?next=%2Fadmin%2Fdashboard");
    for (const profile of [{ role: "renter", is_suspended: false }, { role: "landlord", is_suspended: false }, { role: "admin", is_suspended: true }, null]) {
      mocks.profile.mockResolvedValueOnce({ data: profile, error: null });
      await expect(AdminDashboardPage()).rejects.toThrow("not found");
    }
  });
  it("renders truthful placeholders rather than unavailable review actions", async () => {
    const html = renderToStaticMarkup(await AdminDashboardPage());
    expect(html).toContain("Admin dashboard");
    expect(html).toContain("not available yet");
    expect(html).not.toContain('href="/admin/listings"');
  });
});
