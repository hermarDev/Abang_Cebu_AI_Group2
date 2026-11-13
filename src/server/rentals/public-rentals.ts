import type { createClient } from "@/lib/supabase/server";
import { mapListing, mapSubmittedRental } from "@/server/rentals/map-listing";
import type { RentalResult } from "@/contracts/preview";

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export const LISTING_PROJECTION = "id,title,description,price,currency,rental_period,property_type,latitude,longitude,address,city,image_urls,is_available,status,max_occupants,bathroom_type,cooking_allowed,laundry_allowed,curfew_type,wifi_available,aircon,water_included,electricity_included,motorcycle_parking,car_parking,verification_status,direct_landlord";

const MEDIA_PATH = /^[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f]{64}\.(?:jpg|png|webp)$/i;

// Public moderation policy (CODE-01): `pending` submissions stay discoverable
// but are always labeled unverified; only `approved` map to `property_verified`.
export const PUBLIC_SUBMITTED_STATUSES = ["approved", "pending"] as const;

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
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { data, error } = await createAdminClient().storage.from("property-draft-media").createSignedUrls(paths, 3600);
    if (error || !Array.isArray(data)) return signed;
    for (const item of data) if (item.path && item.signedUrl && !item.error) signed.set(item.path, item.signedUrl);
  } catch { /* shortcut: unsigned photos degrade to no image; add logging when observability exists */ }
  return signed;
}

export type PublicRentalsResult =
  | { status: "ok"; rentals: RentalResult[] }
  | { status: "unavailable" };

// Single public inventory loader (ARCH-01): finder, assistant and favorites all
// read the same two sources through the same mappers and visibility policy.
export async function loadPublicRentals(
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
  if (hasListingsError && (!submitted || submitted.error || !rawSubmittedRows.length)) {
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
  return { status: "ok", rentals: rentals.filter((r, i) => rentals.findIndex((o) => o.id === r.id) === i) };
}
