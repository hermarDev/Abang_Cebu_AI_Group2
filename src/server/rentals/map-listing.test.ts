import { describe, expect, it } from "vitest";
import { mapListing } from "./map-listing";

export const listing = {
  id: "d9cdfbde-346b-4bcc-956a-960db23b6792", title: "Room in Cebu", description: "Private room",
  price: 4500, currency: "PHP", rental_period: "monthly", property_type: "private_room",
  latitude: 10.32, longitude: 123.91, address: "Cebu", city: "Cebu City",
  is_available: true, status: "published", max_occupants: 2, bathroom_type: "shared",
  cooking_allowed: true, laundry_allowed: false, curfew_type: "none", wifi_available: true,
  aircon: false, water_included: true, electricity_included: false,
  motorcycle_parking: null, car_parking: false, verification_status: "unverified", direct_landlord: true,
};

describe("mapListing", () => {
  it("maps public fields without exposing owner data or invented amenities", () => {
    const result = mapListing({ ...listing, owner_id: "private-owner", owner_phone: "private-phone" });
    expect(result).toMatchObject({ id: listing.id, coordinates: [123.91, 10.32], price: 4500,
      locality: "Cebu City", propertyType: "private_room", type: "private_room", basis: "room",
      distanceMeters: null, waterPricingType: "included", electricityPricingType: null,
      motorcycleParking: null, maxOccupants: 2 });
    expect(result.amenities).toEqual(["Wi-Fi", "Cooking allowed", "Water included"]);
    expect(result).not.toHaveProperty("owner_id");
    expect(result).not.toHaveProperty("owner_phone");
  });

  it.each([
    { latitude: NaN }, { longitude: 181 }, { price: -1 }, { price: "4500" },
    { title: " " }, { id: null }, { property_type: "unknown" }, { status: "draft" },
    { is_available: false }, { wifi_available: "false" }, { max_occupants: 1.5 },
    { bathroom_type: "unknown" }, { verification_status: "verified" },
    { currency: "USD" }, { rental_period: "daily" },
  ])("rejects malformed or unsupported values: %j", (patch) => {
    expect(() => mapListing({ ...listing, ...patch })).toThrow();
  });

  it("retains unknown nullable fields instead of inventing false values", () => {
    const result = mapListing({ ...listing, wifi_available: null, max_occupants: null,
      bathroom_type: null, cooking_allowed: null, water_included: null });
    expect(result.wifiAvailable).toBeNull();
    expect(result.maxOccupants).toBeNull();
    expect(result.bathroomType).toBeNull();
    expect(result.waterPricingType).toBeNull();
    expect(result.amenities).toEqual([]);
  });

  it("maps bedspaces to per-bed basis", () => {
    expect(mapListing({ ...listing, property_type: "bedspace" }).basis).toBe("bed");
  });

  it.each([null, [], "listing"])("rejects a non-record %j", (value) => {
    expect(() => mapListing(value)).toThrow();
  });
});
