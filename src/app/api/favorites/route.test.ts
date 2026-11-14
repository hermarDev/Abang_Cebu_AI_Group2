import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), favorites: vi.fn(), listing: vi.fn(), insert: vi.fn(), remove: vi.fn(), ownerFilter: vi.fn(), adminRows: vi.fn(), sessionRows: vi.fn(), rpc: vi.fn(), createSignedUrls: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ in: mocks.adminRows }) }),
    storage: { from: () => ({ createSignedUrls: mocks.createSignedUrls }) },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  rpc: mocks.rpc,
  from: (table: string) => {
    if (table === "profiles") return { select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) };
    if (table === "favorites") return { select: () => ({ eq: mocks.ownerFilter }), insert: mocks.insert, delete: () => ({ eq: () => ({ eq: mocks.remove }) }) };
    if (table === "listings") return { select: () => ({ in: mocks.sessionRows, eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.listing }) }) }) }) };
    throw new Error(`Unexpected table ${table}`);
  },
}) }));
import { DELETE, GET, POST } from "./route";

const listingId = "12345678-1234-4234-8234-123456789abc";
function request(method: string, expectedUser?: string) {
  return new Request("http://localhost/api/favorites", {
    method,
    headers: { "content-type": "application/json", ...(expectedUser === undefined ? {} : { "x-expected-user-id": expectedUser }) },
    ...(method === "GET" ? {} : { body: JSON.stringify({ listingId }) }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "account-b" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "renter", is_suspended: false }, error: null });
  mocks.ownerFilter.mockReturnValue({ order: mocks.favorites });
  mocks.favorites.mockResolvedValue({ data: [], error: null });
  mocks.listing.mockResolvedValue({ data: { id: listingId }, error: null });
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  mocks.createSignedUrls.mockResolvedValue({ data: [], error: null });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
});

describe("favorites account consistency", () => {
  it.each([["GET", GET], ["POST", POST], ["DELETE", DELETE]] as const)("rejects stale %s before any data query", async (method, handler) => {
    const response = await handler(request(method, "account-a"));
    expect(response?.status).toBe(409);
    expect(response?.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.profile).not.toHaveBeenCalled();
    expect(mocks.favorites).not.toHaveBeenCalled();
    expect(mocks.listing).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it.each([["GET", GET, 200], ["POST", POST, 201], ["DELETE", DELETE, 200]] as const)("accepts matching %s", async (method, handler, status) => {
    expect((await handler(request(method, "account-b")))?.status).toBe(status);
  });
  it.each([["GET", GET], ["POST", POST], ["DELETE", DELETE]] as const)("rejects unbound legacy %s and asks for refresh", async (method, handler) => {
    const response = await handler(request(method));
    expect(response?.status).toBe(409);
    expect(await response?.json()).toEqual({ error: "Your account changed. Please refresh and try again." });
    expect(mocks.profile).not.toHaveBeenCalled();
  });
  it("limits favorites reads to the authenticated owner", async () => {
    expect((await GET(request("GET", "account-b")))?.status).toBe(200);
    expect(mocks.ownerFilter).toHaveBeenCalledWith("user_id", "account-b");
  });
  it.each([["draft", true], ["archived", true], ["published", false]] as const)("redacts %s listing with available=%s", async (status, isAvailable) => {
    mocks.favorites.mockResolvedValue({ data: [{ listing_id: listingId, created_at: "2026-01-01" }], error: null });
    mocks.sessionRows.mockResolvedValue({ data: [{ id: listingId, title: "Private draft", description: "Private details", price: 1, status, is_available: isAvailable, image_urls: [] }], error: null });
    const response = await GET(request("GET", "account-b"));
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({ favorites: [{ id: listingId, savedAt: "2026-01-01", title: "Unavailable rental", description: "", price: 0, propertyType: "", address: "", city: "", imageUrls: [], isAvailable: false }] });
  });
  it("retains an unavailable placeholder when the referenced listing is missing", async () => {
    mocks.favorites.mockResolvedValue({ data: [{ listing_id: listingId, created_at: "2026-01-01" }], error: null });
    mocks.sessionRows.mockResolvedValue({ data: [], error: null });
    const response = await GET(request("GET", "account-b"));
    expect(await response?.json()).toEqual({ favorites: [expect.objectContaining({ id: listingId, title: "Unavailable rental", isAvailable: false })] });
  });
  it("keeps the favorite when public listing data is malformed", async () => {
    mocks.favorites.mockResolvedValue({ data: [{ listing_id: listingId, created_at: "2026-01-01" }], error: null });
    mocks.sessionRows.mockResolvedValue({ data: [{ id: listingId, title: null, price: "not-a-price", status: "published", is_available: true }], error: null });
    const response = await GET(request("GET", "account-b"));
    expect(await response?.json()).toEqual({ favorites: [expect.objectContaining({ id: listingId, title: "Unavailable rental", isAvailable: false })] });
  });
  it("returns published and available listing details", async () => {
    mocks.favorites.mockResolvedValue({ data: [{ listing_id: listingId, created_at: "2026-01-01" }], error: null });
    mocks.sessionRows.mockResolvedValue({ data: [{ id: listingId, title: "Public rental", description: "Public details", price: 100, status: "published", is_available: true, image_urls: [] }], error: null });
    const response = await GET(request("GET", "account-b"));
    expect(mocks.sessionRows).toHaveBeenCalledWith("id", [listingId]);
    expect(mocks.adminRows).not.toHaveBeenCalled();
    expect(await response?.json()).toEqual({ favorites: [expect.objectContaining({ id: listingId, title: "Public rental", description: "Public details", isAvailable: true })] });
  });
  it("rejects a signed-out request before inspecting owner state", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await GET(request("GET", "account-a")))?.status).toBe(401);
    expect(mocks.profile).not.toHaveBeenCalled();
  });
  it("allows saving a submitted property from get_public_submitted_rentals when not in listings", async () => {
    mocks.listing.mockResolvedValue({ data: null, error: null });
    mocks.rpc.mockResolvedValue({
      data: [{
        id: listingId,
        title: "Cebu It Park",
        description: "Submitted boarding house",
        price: 40000,
        property_type: "boarding_house",
        rental_type: "room",
        address: "M.J. Cuenco Avenue",
        city: "Cebu City",
        latitude: 10.3089,
        longitude: 123.9081,
        moderation_status: "approved",
        photo_paths: [],
      }],
      error: null,
    });
    const response = await POST(request("POST", "account-b"));
    expect(response?.status).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith({ user_id: "account-b", listing_id: listingId });
  });
  it("returns submitted property details with signed photo URLs on GET when not in listings", async () => {
    const validPath = "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333/" + "a".repeat(64) + ".jpg";
    mocks.favorites.mockResolvedValue({ data: [{ listing_id: listingId, created_at: "2026-11-08" }], error: null });
    mocks.sessionRows.mockResolvedValue({ data: [], error: null });
    mocks.rpc.mockResolvedValue({
      data: [{
        id: listingId,
        title: "Cebu It Park",
        description: "Submitted boarding house",
        price: 40000,
        property_type: "boarding_house",
        rental_type: "room",
        address: "M.J. Cuenco Avenue",
        city: "Cebu City",
        latitude: 10.3089,
        longitude: 123.9081,
        moderation_status: "approved",
        photo_paths: [validPath],
      }],
      error: null,
    });
    mocks.createSignedUrls.mockResolvedValue({
      data: [{ path: validPath, signedUrl: "https://example.com/signed-cover.jpg", error: null }],
      error: null,
    });
    const response = await GET(request("GET", "account-b"));
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({
      favorites: [{
        id: listingId,
        savedAt: "2026-11-08",
        title: "Cebu It Park",
        description: "Submitted boarding house",
        price: 40000,
        propertyType: "boarding_house",
        address: "M.J. Cuenco Avenue",
        city: "Cebu City",
        imageUrls: ["https://example.com/signed-cover.jpg"],
        isAvailable: true,
      }],
    });
  });
  it("allows saving and reading an approved condominium submission with normalized propertyType", async () => {
    mocks.listing.mockResolvedValue({ data: null, error: null });
    mocks.favorites.mockResolvedValue({ data: [{ listing_id: listingId, created_at: "2026-11-08" }], error: null });
    mocks.sessionRows.mockResolvedValue({ data: [], error: null });
    mocks.rpc.mockResolvedValue({
      data: [{
        id: listingId,
        title: "Approved Condo",
        description: "Reviewed and approved",
        price: 13500,
        property_type: "condominium",
        rental_type: "entire_place",
        address: "Lahug",
        city: "Cebu City",
        latitude: 10.33,
        longitude: 123.9,
        moderation_status: "approved",
        photo_paths: [],
      }],
      error: null,
    });
    expect((await POST(request("POST", "account-b")))?.status).toBe(201);
    const getResponse = await GET(request("GET", "account-b"));
    expect(getResponse?.status).toBe(200);
    expect(await getResponse?.json()).toEqual({
      favorites: [expect.objectContaining({
        id: listingId,
        title: "Approved Condo",
        propertyType: "condo",
        isAvailable: true,
      })],
    });
  });
  it.each(["rejected", "archived"])("rejects saving a %s submitted property with 409", async (status) => {
    mocks.listing.mockResolvedValue({ data: null, error: null });
    mocks.rpc.mockResolvedValue({ data: [{ id: listingId, title: "Hidden", price: 1, moderation_status: status, photo_paths: [] }], error: null });
    expect((await POST(request("POST", "account-b")))?.status).toBe(409);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it.each(["rejected", "archived"])("redacts a %s submitted property on GET", async (status) => {
    mocks.favorites.mockResolvedValue({ data: [{ listing_id: listingId, created_at: "2026-11-08" }], error: null });
    mocks.sessionRows.mockResolvedValue({ data: [], error: null });
    mocks.rpc.mockResolvedValue({ data: [{ id: listingId, title: "Secret Pending Title", price: 1, moderation_status: status, photo_paths: [] }], error: null });
    const text = (await (await GET(request("GET", "account-b")))?.text()) ?? "";
    expect(text).not.toContain("Secret Pending Title");
    expect(JSON.parse(text).favorites).toEqual([{ id: listingId, savedAt: "2026-11-08", title: "Unavailable rental", description: "", price: 0, propertyType: "", address: "", city: "", imageUrls: [], isAvailable: false }]);
  });
});
