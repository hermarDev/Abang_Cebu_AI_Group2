import "server-only";
import { parsePhotonPlaces, PLACE_BOUNDS, type PlaceResult } from "@/lib/search/places";

const CACHE_TTL_MS = 60 * 60 * 1000;
const REQUEST_INTERVAL_MS = 1000;
const CACHE_LIMIT = 100;

const cache = new Map<string, { expires: number; places: PlaceResult[] }>();
let nextRequestAt = 0;

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const normalized = query.trim().toLowerCase();
  const cached = cache.get(normalized);
  if (cached && cached.expires > Date.now()) return cached.places;
  if (Date.now() < nextRequestAt) {
    throw new Error("Place search is rate limited.");
  }

  nextRequestAt = Date.now() + REQUEST_INTERVAL_MS;
  const url = new URL("https://photon.komoot.io/api/");
  url.search = new URLSearchParams({
    q: query.trim(),
    limit: "8",
    lang: "en",
    bbox: `${PLACE_BOUNDS.west},${PLACE_BOUNDS.south},${PLACE_BOUNDS.east},${PLACE_BOUNDS.north}`,
  }).toString();

  const response = await fetch(url, {
    headers: { "User-Agent": "AbangCebu-preview/0.1" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Place search provider is unavailable.");

  const places = parsePhotonPlaces(await response.json());
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(normalized, { expires: Date.now() + CACHE_TTL_MS, places });
  return places;
}
