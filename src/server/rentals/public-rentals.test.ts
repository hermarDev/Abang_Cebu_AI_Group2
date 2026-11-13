import { describe, expect, it, vi } from "vitest";
import { loadPublicRentals } from "./public-rentals";

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

describe("loadPublicRentals", () => {
  it("combines published listings with approved and pending submitted rentals under one visibility and mapping contract", async () => {
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
      ["sub-pending", "boarding_house", "unverified"],
      ["listing-1", "studio", "unverified"],
    ]);
    expect(result.rentals[0].imageUrls).toEqual(["https://signed.test/photo.jpg"]);
  });

  it("returns unavailable when both sources fail", async () => {
    const supabase = mockSupabase({ data: null, error: { message: "db error" } }, { data: null, error: { message: "rpc error" } });
    expect(await loadPublicRentals(supabase)).toEqual({ status: "unavailable" });
  });
});
