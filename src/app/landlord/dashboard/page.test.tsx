import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), listings: vi.fn(), properties: vi.fn(), submissions: vi.fn(), units: vi.fn(), statusRpc: vi.fn(), eq: vi.fn(), landlordEq: vi.fn(), submissionEq: vi.fn(), redirect: vi.fn(), notFound: vi.fn(), signAvatar: vi.fn() }));
vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: mocks.signAvatar }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  rpc: mocks.statusRpc,
  from: (table: string) => table === "profiles"
    ? { select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }
    : table === "properties"
      ? { select: () => ({ eq: mocks.landlordEq }) }
      : table === "rental_units"
        ? { select: () => ({ in: mocks.units }) }
      : table === "property_submissions"
        ? { select: () => ({ eq: mocks.submissionEq }) }
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
    mocks.landlordEq.mockReturnValue({ order: mocks.properties });
    mocks.submissionEq.mockReturnValue({ order: mocks.submissions });
    mocks.units.mockResolvedValue({ data: [], error: null });
    mocks.submissions.mockResolvedValue({ data: [{ property_id: "property-b", draft_id: "draft-1", expected_revision: 2, superseded_by: null }], error: null });
    mocks.statusRpc.mockImplementation(async (name: string) => name === "landlord_rejection_feedback"
      ? { data: [{ propertyId: "property-b", reason: "Permit image unreadable." }], error: null }
      : { data: { draftId: "draft-1", revision: 2, propertyId: "property-b" }, error: null });
    mocks.listings.mockResolvedValue({ data: [{ id: "listing-a", title: "Test property", status: "draft", is_available: true }], error: null });
    mocks.properties.mockResolvedValue({ data: [{ id: "property-a", title: "Submitted room", status: "pending", moderation_note: null }, { id: "property-b", title: "Rejected house", status: "rejected", moderation_note: "Permit image unreadable." }], error: null });
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
    expect(mocks.statusRpc).toHaveBeenCalledWith("landlord_rejection_feedback");
    expect(html).toMatch(/<a[^>]*aria-label="Open property map"[^>]*class="hidden lg:inline-flex [^"]*"[^>]*><svg[^>]*lucide-map-pinned/);
    expect(html).toContain("Support");
    expect(html).toContain("Contact Support");
    expect(html).not.toContain("Back to map");
    expect(html).toContain('href="/auth/logout"');
    expect(html).toContain("Log out");
    expect(html).not.toContain("Sign out");
    expect(html).toContain("Account settings");
    expect(html).not.toContain("Manage account");
    expect(html).toContain("Landlord tools");
    expect(html).toContain('aria-label="Landlord mobile navigation"');
    expect(html).toContain('aria-label="More landlord options"');
    expect(html).toContain('aria-label="Listing form"');
    expect(html).toContain("My properties");
    expect(html).toContain("Total properties");
    expect(html).toContain("Welcome back, Landlord");
    expect(html).toContain("main_Logo.png");
    expect(html).toContain("main_Logo_Light.png");
    expect(html).toContain("Under review");
    expect(html).toContain("Changes requested");
    expect(html).toContain("Submitted and waiting for review");
    expect(html).toContain("Rejected with notes");
    expect(html).toContain("Open listing form");
    expect(html).toContain("Submitted properties");
    expect(html).toContain("Submitted room");
    expect(html).toContain("Pending review");
    expect(html).toContain("Rejected house");
    expect(html).toContain("Changes requested");
    expect(html).toContain("Permit image unreadable.");
    expect(html).toContain("Correct and resubmit");
    expect(html).toContain('href="/list-property?draftId=draft-1&amp;revision=2"');
    expect(html).toContain("Your portfolio");
    expect(html).toContain("Test property");
    expect(html).toContain("Draft");
    expect(html).toContain('aria-label="Listing form"');
    expect(html).toContain('href="/list-property"');
    expect(html).not.toContain("The listing form is a preview");
    expect(html).toContain('href="/landlord/map?selected=property-a"');
    expect(html).toContain('href="/landlord/map?selected=property-b"');
    expect(html.match(/View on map/g)).toHaveLength(2);
  });
  it("links each rejected property to its own latest unsuperseded draft", async () => {
    mocks.properties.mockResolvedValueOnce({ data: [{ id: "property-a", title: "First", status: "rejected", moderation_note: null }, { id: "property-b", title: "Second", status: "rejected", moderation_note: null }], error: null });
    mocks.submissions.mockResolvedValueOnce({ data: [{ property_id: "property-a", draft_id: "draft-a", expected_revision: 3, superseded_by: null }, { property_id: "property-b", draft_id: "draft-b", expected_revision: 5, superseded_by: null }], error: null });
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    expect(mocks.submissionEq).toHaveBeenCalledWith("owner_id", "owner-a");
    expect(html).toContain('href="/list-property?draftId=draft-a&amp;revision=3"');
    expect(html).toContain('href="/list-property?draftId=draft-b&amp;revision=5"');
  });
  it("links pending submissions to their active draft for editing", async () => {
    mocks.submissions.mockResolvedValueOnce({ data: [{ property_id: "property-a", draft_id: "draft-p", expected_revision: 4, superseded_by: null }], error: null });
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    expect(html).toContain("Edit submission");
    expect(html).toContain('href="/list-property?draftId=draft-p&amp;revision=4"');
    expect(html).not.toContain("Correct and resubmit");
  });
  it("does not link superseded submissions or invent targets when the query fails", async () => {
    mocks.submissions.mockResolvedValueOnce({ data: [{ property_id: "property-b", draft_id: "old-draft", expected_revision: 1, superseded_by: "new-operation" }], error: null });
    expect(renderToStaticMarkup(await LandlordDashboardPage())).not.toContain("Correct and resubmit");
    mocks.submissions.mockResolvedValueOnce({ data: null, error: { message: "failure" } });
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    expect(html).not.toContain("Correct and resubmit");
    expect(html).toContain("Correction links could not be loaded. Refresh the page to try again.");
    expect(html).toContain("Permit image unreadable.");
  });
  it("reports unavailable feedback without hiding properties or inventing a reason", async () => {
    mocks.statusRpc.mockResolvedValueOnce({ data: null, error: { message: "failure" } });
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    expect(html).toContain("Review feedback could not be loaded. Refresh the page to try again.");
    expect(html).toContain("Rejected house");
    expect(html).not.toContain("Permit image unreadable.");
    expect(html).toContain("Correct and resubmit");
  });
  it("shows a clear error when the feedback function is absent during rollout", async () => {
    mocks.statusRpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST202" } });
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    expect(html).toContain("Review feedback could not be loaded. Refresh the page to try again.");
    expect(html).toContain("Rejected house");
    expect(html).not.toContain("Permit image unreadable.");
  });
  it("shows the signed profile photo in account options", async () => {
    mocks.profile.mockResolvedValueOnce({ data: { full_name: "Landlord", role: "landlord", is_suspended: false, avatar_url: "owner-a/photo.png" }, error: null });
    mocks.signAvatar.mockResolvedValueOnce("https://example.test/signed-photo.png");
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    expect(mocks.signAvatar).toHaveBeenCalledWith("owner-a", "owner-a/photo.png");
    expect(html).toContain('src="https://example.test/signed-photo.png"');
    expect(html).toContain('aria-label="Account options for Landlord"');
  });
  it("counts submitted properties in portfolio totals and live listings", async () => {
    mocks.listings.mockResolvedValueOnce({ data: [], error: null });
    mocks.properties.mockResolvedValueOnce({ data: [{ id: "property-a", title: "Pending room", status: "pending" }, { id: "property-c", title: "Approved flat", status: "approved" }], error: null });
    mocks.units.mockResolvedValueOnce({ data: [{ property_id: "property-c", is_available: true }], error: null });
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    const stat = (label: string) => html.match(new RegExp(`${label}</p><p[^>]*>(\\d+)<`))?.[1];
    expect([stat("Total properties"), stat("Live listings"), stat("Under review")]).toEqual(["2", "1", "1"]);
    expect(mocks.units).toHaveBeenCalledWith("property_id", ["property-a", "property-c"]);
    expect(html).toContain("Pending review");
    expect(html).toContain("Published · Available");
    expect(html).toContain("Published listings appear below");
    expect(html).not.toContain("No published listings yet");
    expect(html).not.toContain("No properties yet");
  });
  it("displays 'No published listings yet' when submissions exist but none are approved", async () => {
    mocks.listings.mockResolvedValueOnce({ data: [], error: null });
    mocks.properties.mockResolvedValueOnce({ data: [{ id: "property-a", title: "Pending room", status: "pending" }], error: null });
    mocks.units.mockResolvedValueOnce({ data: [], error: null });
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    expect(html).toContain("No published listings yet");
    expect(html).toContain("Approved listings will appear here once published.");
    expect(html).not.toContain("No properties yet");
  });
  it.each([
    ["has no available unit", { data: [{ property_id: "property-c", is_available: false }], error: null }],
    ["availability cannot be read", { data: null, error: { message: "failure" } }],
  ])("does not count or label an approved property as live when it %s", async (_name, units) => {
    mocks.listings.mockResolvedValueOnce({ data: [], error: null });
    mocks.properties.mockResolvedValueOnce({ data: [{ id: "property-c", title: "Approved flat", status: "approved" }], error: null });
    mocks.units.mockResolvedValueOnce(units);
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    const stat = (label: string) => html.match(new RegExp(`${label}</p><p[^>]*>(\\d+)<`))?.[1];
    expect([stat("Total properties"), stat("Live listings")]).toEqual(["1", "0"]);
    expect(html).toContain("Published · Unavailable");
    expect(html).not.toContain("Published · Available");
  });
  it("shows a load error rather than an empty state when the query fails", async () => {
    mocks.listings.mockResolvedValueOnce({ data: null, error: { message: "failure" } });
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    expect(html).toContain("Could not load your properties");
    expect(html).not.toContain("No properties yet");
  });
});
