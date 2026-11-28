import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invalidatePublicRentalsCache, loadPublicRentals, loadPublicSubmittedRentals, resetSignedPhotoCache } from "./public-rentals";

const mocks = vi.hoisted(() => ({ createSignedUrls: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ storage: { from: () => ({ createSignedUrls: mocks.createSignedUrls }) } }),
}));

function mockSupabase(listingsResult: unknown, submittedResult: unknown) {
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockResolvedValue(listingsResult);
  return {
    from: vi.fn(() => query),
    rpc: vi.fn().mockResolvedValue(submittedResult),
  } as unknown as Parameters<typeof loadPublicRentals>[0];
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function publishedRow(id: string) {
  return {
    id, title: `Rental ${id}`, description: "A rental", price: 9000, currency: "PHP", rental_period: "monthly",
    property_type: "studio", latitude: 10.31, longitude: 123.9, address: "Ayala", city: "Cebu City",
    image_urls: [], is_available: true, status: "published",
  };
}

function submittedRow(id: string) {
  return {
    id, title: `Rental ${id}`, description: "A submitted rental", price: 9000, property_type: "studio",
    rental_type: "entire_place", latitude: 10.31, longitude: 123.9, address: "Ayala", city: "Cebu City",
    moderation_status: "approved", photo_paths: [],
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  resetSignedPhotoCache();
  invalidatePublicRentalsCache();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadPublicRentals", () => {
  it("combines published listings with approved submitted rentals only and preserves multi-unit fields", async () => {
    const owner = "aaaaaaaa-0000-4000-8000-000000000001";
    const photo = `${owner}/bbbbbbbb-0000-4000-8000-000000000001/cccccccc-0000-4000-8000-000000000001/${"a".repeat(64)}.jpg`;
    mocks.createSignedUrls.mockResolvedValue({ data: [{ path: photo, signedUrl: "https://signed.test/photo.jpg", error: null }], error: null });

    const supabase = mockSupabase(
      {
        data: [{
          id: "listing-1",
          title: "Legacy Studio",
          description: "Near Ayala",
          price: 9000,
          currency: "PHP",
          rental_period: "monthly",
          property_type: "studio",
          latitude: 10.31,
          longitude: 123.9,
          address: "Ayala",
          city: "Cebu City",
          image_urls: [],
          is_available: true,
          status: "published",
          verification_status: "unverified",
        }],
        error: null,
      },
      {
        data: [
          {
            id: "sub-approved",
            title: "IT Park Condo",
            description: "Clean unit",
            price: 13500,
            property_type: "condominium",
            rental_type: "entire_place",
            latitude: 10.33,
            longitude: 123.91,
            address: "IT Park",
            city: "Cebu City",
            moderation_status: "approved",
            photo_paths: [photo],
            available_units_count: 2,
            total_units_count: 3,
            units: [
              { id: "u-1", unitNumber: "Room 1", rentalType: "entire_place", monthlyRent: 13500, maxOccupants: 2, isAvailable: true },
            ],
          },
          {
            id: "sub-pending",
            title: "Lahug Boarding",
            description: "Pending review",
            price: 40000,
            property_type: "boarding_house",
            rental_type: "private_room",
            latitude: 10.34,
            longitude: 123.9,
            address: "Lahug",
            city: "Cebu City",
            moderation_status: "pending",
            photo_paths: [],
          },
          {
            id: "sub-rejected",
            title: "Hidden Rejected",
            description: "Should not appear",
            price: 5000,
            property_type: "house",
            rental_type: "entire_place",
            latitude: 10.3,
            longitude: 123.89,
            address: "Secret",
            city: "Cebu City",
            moderation_status: "rejected",
            photo_paths: [],
          },
        ],
        error: null,
      },
    );

    const result = await loadPublicRentals(supabase);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.rentals.map((r) => [r.id, r.propertyType, r.verificationStatus])).toEqual([
      ["sub-approved", "condo", "property_verified"],
      ["listing-1", "studio", "unverified"],
    ]);
    expect(result.rentals[0].imageUrls).toEqual(["https://signed.test/photo.jpg"]);
    expect(result.rentals[0].availableUnitsCount).toBe(2);
    expect(result.rentals[0].totalUnitsCount).toBe(3);
    expect(result.rentals[0].units).toEqual([
      { id: "u-1", unitNumber: "Room 1", rentalType: "entire_place", monthlyRent: 13500, maxOccupants: 2, isAvailable: true },
    ]);
  });

  it("marks either failed or capped source incomplete", async () => {
    const ok = { data: [], error: null };
    const failed = { data: null, error: { message: "failed" } };
    for (const [legacy, submitted] of [[ok, failed], [failed, ok], [{ data: Array(200).fill(null), error: null }, ok], [ok, { data: Array(200).fill(null), error: null }]]) {
      expect(await loadPublicRentals(mockSupabase(legacy, submitted), null, { signPhotos: false })).toMatchObject({ status: "ok", complete: false });
    }
  });

  it("returns unavailable when both sources fail", async () => {
    const supabase = mockSupabase({ data: null, error: { message: "db error" } }, { data: null, error: { message: "rpc error" } });
    expect(await loadPublicRentals(supabase)).toEqual({ status: "unavailable" });
  });

  it("caches complete public inventory and deduplicates concurrent loads until invalidated", async () => {
    vi.stubEnv("VITEST", "");
    const supabase = mockSupabase({ data: [], error: null }, { data: [], error: null });
    const [a, b] = await Promise.all([loadPublicRentals(supabase), loadPublicRentals(supabase)]);
    expect(a).toEqual({ status: "ok", rentals: [], complete: true });
    expect(b).toEqual({ status: "ok", rentals: [], complete: true });
    expect(supabase.from).toHaveBeenCalledTimes(1);

    await loadPublicRentals(supabase);
    expect(supabase.from).toHaveBeenCalledTimes(1);

    invalidatePublicRentalsCache();
    await loadPublicRentals(supabase);
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it("does not let pre-invalidation loads repopulate or remove newer public inventory loads", async () => {
    vi.stubEnv("VITEST", "");
    const oldListings = deferred<{ data: unknown[]; error: null }>();
    const oldSubmitted = deferred<{ data: unknown[]; error: null }>();
    const oldClient = mockSupabase(oldListings.promise, oldSubmitted.promise);
    const oldLoad = loadPublicRentals(oldClient, null, { signPhotos: false });

    invalidatePublicRentalsCache();
    const newListings = deferred<{ data: unknown[]; error: null }>();
    const newSubmitted = deferred<{ data: unknown[]; error: null }>();
    const newClient = mockSupabase(newListings.promise, newSubmitted.promise);
    const newLoad = loadPublicRentals(newClient, null, { signPhotos: false });

    oldListings.resolve({ data: [publishedRow("old")], error: null });
    oldSubmitted.resolve({ data: [], error: null });
    const staleResult = await oldLoad;
    expect(staleResult.status === "ok" && staleResult.rentals.map(({ id }) => id)).toEqual(["old"]);

    const joinedClient = mockSupabase({ data: [], error: null }, { data: [], error: null });
    const joinedLoad = loadPublicRentals(joinedClient, null, { signPhotos: false });
    expect(joinedClient.from).not.toHaveBeenCalled();

    newListings.resolve({ data: [publishedRow("new")], error: null });
    newSubmitted.resolve({ data: [], error: null });
    const [freshResult, joinedResult] = await Promise.all([newLoad, joinedLoad]);
    expect(freshResult.status === "ok" && freshResult.rentals.map(({ id }) => id)).toEqual(["new"]);
    expect(joinedResult).toEqual(freshResult);

    const cachedResult = await loadPublicRentals(joinedClient, null, { signPhotos: false });
    expect(cachedResult).toEqual(freshResult);
    expect(joinedClient.from).not.toHaveBeenCalled();
  });

  it("does not let pre-invalidation submitted-rental loads repopulate or remove newer loads", async () => {
    vi.stubEnv("VITEST", "");
    const oldSubmitted = deferred<{ data: unknown[]; error: null }>();
    const oldClient = mockSupabase({ data: [], error: null }, oldSubmitted.promise);
    const oldLoad = loadPublicSubmittedRentals(oldClient, false);

    invalidatePublicRentalsCache();
    const newSubmitted = deferred<{ data: unknown[]; error: null }>();
    const newClient = mockSupabase({ data: [], error: null }, newSubmitted.promise);
    const newLoad = loadPublicSubmittedRentals(newClient, false);

    oldSubmitted.resolve({ data: [submittedRow("old")], error: null });
    expect((await oldLoad).map(({ id }) => id)).toEqual(["old"]);

    const joinedClient = mockSupabase({ data: [], error: null }, { data: [], error: null });
    const joinedLoad = loadPublicSubmittedRentals(joinedClient, false);
    expect(joinedClient.rpc).not.toHaveBeenCalled();

    newSubmitted.resolve({ data: [submittedRow("new")], error: null });
    const [freshRentals, joinedRentals] = await Promise.all([newLoad, joinedLoad]);
    expect(freshRentals.map(({ id }) => id)).toEqual(["new"]);
    expect(joinedRentals).toEqual(freshRentals);

    expect(await loadPublicSubmittedRentals(joinedClient, false)).toEqual(freshRentals);
    expect(joinedClient.rpc).not.toHaveBeenCalled();
  });
});
