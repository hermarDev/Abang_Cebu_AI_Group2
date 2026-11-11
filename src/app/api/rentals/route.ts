import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { mapListing, mapSubmittedRental } from "@/server/rentals/map-listing";

const projection = "id,title,description,price,currency,rental_period,property_type,latitude,longitude,address,city,image_urls,is_available,status,max_occupants,bathroom_type,cooking_allowed,laundry_allowed,curfew_type,wifi_available,aircon,water_included,electricity_included,motorcycle_parking,car_parking,verification_status,direct_landlord";
const mediaPath = /^[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f]{64}\.(?:jpg|png|webp)$/i;

async function signPhotos(rows: unknown[]): Promise<Map<string, string>> {
  const paths = [...new Set(rows.flatMap((row) => {
    const photos = (row as { photo_paths?: unknown } | null)?.photo_paths;
    return Array.isArray(photos) ? photos.filter((p): p is string => typeof p === "string" && mediaPath.test(p)) : [];
  }))];
  const signed = new Map<string, string>();
  if (!paths.length) return signed;
  try {
    const { data, error } = await createAdminClient().storage.from("property-draft-media").createSignedUrls(paths, 3600);
    if (error || !Array.isArray(data)) return signed;
    for (const item of data) if (item.path && item.signedUrl && !item.error) signed.set(item.path, item.signedUrl);
  } catch { /* shortcut: unsigned photos degrade to no image; add logging when observability exists */ }
  return signed;
}

export async function GET(request: Request): Promise<Response>;
export async function GET(): Promise<Response>;
export async function GET(request?: Request): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  try {
    const url = request ? new URL(request.url) : null;
    const targetId = url?.searchParams.get("id");
    const supabase = await createClient();
    let listingsQuery = supabase.from("listings")
      .select(projection)
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
    if (error || !Array.isArray(data)) throw new Error("Rental read failed");
    // Submitted-property failures degrade to published listings only; they must not take down the map.
    const rawSubmittedRows = submitted && !submitted.error && Array.isArray(submitted.data) ? (submitted.data as unknown[]) : [];
    const submittedRows = targetId
      ? rawSubmittedRows.filter(
          (r) =>
            (r as { id?: string; property_id?: string })?.id === targetId ||
            (r as { id?: string; property_id?: string })?.property_id === targetId
        )
      : rawSubmittedRows;
    const visibleSubmittedRows = submittedRows.filter((row) => {
      const status = (row as { moderation_status?: unknown } | null)?.moderation_status;
      return status === "approved" || status === "pending";
    });
    const signed = await signPhotos(visibleSubmittedRows);
    const submittedRentals = visibleSubmittedRows.flatMap((row) => { try { return [mapSubmittedRental(row, signed)]; } catch { return []; } });
    const publishedRentals = data.flatMap((row) => {
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
    return Response.json({ rentals: rentals.filter((r, i) => rentals.findIndex((o) => o.id === r.id) === i) }, { headers });
  } catch {
    return Response.json({ error: "Rental listings are temporarily unavailable. Please try again later." }, { status: 503, headers });
  }
}
