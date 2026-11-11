import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data: unknown; error: unknown };
const mocks = vi.hoisted(() => ({ signed: vi.fn(), from: vi.fn(), getUser: vi.fn(), profile: vi.fn(), eq: vi.fn(), inFilter: vi.fn(), results: {} as Record<string, Result>, redirect: vi.fn(), notFound: vi.fn() }));
// Every chain step returns a thenable builder resolving to the table's configured result.
const builder = (table: string) => {
  const result = () => mocks.results[table];
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (...args: unknown[]) => { mocks.eq(table, ...args); return chain; },
    in: (...args: unknown[]) => { mocks.inFilter(table, ...args); return chain; },
    order: () => chain,
    limit: () => chain,
    then: (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result()).then(resolve, reject),
  };
  return chain;
};
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  from: (table: string) => table === "profiles" ? { select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) } : builder(table),
}) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ storage: { from: (bucket: string) => ({ createSignedUrls: (...args: unknown[]) => mocks.signed(bucket, ...args) }) } }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound, usePathname: () => "/landlord/map" }));
vi.mock("@/features/landlord/LandlordPropertyMap", () => ({ LandlordPropertyMap: ({ properties, loadError, initialSelectedId }: { properties: { title: string; status: string; price: number; editHref?: string | null; imageUrls?: string[]; description?: string | null; amenities?: string[] }[]; loadError: boolean; initialSelectedId?: string }) => <div data-selected={initialSelectedId ?? ""}>{loadError ? "Properties unavailable" : properties.map(p => `${p.title}|${p.status}|${p.price}|${p.editHref ?? "none"}${p.imageUrls?.length ? `|img:${p.imageUrls.join("+")}` : ""}${p.description ? `|desc:${p.description}` : ""}${p.amenities ? `|am:${p.amenities.join("+")}` : ""}`).join(", ")}</div> }));
import LandlordMapPage from "./page";

describe("landlord property map", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation(() => { throw new Error("redirect"); });
    mocks.notFound.mockImplementation(() => { throw new Error("not found"); });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-a" } }, error: null });
    mocks.profile.mockResolvedValue({ data: { role: "landlord", is_suspended: false }, error: null });
    mocks.signed.mockReset().mockResolvedValue({ data: [], error: null });
    mocks.results = {
      listings: { data: [{ id: "one", title: "My rental", price: 5000, latitude: 10.3, longitude: 123.9, status: "published" }], error: null },
      properties: { data: [
        { id: "p-pending", title: "Pending room", street_address: "1 St", city: "Cebu", latitude: "10.31", longitude: "123.89", status: "pending" },
        { id: "p-rejected", title: "Rejected house", street_address: "2 St", city: "Cebu", latitude: 10.32, longitude: 123.88, status: "rejected" },
        { id: "p-approved", title: "Approved flat", street_address: "3 St", city: "Cebu", latitude: 10.33, longitude: 123.87, status: "approved" },
        { id: "p-bad", title: "No coords", street_address: "4 St", city: "Cebu", latitude: null, longitude: 123.87, status: "pending" },
      ], error: null },
      rental_units: { data: [{ property_id: "p-pending", monthly_rent: "7500.00", is_available: true }], error: null },
      property_submissions: { data: [
        { property_id: "p-pending", draft_id: "draft 1", expected_revision: 2, superseded_by: null },
        { property_id: "p-rejected", draft_id: "old", expected_revision: 1, superseded_by: "op-2" },
        { property_id: "p-approved", draft_id: "draft-3", expected_revision: 1, superseded_by: null },
      ], error: null },
    };
  });
  it("denies guests and non-landlords", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(LandlordMapPage()).rejects.toThrow("redirect");
    expect(mocks.redirect).toHaveBeenCalledWith("/login?next=%2Flandlord%2Fmap");
    mocks.profile.mockResolvedValueOnce({ data: { role: "renter", is_suspended: false }, error: null });
    await expect(LandlordMapPage()).rejects.toThrow("not found");
    expect(mocks.eq).not.toHaveBeenCalled();
  });
  it("loads only the landlord's listings and submitted properties", async () => {
    const html = renderToStaticMarkup(await LandlordMapPage());
    expect(mocks.eq).toHaveBeenCalledWith("listings", "owner_id", "owner-a");
    expect(mocks.eq).toHaveBeenCalledWith("properties", "landlord_id", "owner-a");
    expect(mocks.eq).toHaveBeenCalledWith("property_submissions", "owner_id", "owner-a");
    expect(mocks.inFilter).toHaveBeenCalledWith("rental_units", "property_id", ["p-pending", "p-rejected", "p-approved", "p-bad"]);
    expect(html).toContain("Pending room|pending|7500|/list-property?draftId=draft%201&amp;revision=2, Rejected house|rejected|0|none, Approved flat|approved|0|none, My rental|published|5000|none");
    expect(html).not.toContain("No coords");
    expect(html).toContain('data-selected=""');
    expect(html).not.toContain('max-w-[1440px]');
    expect(html).toContain('src="/icons/main_Logo.png"');
    expect(html).toContain('src="/icons/main_Logo_Light.png"');
    expect(html).toMatch(/<a[^>]*aria-label="Back to dashboard"[^>]*><svg[^>]*lucide-arrow-left/);
  });
  it("passes a single ?selected id through and ignores repeated params", async () => {
    expect(renderToStaticMarkup(await LandlordMapPage({ searchParams: Promise.resolve({ selected: "p-rejected" }) }))).toContain('data-selected="p-rejected"');
    expect(renderToStaticMarkup(await LandlordMapPage({ searchParams: Promise.resolve({ selected: ["a", "b"] }) }))).toContain('data-selected=""');
  });
  it("skips the units query when there are no submitted properties", async () => {
    mocks.results.properties = { data: [], error: null };
    expect(renderToStaticMarkup(await LandlordMapPage())).toContain("My rental");
    expect(mocks.inFilter).not.toHaveBeenCalled();
  });
  it.each(["listings", "properties", "rental_units", "property_submissions"])("shows an error if %s cannot load", async (table) => {
    mocks.results[table] = { data: null, error: { message: "failed" } };
    expect(renderToStaticMarkup(await LandlordMapPage())).toContain("Properties unavailable");
  });
  it("batch-signs only valid photo paths and passes imageUrls, description and amenities", async () => {
    const uuid = "11111111-1111-1111-1111-111111111111";
    const photo = (n: string) => `${uuid}/${uuid}/${uuid}/${n.repeat(64)}.jpg`;
    const permit = `${uuid}/${uuid}/${uuid}/permit.pdf`;
    mocks.signed.mockResolvedValue({ data: [photo("a"), photo("b")].map(path => ({ path, signedUrl: `https://signed.test/${path.slice(-8)}` })), error: null });
    mocks.results.properties = { data: [{ id: "p-pending", title: "Pending room", description: null, street_address: "1 St", city: "Cebu", latitude: 10.31, longitude: 123.89, status: "pending" }], error: null };
    mocks.results.property_submissions = { data: [
      { property_id: "p-pending", draft_id: "d1", expected_revision: 2, superseded_by: null, snapshot_media: [{ kind: "photo", object_path: photo("a") }, { kind: "permit", object_path: permit }], snapshot_payload: { media: { photos: [{ object_path: photo("b") }, "../evil.jpg"] }, property: { description: "Near IT Park" }, amenities: ["wifi", "air_conditioning"] } },
      { property_id: "p-pending", draft_id: "old", expected_revision: 1, superseded_by: "x", snapshot_media: [{ kind: "photo", object_path: photo("c") }] },
    ], error: null };
    const html = renderToStaticMarkup(await LandlordMapPage());
    expect(mocks.signed).toHaveBeenCalledTimes(1);
    expect(mocks.signed).toHaveBeenCalledWith("property-draft-media", [photo("a"), photo("b")], 3600);
    expect(html).toContain(`|img:https://signed.test/${photo("a").slice(-8)}+https://signed.test/${photo("b").slice(-8)}|desc:Near IT Park|am:wifi+air conditioning`);
  });
  it("renders without photos when signing fails", async () => {
    const uuid = "11111111-1111-1111-1111-111111111111";
    mocks.signed.mockRejectedValue(new Error("not configured"));
    mocks.results.property_submissions = { data: [{ property_id: "p-pending", draft_id: "d1", expected_revision: 2, superseded_by: null, snapshot_media: [{ kind: "photo", object_path: `${uuid}/${uuid}/${uuid}/${"a".repeat(64)}.png` }] }], error: null };
    expect(renderToStaticMarkup(await LandlordMapPage())).toContain("Pending room|pending|7500|/list-property?draftId=d1&amp;revision=2, Rejected");
  });
});
