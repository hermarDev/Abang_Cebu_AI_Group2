export const PLACE_BOUNDS = {
  west: 123.75,
  south: 10.18,
  east: 124.05,
  north: 10.5,
} as const;

export type PlaceResult = {
  id: string;
  name: string;
  detail: string;
  coordinates: [longitude: number, latitude: number];
  category?: string;
};

function escapePlaceHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export function formatPlacePopupHtml(place: Pick<PlaceResult, "id" | "name" | "detail" | "coordinates">): string {
  return `<strong>${escapePlaceHtml(place.name)}</strong>${place.detail ? `<br><span>${escapePlaceHtml(place.detail)}</span>` : ""}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim().slice(0, maxLength) || undefined;
}

function categoryFor(value?: string): string {
  if (value === "university") return "University";
  if (value === "college" || value === "school") return "College";
  if (value === "city" || value === "town") return "City";
  if (["suburb", "neighbourhood", "quarter", "village"].includes(value ?? "")) {
    return "Neighborhood";
  }
  return "Landmark";
}

export function parsePhotonPlaces(data: unknown): PlaceResult[] {
  if (!isRecord(data) || !Array.isArray(data.features)) return [];

  const seen = new Set<string>();
  const places: PlaceResult[] = [];
  for (const feature of data.features) {
    if (!isRecord(feature) || !isRecord(feature.geometry) || !isRecord(feature.properties)) {
      continue;
    }

    const coordinates = feature.geometry.coordinates;
    const properties = feature.properties;
    if (
      feature.geometry.type !== "Point" ||
      !Array.isArray(coordinates) || coordinates.length !== 2 ||
      typeof coordinates[0] !== "number" || typeof coordinates[1] !== "number" ||
      !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1]) ||
      typeof properties.osm_id !== "number" || !Number.isSafeInteger(properties.osm_id) ||
      properties.osm_id < 0 || typeof properties.osm_type !== "string"
    ) {
      continue;
    }

    const optional = [properties.name, properties.street, properties.housenumber,
      properties.district, properties.city, properties.countrycode, properties.osm_value];
    if (optional.some((part) => part !== undefined && typeof part !== "string")) continue;

    const [longitude, latitude] = coordinates;
    if (
      boundedText(properties.countrycode, 2)?.toLowerCase() !== "ph" ||
      longitude < PLACE_BOUNDS.west || longitude > PLACE_BOUNDS.east ||
      latitude < PLACE_BOUNDS.south || latitude > PLACE_BOUNDS.north
    ) {
      continue;
    }

    const osmType = properties.osm_type.slice(0, 20);
    const id = `osm-${osmType}-${properties.osm_id}`;
    if (seen.has(id)) continue;

    const name = (boundedText(properties.name, 180) ||
      [boundedText(properties.housenumber, 40), boundedText(properties.street, 120)]
        .filter(Boolean).join(" ")).slice(0, 180);
    if (!name) continue;

    const street = boundedText(properties.street, 120);
    const district = boundedText(properties.district, 120);
    const city = boundedText(properties.city, 120);
    const detail = [...new Set([street, district, city].filter((part) => part && part !== name))]
      .join(", ").slice(0, 240);

    places.push({
      id,
      name,
      detail,
      coordinates: [longitude, latitude],
      category: categoryFor(boundedText(properties.osm_value, 60)),
    });
    seen.add(id);
    if (places.length === 8) break;
  }

  return places;
}

export function parsePlacesResponse(data: unknown): PlaceResult[] | undefined {
  if (!isRecord(data) || !Array.isArray(data.places) || data.places.length > 8) {
    return undefined;
  }

  const places: PlaceResult[] = [];
  for (const place of data.places) {
    if (!isRecord(place)) return undefined;
    const { id, name, detail, coordinates, category } = place;
    if (
      typeof id !== "string" || id.length > 100 ||
      typeof name !== "string" || !name.trim() || name.length > 180 ||
      typeof detail !== "string" || detail.length > 240 ||
      !Array.isArray(coordinates) || coordinates.length !== 2 ||
      typeof coordinates[0] !== "number" || typeof coordinates[1] !== "number" ||
      !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1]) ||
      coordinates[0] < PLACE_BOUNDS.west || coordinates[0] > PLACE_BOUNDS.east ||
      coordinates[1] < PLACE_BOUNDS.south || coordinates[1] > PLACE_BOUNDS.north ||
      (category !== undefined && (typeof category !== "string" || category.length > 60))
    ) {
      return undefined;
    }
    places.push({
      id,
      name,
      detail,
      coordinates: [coordinates[0], coordinates[1]],
      ...(typeof category === "string" ? { category } : {}),
    });
  }
  return places;
}
