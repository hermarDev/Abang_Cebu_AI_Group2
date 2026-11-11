import "server-only";
import { PLACE_BOUNDS } from "@/lib/search/places";

export type ReverseGeocodeResult = {
  address: string;
  barangay: string;
  city: string;
};

const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

function isWithinCebu(longitude: number, latitude: number): boolean {
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= PLACE_BOUNDS.west &&
    longitude <= PLACE_BOUNDS.east &&
    latitude >= PLACE_BOUNDS.south &&
    latitude <= PLACE_BOUNDS.north
  );
}

function resolveCebuMunicipality(longitude: number, latitude: number): string {
  if (longitude >= 123.95 && latitude >= 10.25 && latitude <= 10.36) return "Lapu-Lapu City";
  if (longitude >= 123.91 && latitude >= 10.32 && latitude <= 10.38) return "Mandaue City";
  if (latitude >= 10.36 && latitude < 10.42 && longitude >= 123.93) return "Consolacion";
  if (latitude >= 10.38 && latitude < 10.45) return "Liloan";
  if (latitude >= 10.23 && latitude < 10.28 && longitude >= 123.80) return "Talisay City";
  if (latitude >= 10.21 && latitude < 10.26) return "Minglanilla";
  if (latitude >= 10.28 && latitude <= 10.40 && longitude >= 123.82 && longitude <= 123.95) return "Cebu City";
  return "Cebu";
}

function deterministicCebuFallback(longitude: number, latitude: number): ReverseGeocodeResult | null {
  if (!isWithinCebu(longitude, latitude)) return null;
  const latStr = `${Math.abs(latitude).toFixed(4)}°${latitude >= 0 ? "N" : "S"}`;
  const lonStr = `${Math.abs(longitude).toFixed(4)}°${longitude >= 0 ? "E" : "W"}`;
  return {
    address: `Pinned location (${latStr}, ${lonStr})`,
    barangay: "",
    city: resolveCebuMunicipality(longitude, latitude),
  };
}

async function queryGoogleMaps(longitude: number, latitude: number, apiKey: string): Promise<ReverseGeocodeResult | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.search = new URLSearchParams({ latlng: `${latitude},${longitude}`, key: apiKey, language: "en" }).toString();
  const res = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!res.ok) return null;
  const data: unknown = await res.json();
  if (!data || typeof data !== "object" || !("results" in data) || !Array.isArray(data.results) || data.results.length === 0) return null;
  const first = data.results[0] as { address_components?: Array<{ long_name: string; types: string[] }>; formatted_address?: string };
  const components = first.address_components ?? [];
  const getComp = (types: string[]) => components.find((c) => types.some((t) => c.types.includes(t)))?.long_name ?? "";
  const streetNumber = getComp(["street_number"]);
  const route = getComp(["route"]);
  const address = [streetNumber, route].filter(Boolean).join(" ") || text(first.formatted_address, 180);
  const barangay = getComp(["sublocality_level_1", "sublocality", "neighborhood"]);
  const city = getComp(["locality", "administrative_area_level_2"]);
  if (!address && !barangay && !city) return null;
  return {
    address: text(address, 180),
    barangay: text(barangay, 200),
    city: text(city, 200) || resolveCebuMunicipality(longitude, latitude),
  };
}

async function queryPhoton(longitude: number, latitude: number): Promise<ReverseGeocodeResult | null> {
  const url = new URL("https://photon.komoot.io/reverse");
  url.search = new URLSearchParams({ lat: String(latitude), lon: String(longitude), limit: "1", lang: "en" }).toString();
  const response = await fetch(url, { headers: { "User-Agent": "AbangCebu-preview/0.1" }, signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!response.ok) return null;
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("features" in body) || !Array.isArray(body.features) || body.features.length === 0) return null;
  const properties: unknown = body.features[0]?.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return null;
  const p = properties as Record<string, unknown>;
  const address = [text(p.housenumber, 40), text(p.street, 120)].filter(Boolean).join(" ") || text(p.name, 180);
  const barangay = text(p.district, 200) || text(p.suburb, 200);
  const city = text(p.city, 200) || text(p.town, 200);
  if (!address && !barangay && !city) return null;
  return { address, barangay, city };
}

async function queryNominatim(longitude: number, latitude: number): Promise<ReverseGeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.search = new URLSearchParams({ lat: String(latitude), lon: String(longitude), format: "jsonv2", addressdetails: "1" }).toString();
  const response = await fetch(url, { headers: { "User-Agent": "AbangCebu-App/1.0" }, signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!response.ok) return null;
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("address" in body) || !body.address || typeof body.address !== "object") return null;
  const a = body.address as Record<string, unknown>;
  const address = [text(a.house_number, 40), text(a.road, 120)].filter(Boolean).join(" ") || text((body as Record<string, unknown>).display_name, 180);
  const barangay = text(a.suburb, 200) || text(a.village, 200) || text(a.neighbourhood, 200) || text(a.quarter, 200);
  const city = text(a.city, 200) || text(a.town, 200) || text(a.municipality, 200);
  if (!address && !barangay && !city) return null;
  return { address, barangay, city };
}

export async function reverseGeocode([longitude, latitude]: [number, number]): Promise<ReverseGeocodeResult | null> {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  if (!isWithinCebu(longitude, latitude)) return null;

  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleApiKey) {
    try {
      const gResult = await queryGoogleMaps(longitude, latitude, googleApiKey);
      if (gResult) return gResult;
    } catch { /* proceed to next tier */ }
  }

  try {
    const photonResult = await queryPhoton(longitude, latitude);
    if (photonResult) return photonResult;
  } catch { /* proceed to next tier */ }

  try {
    const nominatimResult = await queryNominatim(longitude, latitude);
    if (nominatimResult) return nominatimResult;
  } catch { /* proceed to next tier */ }

  return deterministicCebuFallback(longitude, latitude);
}
