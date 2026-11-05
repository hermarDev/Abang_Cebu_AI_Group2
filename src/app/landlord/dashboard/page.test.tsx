import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), listings: vi.fn(), eq: vi.fn(), redirect: vi.fn(), notFound: vi.fn(), signAvatar: vi.fn() }));
vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: mocks.signAvatar }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  from: (table: string) => table === "profiles"
    ? { select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }
    : { select: () => ({ eq: mocks.eq }) },
}) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound, usePathname: () => "/landlord/dashboard" }));
import LandlordDashboardPage from "./page";

describe("landlord dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });
    mocks.notFound.mockImplementation(() => { throw new Error("not found"); });
    mocks.signAvatar.mockReset().mockResolvedValue(null);
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-a" } }, error: null });
    mocks.profile.mockResolvedValue({ data: { full_name: "Landlord", role: "landlord", is_suspended: false }, error: null });
    mocks.eq.mockReturnValue({ order: mocks.listings });
    mocks.listings.mockResolvedValue({ data: [{ id: "listing-a", title: "Test property", status: "draft", is_available: true }], error: null });
  });
  it("redirects guests and denies non-landlords or suspended accounts", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(LandlordDashboardPage()).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/login?next=%2Flandlord%2Fdashboard");
    for (const profile of [{ role: "renter", is_suspended: false }, { role: "landlord", is_suspended: true }, null]) {
      mocks.profile.mockResolvedValueOnce({ data: profile });
      await expect(LandlordDashboardPage()).rejects.toThrow("not found");
    }
    expect(mocks.eq).not.toHaveBeenCalled();
  });
  it("shows owner-filtered listings and links to the labeled preview", async () => {
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    expect(mocks.eq).toHaveBeenCalledWith("owner_id", "owner-a");
    expect(html).toMatch(/<a[^>]*aria-label="Open property map"[^>]*class="hidden lg:inline-flex [^"]*"[^>]*><svg[^>]*lucide-map-pinned/);
    expect(html).toContain("Support");
    expect(html).toContain("Contact Support");
    expect(html).not.toContain("Back to map");
    expect(html).toContain('href="/auth/logout"');
    expect(html).toContain("Log out");
    expect(html).not.toContain("Sign out");
    expect(html).toContain("Manage account");
    expect(html).toContain("Landlord tools");
    expect(html).toContain('aria-label="Landlord mobile navigation"');
    expect(html).toContain('aria-label="More landlord options"');
    expect(html).toContain('aria-label="Listing form preview"');
    expect(html).toContain("My properties");
    expect(html).toContain("Total properties");
    expect(html).toContain("Welcome back, Landlord");
    expect(html).toContain("main_Logo.png");
    expect(html).toContain("main_Logo_Light.png");
    expect(html).toContain("Under review");
    expect(html).toContain("Changes requested");
    expect(html).toContain("Review tracking unavailable");
    expect(html).toContain("Open listing form preview");
    expect(html).toContain("Your portfolio");
    expect(html).toContain("Test property");
    expect(html).toContain("Draft");
    expect(html).toContain('aria-label="Listing form preview"');
    expect(html).toContain('href="/list-property"');
    expect(html).toContain("Property submission is not available yet.");
  });
  it("shows the signed profile photo in account options", async () => {
    mocks.profile.mockResolvedValueOnce({ data: { full_name: "Landlord", role: "landlord", is_suspended: false, avatar_url: "owner-a/photo.png" }, error: null });
    mocks.signAvatar.mockResolvedValueOnce("https://example.test/signed-photo.png");
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    expect(mocks.signAvatar).toHaveBeenCalledWith("owner-a", "owner-a/photo.png");
    expect(html).toContain('src="https://example.test/signed-photo.png"');
    expect(html).toContain('aria-label="Account options for Landlord"');
  });
  it("shows a load error rather than an empty state when the query fails", async () => {
    mocks.listings.mockResolvedValueOnce({ data: null, error: { message: "failure" } });
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    expect(html).toContain("Could not load your properties");
    expect(html).not.toContain("No properties yet");
  });
});
