import { describe, expect, it } from "vitest";
import { groupRentalsByCoordinates, makeRadiusPolygon } from "./map-geometry";
import type { RentalResult } from "@/contracts/preview";

const rental = (id: string, coordinates: [number, number]): RentalResult => ({
  id,
  title: id,
  locality: "Lahug, Cebu City",
  coordinates,
  price: 2500,
  type: "room",
  propertyType: "private_room",
  basis: "room",
  amenities: [],
  description: "Synthetic test rental",
  area: 12,
  tone: "blue",
  available: true,
  distanceMeters: 10,
});

describe("map rental geometry", () => {
  it("groups coincident rentals so each remains selectable from one marker", () => {
    const groups = groupRentalsByCoordinates([
      rental("a", [123.9, 10.32]),
      rental("b", [123.9, 10.32]),
      rental("c", [123.91, 10.33]),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].rentals.map(({ id }) => id)).toEqual(["a", "b"]);
    expect(groups[1].rentals.map(({ id }) => id)).toEqual(["c"]);
  });

  it("creates a closed geographic radius polygon around its center", () => {
    const center: [number, number] = [123.907, 10.328];
    const polygon = makeRadiusPolygon(center, 2000);
    const ring = polygon.geometry.coordinates[0];

    expect(polygon.geometry.type).toBe("Polygon");
    expect(ring).toHaveLength(65);
    expect(ring[0]).toEqual(ring.at(-1));
    expect(ring[0][0]).toBeCloseTo(center[0], 4);
    expect(ring[0][1]).toBeCloseTo(center[1] + 2000 / 111_195, 3);
  });
});
