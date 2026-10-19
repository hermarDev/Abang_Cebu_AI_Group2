import { LANDMARKS } from "./landmarks";

export type ViewportBounds = [minLng: number, minLat: number, maxLng: number, maxLat: number];

export type MapListing = {
  id: string;
  title: string;
  price: number;
  currency: string;
  rentalPeriod: string;
  latitude: number;
  longitude: number;
};

type ListingProperties = {
  listingId: string;
  title: string;
  price: number;
  currency: string;
  rentalPeriod: string;
};

export type ListingPriceFeature = {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: ListingProperties;
};
export type ListingPriceFeatureCollection = {
  type: "FeatureCollection";
  features: ListingPriceFeature[];
};

export type ViewportSearchAdapter = (
  bounds: ViewportBounds,
  options: { signal: AbortSignal; query: string; landmarkId?: string },
) => Promise<MapListing[]>;

const MAX_VIEWPORT_SPAN = 180;

export function isValidViewportBounds(bounds: readonly number[]): bounds is ViewportBounds {
  if (bounds.length !== 4 || !bounds.every(Number.isFinite)) return false;

  const [minLng, minLat, maxLng, maxLat] = bounds;
  return (
    minLng >= -180 &&
    maxLng <= 180 &&
    minLat >= -90 &&
    maxLat <= 90 &&
    minLng < maxLng &&
    minLat < maxLat &&
    maxLng - minLng <= MAX_VIEWPORT_SPAN
  );
}

export function listingsToPriceFeatures(listings: readonly MapListing[]): ListingPriceFeature[] {
  const seenIds = new Set<string>();
  const features: ListingPriceFeature[] = [];

  for (const listing of listings) {
    if (
      !listing.id ||
      seenIds.has(listing.id) ||
      !Number.isFinite(listing.price) ||
      listing.price < 0 ||
      !Number.isFinite(listing.latitude) ||
      !Number.isFinite(listing.longitude) ||
      listing.latitude < -90 ||
      listing.latitude > 90 ||
      listing.longitude < -180 ||
      listing.longitude > 180
    ) {
      continue;
    }

    seenIds.add(listing.id);
    features.push({
      type: "Feature",
      id: listing.id,
      geometry: {
        type: "Point",
        coordinates: [listing.longitude, listing.latitude],
      },
      properties: {
        listingId: listing.id,
        title: listing.title,
        price: listing.price,
        currency: listing.currency,
        rentalPeriod: listing.rentalPeriod,
      },
    });
  }

  return features;
}

function withTimeout(signal: AbortSignal, timeoutMs: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => controller.abort(new Error("Viewport search timed out")), timeoutMs);

  if (signal.aborted) abort();

  return {
    signal: controller.signal,
    cleanup: () => {
      signal.removeEventListener("abort", abort);
      clearTimeout(timeout);
    },
  };
}

export async function searchCurrentViewport(
  adapter: ViewportSearchAdapter,
  bounds: readonly number[],
  options: { signal?: AbortSignal; timeoutMs?: number; query?: string; landmarkId?: string } = {},
): Promise<ListingPriceFeature[]> {
  if (!isValidViewportBounds(bounds)) {
    throw new RangeError("Viewport bounds must be [minLng, minLat, maxLng, maxLat]");
  }

  const request = withTimeout(options.signal ?? new AbortController().signal, options.timeoutMs ?? 10_000);
  try {
    const listings = await adapter(bounds, {
      signal: request.signal,
      query: options.query ?? "",
      ...(options.landmarkId ? { landmarkId: options.landmarkId } : {}),
    });
    if (request.signal.aborted) return [];
    return listingsToPriceFeatures(listings);
  } finally {
    request.cleanup();
  }
}

type RankedLandmark = {
  landmark: (typeof LANDMARKS)[number];
  index: number;
  aliasRank: number;
  matchLength: number;
};

export type Landmark = (typeof LANDMARKS)[number];

export function getCurrentSuggestions(query: string, currentQuery: string): Landmark[] {
  if (query !== currentQuery) return [];
  return getLandmarkSuggestions(query);
}

export function findLandmarkById(landmarkId: string): Landmark | undefined {
  return LANDMARKS.find((landmark) => landmark.id === landmarkId);
}

export function getLandmarkSuggestions(query: string, limit = 5): Landmark[] {
  const normalized = normalize(query);
  if (!normalized || !Number.isSafeInteger(limit) || limit <= 0) return [];

  return LANDMARKS
    .map((landmark, index): RankedLandmark | null => {
      const matches = landmark.aliases
        .map(normalize)
        .filter((alias) => alias.includes(normalized));
      if (!matches.length) return null;

      const bestMatch = matches.sort((a, b) => a.length - b.length)[0];
      return {
        landmark,
        index,
        aliasRank: bestMatch === normalized ? 0 : bestMatch.startsWith(normalized) ? 1 : 2,
        matchLength: bestMatch.length,
      };
    })
    .filter((candidate): candidate is RankedLandmark => candidate !== null)
    .sort((a, b) => a.aliasRank - b.aliasRank || a.matchLength - b.matchLength || a.index - b.index)
    .slice(0, limit)
    .map(({ landmark }) => landmark);
}

export function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
