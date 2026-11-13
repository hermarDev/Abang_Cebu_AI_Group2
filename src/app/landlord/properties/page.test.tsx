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
}));

vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: mocks.signAvatar }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        createSignedUrls: async (paths: string[]) => ({
          data: paths.map((p) => ({ path: p, signedUrl: `https://signed.example/${p}` })),
          error: null,
        }),
      }),
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.statusRpc,
    from: (table: string) =>
      table === "profiles"
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
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
  usePathname: () => "/landlord/properties",
  useSearchParams: () => new URLSearchParams(),
}));

import LandlordPropertiesPage from "./page";

describe("LandlordPropertiesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });
    mocks.notFound.mockImplementation(() => { throw new Error("not found"); });
    mocks.signAvatar.mockResolvedValue(null);
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null });
    mocks.profile.mockResolvedValue({ data: { full_name: "Test Landlord", role: "landlord", is_suspended: false }, error: null });
    mocks.eq.mockReturnValue({ order: mocks.listings });
    mocks.landlordEq.mockReturnValue({ order: mocks.properties });
    mocks.submissionEq.mockReturnValue({ order: mocks.submissions });
    mocks.draftsEq.mockReturnValue({ order: mocks.drafts });
    mocks.units.mockResolvedValue({ data: [{ property_id: "prop-1", monthly_rent: 40000, is_available: true }], error: null });
    mocks.statusRpc.mockResolvedValue({ data: [{ propertyId: "prop-2", reason: "Need business permit copy." }], error: null });

    mocks.listings.mockResolvedValue({ data: [], error: null });
    mocks.properties.mockResolvedValue({
      data: [
        {
          id: "prop-1",
          title: "Cebu It Park",
          description: "Studio apartment",
          property_type: "studio",
          street_address: "M.J. Cuenco Avenue",
          city: "Cebu City",
          status: "pending",
        },
        {
          id: "prop-2",
          title: "Apas House",
          description: "2BR House",
          property_type: "house",
          street_address: "Apas",
          city: "Cebu City",
          status: "rejected",
        },
      ],
      error: null,
    });
    mocks.submissions.mockResolvedValue({
      data: [
        {
          property_id: "prop-1",
          draft_id: "draft-1",
          expected_revision: 2,
          superseded_by: null,
          snapshot_payload: { property: { street_address: "M.J. Cuenco Avenue" } },
          snapshot_media: [],
        },
        {
          property_id: "prop-2",
          draft_id: "draft-2",
          expected_revision: 3,
          superseded_by: null,
          snapshot_payload: null,
          snapshot_media: [],
        },
      ],
      error: null,
    });
    mocks.drafts.mockResolvedValue({
      data: [
        {
          id: "draft-standalone",
          payload: {
            property: { title: "Unfinished Lahug Condo", street_address: "Salinas Dr", city: "Cebu City" },
            unit: { monthly_rent: "25000" },
          },
          revision: 1,
        },
      ],
      error: null,
    });
  });

  it("denies access to unauthenticated users or non-landlord accounts", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(LandlordPropertiesPage()).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/login?next=%2Flandlord%2Fproperties");

    mocks.profile.mockResolvedValueOnce({ data: { role: "renter" }, error: null });
    await expect(LandlordPropertiesPage()).rejects.toThrow("not found");
  });

  it("renders properties organized with filter tabs, statuses, prices, addresses, and actions", async () => {
    const html = renderToStaticMarkup(await LandlordPropertiesPage());

    // Navigation and header
    expect(html).toContain("My properties");
    expect(html).toContain("Overview");
    expect(html).toContain("Add property");
    expect(html).toContain("Manage your rental listings");

    // Status filter tabs
    expect(html).toContain('role="tablist"');
    expect(html).toContain("All");
    expect(html).toContain("Under review");
    expect(html).toContain("Changes requested");
    expect(html).toContain("Drafts");

    // Property cards
    expect(html).toContain("Cebu It Park");
    expect(html).toContain("M.J. Cuenco Avenue, Cebu City");
    expect(html).toContain("₱40,000");
    expect(html).toContain("Pending review");

    expect(html).toContain("Apas House");
    expect(html).toContain("Changes requested");
    expect(html).toContain("Feedback: ");
    expect(html).toContain("Need business permit copy.");

    expect(html).toContain("Unfinished Lahug Condo");
    expect(html).toContain("₱25,000");
    expect(html).toContain("Draft");

    // Action buttons
    expect(html).toContain("Preview");
    expect(html).toContain("Edit");
    expect(html).toContain('href="/list-property?draftId=draft-1&amp;revision=2"');
    expect(html).toContain('href="/list-property?draftId=draft-2&amp;revision=3"');
    expect(html).toContain('href="/list-property?draftId=draft-standalone&amp;revision=1"');
  });

  it("renders a partial-error alert banner when any source query fails", async () => {
    mocks.listings.mockResolvedValueOnce({ data: null, error: { message: "Failed to load listings" } });
    const html = renderToStaticMarkup(await LandlordPropertiesPage());

    expect(html).toContain('role=\"alert\"');
    expect(html).toContain("Some property information could not be loaded");
    expect(html).toContain("Refresh");
    // Succeeded items are still displayed
    expect(html).toContain("Cebu It Park");
  });

  it("renders a truncation notice when truncated flag is true", async () => {
    mocks.properties.mockResolvedValueOnce({
      data: Array.from({ length: 1000 }, (_, i) => ({
        id: `prop-${i}`,
        title: `Property ${i}`,
        status: "pending",
        property_type: "studio",
        street_address: "Address",
        city: "Cebu City",
      })),
      error: null,
    });
    const html = renderToStaticMarkup(await LandlordPropertiesPage());

    expect(html).toContain("Showing the first 1,000 properties");
  });

  it("displays Revision under review badge for approved properties with pending revision", async () => {
    mocks.properties.mockResolvedValueOnce({
      data: [
        {
          id: "prop-1",
          title: "Published With Edit",
          status: "approved",
          property_type: "condo",
          street_address: "Apas, Cebu City",
          city: "Cebu City",
        },
      ],
      error: null,
    });
    mocks.submissions.mockResolvedValueOnce({
      data: [
        {
          property_id: "prop-1",
          draft_id: "draft-edit",
          expected_revision: 3,
          superseded_by: null,
          review_status: "pending",
          snapshot_payload: null,
          snapshot_media: [],
        },
      ],
      error: null,
    });
    mocks.units.mockResolvedValueOnce({
      data: [{ property_id: "prop-1", monthly_rent: 35000, is_available: true }],
      error: null,
    });

    const html = renderToStaticMarkup(await LandlordPropertiesPage());

    expect(html).toContain("Published With Edit");
    expect(html).toContain("Published · Available");
    expect(html).toContain("Revision under review");
    expect(html).toContain("Condominium");
    expect(html).toContain("Apas, Cebu City");
  });
});
