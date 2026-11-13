vi.mock("server-only", () => ({}));
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  listings: vi.fn(),
  properties: vi.fn(),
  submissions: vi.fn(),
  drafts: vi.fn(),
  units: vi.fn(),
  statusRpc: vi.fn(),
  eq: vi.fn(),
  landlordEq: vi.fn(),
  submissionEq: vi.fn(),
  draftsEq: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
  signAvatar: vi.fn(),
  storageSignedUrls: vi.fn(),
}));
vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: mocks.signAvatar }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        createSignedUrls: mocks.storageSignedUrls,
      }),
    },
  }),
}));
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
      : table === "property_drafts"
        ? { select: () => ({ eq: mocks.draftsEq }) }
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
    mocks.draftsEq.mockReturnValue({ order: mocks.drafts });
    mocks.units.mockResolvedValue({ data: [], error: null });
    mocks.submissions.mockResolvedValue({ data: [{ property_id: "property-b", draft_id: "draft-1", expected_revision: 2, superseded_by: null }], error: null });
    mocks.statusRpc.mockImplementation(async (name: string) => name === "landlord_rejection_feedback"
      ? { data: [{ propertyId: "property-b", reason: "Permit image unreadable." }], error: null }
      : { data: { draftId: "draft-1", revision: 2, propertyId: "property-b" }, error: null });
    mocks.drafts.mockResolvedValue({ data: [], error: null });
    mocks.storageSignedUrls.mockImplementation(async (paths: string[]) => ({
      data: paths.map((p) => ({ path: p, signedUrl: `https://signed.example/${p}` })),
      error: null,
    }));
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
    expect(html).toContain('href="/help"');
    expect(html).toContain("Help Center");
    expect(html).toContain('href="/support"');
    expect(html).toContain("Contact support");
    expect(html).not.toContain("Back to map");
    expect(html).toContain('href="/auth/logout"');
    expect(html).toContain("Log out");
    expect(html).not.toContain("Sign out");
    expect(html).toContain("Account settings");
    expect(html).not.toContain("Manage account");
    expect(html).toContain("Landlord tools");
    expect(html).toContain('aria-label="Landlord mobile navigation"');
    expect(html).toContain('aria-label="More landlord options"');
    expect(html).toContain('aria-label="Add property"');
    expect(html).toContain("My properties");
    expect(html).toContain("Total properties");
    expect(html).toContain("Welcome back, Landlord");
    expect(html).toContain("main_Logo.png");
    expect(html).toContain("main_Logo_Light.png");
    expect(html).toContain("Under review");
    expect(html).toContain("Changes requested");
    expect(html).toContain("Submitted and waiting for review");
    expect(html).toContain("Rejected with notes");
    expect(html).toContain("Add property");
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
    expect(html).toContain('aria-label="Add property"');
    expect(html).toContain('href="/list-property"');
    expect(html).not.toContain("The listing form is a preview");
    expect(html).toContain('href="/landlord/map?selected=property-a"');
    expect(html).toContain('href="/landlord/map?selected=property-b"');
    expect(html.match(/View on map/g)).toHaveLength(3);
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
    expect(html).toContain("Could not load review status. Refresh the page to try again.");
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
    expect([stat("Total properties"), stat("Published"), stat("Under review")]).toEqual(["2", "1", "1"]);
    expect(mocks.units).toHaveBeenCalledWith("property_id", ["property-a", "property-c"]);
    expect(html).toContain("Pending review");
    expect(html).toContain("Published · Available");
    expect(html).not.toContain("No properties yet");
  });
  it("displays 'No properties yet' when landlord has zero properties and no errors", async () => {
    mocks.listings.mockResolvedValueOnce({ data: [], error: null });
    mocks.properties.mockResolvedValueOnce({ data: [], error: null });
    mocks.drafts.mockResolvedValueOnce({ data: [], error: null });
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    expect(html).toContain("No properties yet");
    expect(html).toContain("Your properties will appear here.");
    expect(html).toContain('href="/list-property"');
  });
  it.each([
    ["has no available unit", { data: [{ property_id: "property-c", is_available: false }], error: null }, "Published · Unavailable", "1"],
    ["availability cannot be read", { data: null, error: { message: "failure" } }, "Published · Availability unknown", "1"],
  ])("correctly labels published property when %s", async (_name, units, label, publishedCount) => {
    mocks.listings.mockResolvedValueOnce({ data: [], error: null });
    mocks.properties.mockResolvedValueOnce({ data: [{ id: "property-c", title: "Approved flat", status: "approved" }], error: null });
    mocks.units.mockResolvedValueOnce(units);
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    const stat = (label: string) => html.match(new RegExp(`${label}</p><p[^>]*>(\\d+)<`))?.[1];
    expect([stat("Total properties"), stat("Published")]).toEqual(["1", publishedCount]);
    expect(html).toContain(label);
  });
  it("shows a load error rather than an empty state when the query fails", async () => {
    mocks.listings.mockResolvedValueOnce({ data: null, error: { message: "failure" } });
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    expect(html).toContain("Could not load your properties");
    expect(html).not.toContain("No properties yet");
  });
  it("shows a draft load error rather than an empty state when drafts fail with empty listings and properties", async () => {
    mocks.listings.mockResolvedValueOnce({ data: [], error: null });
    mocks.properties.mockResolvedValueOnce({ data: [], error: null });
    mocks.drafts.mockResolvedValueOnce({ data: null, error: { message: "drafts failure" } });
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    expect(html).toContain('role="alert"');
    expect(html).toContain("Could not load saved drafts");
    expect(html).not.toContain("No properties yet");
  });
  it("shows alerts for unit and media partial failures and status banner when truncated", async () => {
    const ownerUuid = "11111111-1111-4111-8111-111111111111";
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: ownerUuid } }, error: null });
    mocks.listings.mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => ({ id: `l-${i}`, title: `L ${i}`, status: "published", is_available: true })), error: null });
    mocks.properties.mockResolvedValueOnce({ data: [{ id: "property-c", title: "Approved flat", status: "approved" }], error: null });
    mocks.units.mockResolvedValueOnce({ data: null, error: { message: "units down" } });
    mocks.storageSignedUrls.mockResolvedValueOnce({ data: null, error: { message: "media down" } });
    mocks.submissions.mockResolvedValueOnce({
      data: [{
        property_id: "property-c",
        draft_id: "22222222-2222-4222-8222-222222222222",
        expected_revision: 1,
        superseded_by: null,
        snapshot_media: [{ kind: "photo", object_path: `${ownerUuid}/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333/${"a".repeat(64)}.jpg` }],
      }],
      error: null,
    });
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    expect(html).toContain("Unit availability and rent details could not be loaded");
    expect(html).toContain("Property thumbnails could not be loaded");
    expect(html).toContain("Showing the first 1,000");
  });
  it("shows needs-attention triage with filtered links and a view-all link", async () => {
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    const section = html.match(/<section id="needs-attention"[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(section).toContain('href="/landlord/properties?status=rejected"');
    expect(section).toContain('href="/landlord/properties?status=draft"');
    expect(section).not.toContain('href="/landlord/properties?status=pending"');
    expect(section).toContain("1 submission requires updates");
    expect(section).toContain("1 incomplete draft in portfolio");
    expect(section).not.toContain("property awaiting review");
    expect(section).not.toContain("Permit image unreadable.");
    expect(html).toContain('href="/landlord/properties">View all properties');
  });
  it("omits needs-attention when nothing requires action", async () => {
    mocks.listings.mockResolvedValueOnce({ data: [], error: null });
    mocks.properties.mockResolvedValueOnce({ data: [{ id: "property-c", title: "Approved flat", status: "approved" }], error: null });
    expect(renderToStaticMarkup(await LandlordDashboardPage())).not.toContain('id="needs-attention"');
  });
  it("renders enriched metadata for listings and submissions", async () => {
    mocks.listings.mockResolvedValueOnce({ data: [{ id: "listing-a", title: "Test property", status: "published", is_available: true, price: 8000, address: "5 Osmeña Blvd", city: "Cebu City", property_type: "condo", image_urls: null }], error: null });
    mocks.properties.mockResolvedValueOnce({ data: [{ id: "property-c", title: "Approved flat", status: "approved", street_address: "9 Mango Ave", city: "Cebu City", property_type: "apartment" }], error: null });
    mocks.units.mockResolvedValueOnce({ data: [{ property_id: "property-c", is_available: true, monthly_rent: 15000 }], error: null });
    const html = renderToStaticMarkup(await LandlordDashboardPage());
    expect(html).toContain("5 Osmeña Blvd, Cebu City · Condominium · ₱8,000/mo");
    expect(html).toContain("9 Mango Ave, Cebu City · Apartment · ₱15,000/mo");
  });
});
