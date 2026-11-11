import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sign: vi.fn(), getUser: vi.fn(), profile: vi.fn(), rpc: vi.fn(), redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
}) }));
vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: mocks.sign }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound, usePathname: () => "/admin/dashboard" }));
import AdminDashboardPage from "./page";

const overview = { pendingReviewCount: 7, approvedLiveCount: 12, changesRequestedCount: 3, archivedListingCount: 2, activeRenterCount: 40, activeLandlordCount: 9, suspendedAccountCount: 1, openReportCount: 5,
  recentAuditEntries: [{ id: "a1", actionType: "property_approved", adminName: "Ada Admin", targetType: "property", targetId: "p1", reason: "Looks good", createdAt: "2026-11-09T01:00:00Z", previousState: { status: "pending" }, newState: { status: "approved" } }] };

describe("admin dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });
    mocks.notFound.mockImplementation(() => { throw new Error("not found"); });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-a" } }, error: null });
    mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: false, full_name: "Ada Admin" }, error: null });
    mocks.rpc.mockResolvedValue({ data: overview, error: null });
    mocks.sign.mockResolvedValue("https://example.test/admin.png");
  });
  it("signs the admin avatar and passes it to the layout", async () => {
    mocks.profile.mockResolvedValueOnce({ data: { role: "admin", is_suspended: false, full_name: "Ada Admin", avatar_url: "admin-a/a.png" }, error: null });
    const jsx = await AdminDashboardPage();
    expect(mocks.sign).toHaveBeenCalledWith("admin-a", "admin-a/a.png");
    expect(jsx.props.avatarUrl).toBe("https://example.test/admin.png");
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
  it("renders real overview counts as filter links, plus recent audit activity", async () => {
    const html = renderToStaticMarkup(await AdminDashboardPage());
    expect(mocks.rpc).toHaveBeenCalledWith("admin_dashboard_overview");
    expect(html).toContain("Admin dashboard");
    for (const [label, count, href] of [
      ["Pending review", 7, "/admin/reviews?status=pending"], ["Approved / Live", 12, "/admin/reviews?status=approved"],
      ["Changes requested", 3, "/admin/reviews?status=rejected"], ["Archived listings", 2, "/admin/reviews?status=archived"],
      ["Active renters", 40, "/admin/accounts?role=renter&amp;status=active"], ["Active landlords", 9, "/admin/accounts?role=landlord&amp;status=active"],
      ["Suspended accounts", 1, "/admin/accounts?status=suspended"], ["Open abuse reports", 5, "/admin/reports?status=open"],
    ] as const) expect(html).toMatch(new RegExp(`href="${href.replace("?", "\\?")}"[^>]*>\\s*<span[^>]*>${label}</span><span[^>]*>${count}</span>`));
    expect(html).toContain("property approved");
    expect(html).toContain("Ada Admin");
    expect(html).toContain('href="/admin/audit"');
    for (const href of ["/admin/reviews", "/admin/accounts", "/admin/reports"]) expect(html).toContain(`href="${href}`);
  });
  it.each([
    { data: null, error: { message: "timeout" } },
    { data: { ...overview, pendingReviewCount: null }, error: null },
    { data: { ...overview, recentAuditEntries: null }, error: null },
  ])("shows an error for a resolved RPC failure or malformed overview", async (result) => {
    mocks.rpc.mockResolvedValueOnce(result);
    const html = renderToStaticMarkup(await AdminDashboardPage());
    expect(html).toContain("Could not load the admin overview");
    expect(html).not.toContain("No moderation activity yet.");
  });
  it("renders genuine zero counts and an empty audit list", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { pendingReviewCount: 0, approvedLiveCount: 0, changesRequestedCount: 0, archivedListingCount: 0, activeRenterCount: 0, activeLandlordCount: 0, suspendedAccountCount: 0, openReportCount: 0, recentAuditEntries: [] }, error: null });
    const html = renderToStaticMarkup(await AdminDashboardPage());
    expect(html).toMatch(/Pending review<\/span><span[^>]*>0</);
    expect(html).toContain("No moderation activity yet.");
    expect(html).not.toContain("Could not load the admin overview");
  });
  it("shows a retryable error instead of false counts when the overview RPC fails", async () => {
    mocks.rpc.mockRejectedValueOnce(new Error("boom"));
    const html = renderToStaticMarkup(await AdminDashboardPage());
    expect(html).toContain("Could not load the admin overview");
    expect(html).toContain('href="/admin/dashboard"');
    expect(html).not.toContain("No moderation activity yet.");
    expect(html).not.toMatch(/Pending review<\/span><span[^>]*>0</);
  });
});
