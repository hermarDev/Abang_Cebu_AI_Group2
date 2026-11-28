import type { createClient } from "@/lib/supabase/server";
import { mapListing, mapSubmittedRental } from "@/server/rentals/map-listing";
import type { RentalResult } from "@/contracts/preview";

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export const LISTING_PROJECTION = "id,title,description,price,currency,rental_period,property_type,latitude,longitude,address,city,image_urls,is_available,status,max_occupants,bathroom_type,cooking_allowed,laundry_allowed,curfew_type,wifi_available,aircon,water_included,electricity_included,motorcycle_parking,car_parking,verification_status,direct_landlord";

const MEDIA_PATH = /^[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f]{64}\.(?:jpg|png|webp)$/i;

// Public moderation policy (CODE-01): only `approved` properties are visible on the public renter map.
export const PUBLIC_SUBMITTED_STATUSES = ["approved"] as const;

const SIGNED_PHOTO_CACHE_TTL_MS = 45 * 60 * 1000;
const SIGNED_PHOTO_CACHE_LIMIT = 2_000;
const PUBLIC_RENTALS_CACHE_TTL_MS = 30 * 1000;
// shortcut: process-local signed URL & public inventory caches; move to shared cache if scaled beyond one instance.
const signedPhotoCache = new Map<string, { url: string; expiresAt: number }>();
const publicRentalsCache = new Map<string, { result: Extract<PublicRentalsResult, { status: "ok" }>; expiresAt: number }>();
const publicRentalsInFlight = new Map<string, Promise<PublicRentalsResult>>();
const publicSubmittedCache = new Map<string, { rentals: RentalResult[]; expiresAt: number }>();
const publicSubmittedInFlight = new Map<string, Promise<RentalResult[]>>();
let publicRentalsGeneration = 0;

export function resetSignedPhotoCache() {
  signedPhotoCache.clear();
}

export function invalidatePublicRentalsCache() {
  publicRentalsGeneration += 1;
  publicRentalsCache.clear();
  publicSubmittedCache.clear();
  publicRentalsInFlight.clear();
  publicSubmittedInFlight.clear();
}

function isSubmittedStatus(value: unknown): value is (typeof PUBLIC_SUBMITTED_STATUSES)[number] {
  return typeof value === "string" && (PUBLIC_SUBMITTED_STATUSES as readonly string[]).includes(value);
}

export async function signSubmittedPhotos(rows: unknown[]): Promise<Map<string, string>> {
  const paths = [...new Set(rows.flatMap((row) => {
    const photos = (row as { photo_paths?: unknown } | null)?.photo_paths;
    return Array.isArray(photos) ? photos.filter((p): p is string => typeof p === "string" && MEDIA_PATH.test(p)) : [];
  }))];
  const signed = new Map<string, string>();
  if (!paths.length) return signed;

  const now = Date.now();
  const uncached: string[] = [];
  for (const path of paths) {
    const cached = signedPhotoCache.get(path);
    if (cached && cached.expiresAt > now) {
      signed.set(path, cached.url);
    } else {
      if (cached) signedPhotoCache.delete(path);
      uncached.push(path);
    }
  }
  if (!uncached.length) return signed;

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { data, error } = await createAdminClient().storage.from("property-draft-media").createSignedUrls(uncached, 3600);
    if (error || !Array.isArray(data)) return signed;
    const expiresAt = Date.now() + SIGNED_PHOTO_CACHE_TTL_MS;
    for (const item of data) {
      if (item.path && item.signedUrl && !item.error) {
        signed.set(item.path, item.signedUrl);
        if (signedPhotoCache.size >= SIGNED_PHOTO_CACHE_LIMIT && !signedPhotoCache.has(item.path)) {
          const oldest = signedPhotoCache.keys().next().value;
          if (oldest !== undefined) signedPhotoCache.delete(oldest);
        }
        signedPhotoCache.set(item.path, { url: item.signedUrl, expiresAt });
      }
    }
  } catch { /* shortcut: unsigned photos degrade to no image; add logging when observability exists */ }
  return signed;
}

export type PublicRentalsResult =
  | { status: "ok"; rentals: RentalResult[]; complete: boolean }
  | { status: "unavailable" };

// Single public inventory loader (ARCH-01): finder, assistant and favorites all
// read the same two sources through the same mappers and visibility policy.
export async function loadPublicRentals(
  supabase: ServerSupabase,
  targetId?: string | null,
  options: { signPhotos?: boolean } = {},
): Promise<PublicRentalsResult> {
  if (!targetId && !process.env.VITEST) {
    const cacheKey = options.signPhotos === false ? "unsigned" : "signed";
    const cached = publicRentalsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.result;
    if (cached) publicRentalsCache.delete(cacheKey);
    const pending = publicRentalsInFlight.get(cacheKey);
    if (pending) return pending;

    const generation = publicRentalsGeneration;
    const loadPromise = fetchPublicRentals(supabase, null, options).then((result) => {
      if (generation === publicRentalsGeneration && result.status === "ok" && result.complete) {
        publicRentalsCache.set(cacheKey, { result, expiresAt: Date.now() + PUBLIC_RENTALS_CACHE_TTL_MS });
      }
      return result;
    }).finally(() => {
      if (publicRentalsInFlight.get(cacheKey) === loadPromise) {
        publicRentalsInFlight.delete(cacheKey);
      }
    });
    publicRentalsInFlight.set(cacheKey, loadPromise);
    return loadPromise;
  }

  return fetchPublicRentals(supabase, targetId, options);
}

async function fetchPublicRentals(
  supabase: ServerSupabase,
  targetId?: string | null,
  options: { signPhotos?: boolean } = {},
): Promise<PublicRentalsResult> {
  let listingsQuery = supabase.from("listings")
    .select(LISTING_PROJECTION)
    .eq("status", "published")
    .eq("is_available", true);

  if (targetId) {
    listingsQuery = listingsQuery.eq("id", targetId).limit(1);
  } else {
    listingsQuery = listingsQuery
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(200);
  }

  const submittedQuery = typeof (supabase as { rpc?: unknown }).rpc === "function" ? supabase.rpc("get_public_submitted_rentals") : null;
  const [{ data, error }, submitted] = await Promise.all([listingsQuery, submittedQuery]);
  // Submitted-property failures degrade to published listings only; they must not take down the map.
  const rawSubmittedRows = submitted && !submitted.error && Array.isArray(submitted.data) ? (submitted.data as unknown[]) : [];
  const hasListingsError = Boolean(error || !Array.isArray(data));
  const hasSubmittedError = !submitted || Boolean(submitted.error) || !Array.isArray(submitted.data);
  if (hasListingsError && hasSubmittedError) {
    return { status: "unavailable" };
  }
  const submittedRows = targetId
    ? rawSubmittedRows.filter(
        (r) =>
          (r as { id?: string; property_id?: string })?.id === targetId ||
          (r as { id?: string; property_id?: string })?.property_id === targetId
      )
    : rawSubmittedRows;
  const visibleSubmittedRows = submittedRows.filter((row) => isSubmittedStatus((row as { moderation_status?: unknown } | null)?.moderation_status));
  const signed = options.signPhotos === false ? new Map<string, string>() : await signSubmittedPhotos(visibleSubmittedRows);
  const submittedRentals = visibleSubmittedRows.flatMap((row) => { try { return [mapSubmittedRental(row, signed)]; } catch { return []; } });
  const publishedRentals = (Array.isArray(data) ? data : []).flatMap((row) => {
    try {
      return [mapListing(row)];
    } catch (err) {
      if (err instanceof Error && err.message === "Invalid listing") {
        return [];
      }
      throw err;
    }
  });
  const rentals = [...submittedRentals, ...publishedRentals];
  const seenIds = new Set<string>();
  const uniqueRentals = rentals.filter((r) => {
    if (seenIds.has(r.id)) return false;
    seenIds.add(r.id);
    return true;
  });
  return { status: "ok", rentals: uniqueRentals, complete: !hasListingsError && !hasSubmittedError && (Boolean(targetId) || (Array.isArray(data) && data.length < 200)) && rawSubmittedRows.length < 200 };
}

/** Cached 30s loader for public approved submitted rentals (reused by favorites). */
export async function loadPublicSubmittedRentals(
  supabase: unknown,
  signPhotos = true,
): Promise<RentalResult[]> {
  const cacheKey = signPhotos ? "signed" : "unsigned";
  if (!process.env.VITEST) {
    const cached = publicSubmittedCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.rentals;
    if (cached) publicSubmittedCache.delete(cacheKey);
    const pending = publicSubmittedInFlight.get(cacheKey);
    if (pending) return pending;
  }

  const generation = publicRentalsGeneration;
  const run = (async (): Promise<RentalResult[]> => {
    const rpc = (supabase as { rpc?: (fn: string) => Promise<{ data: unknown; error: unknown }> } | null)?.rpc;
    if (typeof rpc !== "function") return [];
    try {
      const { data, error } = await rpc.call(supabase, "get_public_submitted_rentals");
      if (error || !Array.isArray(data)) return [];
      const visible = (data as unknown[]).filter((row) =>
        isSubmittedStatus((row as { moderation_status?: unknown } | null)?.moderation_status),
      );
      if (visible.length === 0) return [];
      const signed = signPhotos ? await signSubmittedPhotos(visible) : new Map<string, string>();
      const rentals = visible.flatMap((row) => {
        try {
          return [mapSubmittedRental(row, signed)];
        } catch {
          return [];
        }
      });
      if (!process.env.VITEST && generation === publicRentalsGeneration) {
        publicSubmittedCache.set(cacheKey, { rentals, expiresAt: Date.now() + PUBLIC_RENTALS_CACHE_TTL_MS });
      }
      return rentals;
    } catch (err) {
      console.error("[public-rentals] get_public_submitted_rentals failed:", err);
      return [];
    }
  })();

  if (process.env.VITEST) return run;
  publicSubmittedInFlight.set(cacheKey, run);
  try {
    return await run;
  } finally {
    if (publicSubmittedInFlight.get(cacheKey) === run) {
      publicSubmittedInFlight.delete(cacheKey);
    }
  }
}
