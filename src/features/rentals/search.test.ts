import { describe, expect, it } from "vitest";
import { searchPreviewRentals } from "./search";
import { DEFAULT_RENTAL_FILTERS } from "@/contracts/rental-filters";

const rentals = [
  { id: "lahug-wifi", title: "Lahug room", locality: "Lahug", coordinates: [123.907, 10.328] as [number, number], price: 2500, type: "room" as const, basis: "room" as const, amenities: ["Wi-Fi"], description: "", area: 10, tone: "sage" as const, available: true },
  { id: "lahug-no-wifi", title: "Lahug bedspace", locality: "Lahug", coordinates: [123.907, 10.328] as [number, number], price: 2000, type: "bedspace" as const, basis: "bed" as const, amenities: [], description: "", area: 10, tone: "sage" as const, available: true },
  { id: "mandaue-wifi", title: "Mandaue room", locality: "Mandaue", coordinates: [123.934, 10.339] as [number, number], price: 1800, type: "room" as const, basis: "room" as const, amenities: ["Wi-Fi"], description: "", area: 10, tone: "sage" as const, available: true },
  { id: "unavailable", title: "Lahug room", locality: "Lahug", coordinates: [123.907, 10.328] as [number, number], price: 1000, type: "room" as const, basis: "room" as const, amenities: ["Wi-Fi"], description: "", area: 10, tone: "sage" as const, available: false },
];

describe("searchPreviewRentals", () => {
  it("matches location, property type, availability, Wi-Fi, and inclusive budget", () => {
    expect(searchPreviewRentals(rentals as never, { ...DEFAULT_RENTAL_FILTERS, minPrice: null, maxPrice: 2500, propertyTypes: ["private_room"], wifiAvailable: true }, "lahug").map(({ id }) => id)).toEqual(["lahug-wifi"]);
  });

  it("uses the map center and radius to include only nearby sample rentals", () => {
    const results = searchPreviewRentals(rentals as never, { ...DEFAULT_RENTAL_FILTERS, radiusKm: 2 }, "", [123.907, 10.328]);
    expect(results.map(({ id }) => id)).toEqual(["lahug-no-wifi", "lahug-wifi"]);
  });

  it("does not impose filters that the user has not selected", () => {
    expect(searchPreviewRentals(rentals as never, DEFAULT_RENTAL_FILTERS).map(({ id }) => id)).toEqual(["lahug-no-wifi", "lahug-wifi", "mandaue-wifi"]);
  });
});
