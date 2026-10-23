import type { Coordinate, RentalResult } from "@/contracts/preview";

export const METRO_CEBU_CENTER: Coordinate = [123.8854, 10.3157];
const EARTH_RADIUS_METERS = 6_371_008.8;
const DEG_PER_RADIAN = 180 / Math.PI;

type Point = { type: "Point"; coordinates: Coordinate };
type Polygon = { type: "Polygon"; coordinates: [number, number][][] };
type RentalFeature = {
  type: "Feature";
  properties: { id: string; title: string; price: number };
  geometry: { type: "Point"; coordinates: Coordinate };
};
type RadiusFeature = {
  type: "Feature";
  properties: { radiusMeters: number };
  geometry: { type: "Polygon"; coordinates: [number, number][][] };
};
type FeatureCollection<G, P> = {
  type: "FeatureCollection";
  features: Array<{ type: "Feature"; properties: P; geometry: G }>;
};
export type RentalMarkerGroup = {
  coordinates: Coordinate;
  rentals: RentalResult[];
};

export function groupRentalsByCoordinates(rentals: RentalResult[]): RentalMarkerGroup[] {
  const groups = new Map<string, RentalMarkerGroup>();
  for (const rental of rentals) {
    const key = `${rental.coordinates[0]},${rental.coordinates[1]}`;
    const group = groups.get(key);
    if (group) group.rentals.push(rental);
    else groups.set(key, { coordinates: rental.coordinates, rentals: [rental] });
  }
  return [...groups.values()];
}

export function makeRadiusPolygon(center: Coordinate, radiusMeters: number): RadiusFeature {
  const [longitude, latitude] = center;
  const angularDistance = radiusMeters / EARTH_RADIUS_METERS;
  const lat1 = latitude / DEG_PER_RADIAN;
  const lng1 = longitude / DEG_PER_RADIAN;
  const ring: [number, number][] = [];

  for (let index = 0; index < 64; index += 1) {
    const bearing = (index / 64) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance) +
        Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
        Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
      );
    ring.push([lng2 * DEG_PER_RADIAN, lat2 * DEG_PER_RADIAN]);
  }

  ring.push(ring[0]);

  return {
    type: "Feature",
    properties: { radiusMeters },
    geometry: { type: "Polygon", coordinates: [ring] },
  };
}

export function rentalsToGeoJSON(rentals: RentalResult[]): FeatureCollection<Point, RentalFeature["properties"]> {
  return {
    type: "FeatureCollection",
    features: rentals.map((rental): RentalFeature => ({
      type: "Feature",
      properties: { id: rental.id, title: rental.title, price: rental.price },
      geometry: { type: "Point", coordinates: rental.coordinates },
    })),
  };
}

export function radiusToGeoJSON(center: Coordinate, radiusMeters: number): FeatureCollection<Polygon, RadiusFeature["properties"]> {
  return {
    type: "FeatureCollection",
    features: [makeRadiusPolygon(center, radiusMeters)],
  };
}
