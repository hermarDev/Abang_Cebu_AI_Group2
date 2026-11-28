import { favoritesLimiter } from "@/server/api-limiters";
import { loadPublicSubmittedRentals } from "@/server/rentals/public-rentals";
import { checkRateLimit, createRoleGuard, noStoreHeaders, uuidPattern } from "@/server/role-access";

type SavedFavorite = { id: string; savedAt: string; title: string; description: string; price: number; propertyType: string; address: string; city: string; imageUrls: string[]; isAvailable: boolean };
const unavailableFavorite = (listingId: string, savedAt: string): SavedFavorite => ({ id: listingId, savedAt, title: "Unavailable rental", description: "", price: 0, propertyType: "", address: "", city: "", imageUrls: [], isAvailable: false });

async function loadSubmittedRentalsMap(
  supabase: unknown,
  targetIds: Set<string>,
  signPhotos = true,
): Promise<Map<string, Omit<SavedFavorite, "savedAt">>> {
  const result = new Map<string, Omit<SavedFavorite, "savedAt">>();
  if (targetIds.size === 0) return result;
  const rentals = await loadPublicSubmittedRentals(supabase, signPhotos);
  for (const rental of rentals) {
    if (!targetIds.has(rental.id)) continue;
    result.set(rental.id, {
      id: rental.id,
      title: rental.title,
      description: rental.description,
      price: rental.price,
      propertyType: rental.propertyType ?? rental.type,
      address: rental.address ?? "",
      city: rental.locality,
      imageUrls: rental.imageUrls ?? [],
      isAvailable: true,
    });
  }
  return result;
}

const requireRenter = createRoleGuard({
  allowedRoles: ["renter"],
  unauthenticatedMessage: "Sign in to access saved rentals.",
  forbiddenMessage: "Saved rentals are available to renter accounts only.",
});

async function readListingId(request: Request): Promise<string | null> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("listingId" in body) || typeof body.listingId !== "string") return null;
    return uuidPattern.test(body.listingId) ? body.listingId : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const session = await requireRenter(request);
    if ("response" in session) return session.response;

    const { data: favorites, error: favoriteError } = await session.supabase
      .from("favorites")
      .select("listing_id,created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (favoriteError) {
      return Response.json({ error: "Saved rentals could not be loaded. Please try again." }, { status: 503, headers: noStoreHeaders });
    }
    if (!favorites?.length) return Response.json({ favorites: [] }, { headers: noStoreHeaders });

    const listingIds = favorites.map((favorite) => favorite.listing_id);
    const { data: listings, error: listingError } = await session.supabase
      .from("listings")
      .select("id,title,description,price,property_type,address,city,image_urls,is_available,status")
      .in("id", listingIds);

    if (listingError || !listings) {
      return Response.json({ error: "Saved rental details could not be loaded. Please try again." }, { status: 503, headers: noStoreHeaders });
    }

    const byId = new Map(listings.map((listing) => [listing.id, listing]));
    const missingIds = new Set(listingIds.filter((id) => !byId.has(id)));
    const submittedById = await loadSubmittedRentalsMap(session.supabase, missingIds);

    const savedRentals = favorites.flatMap((favorite) => {
      const listing = byId.get(favorite.listing_id);
      if (!listing) {
        const submitted = submittedById.get(favorite.listing_id);
        return [submitted ? { ...submitted, savedAt: favorite.created_at } : unavailableFavorite(favorite.listing_id, favorite.created_at)];
      }
      if (listing.status !== "published" || listing.is_available !== true || typeof listing.title !== "string" || !Number.isFinite(Number(listing.price))) {
        return [unavailableFavorite(favorite.listing_id, favorite.created_at)];
      }
      return [{
        id: listing.id,
        savedAt: favorite.created_at,
        title: listing.title,
        description: typeof listing.description === "string" ? listing.description : "",
        price: Number(listing.price),
        propertyType: listing.property_type,
        address: listing.address,
        city: listing.city,
        imageUrls: Array.isArray(listing.image_urls)
          ? listing.image_urls.filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url))
          : [],
        isAvailable: listing.status === "published" && listing.is_available === true,
      }];
    });

    return Response.json({ favorites: savedRentals }, { headers: noStoreHeaders });
  } catch {
    return Response.json({ error: "Saved rentals are temporarily unavailable. Please try again." }, { status: 503, headers: noStoreHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRenter(request);
    if ("response" in session) return session.response;
    const limited = checkRateLimit(
      favoritesLimiter,
      request,
      session.user.id,
      "Too many favorites actions. Please wait a moment before trying again.",
    );
    if (limited) return limited;
    const listingId = await readListingId(request);
    if (!listingId) return Response.json({ error: "Choose a valid rental to save." }, { status: 400, headers: noStoreHeaders });

    const { data: listing, error: listingError } = await session.supabase
      .from("listings")
      .select("id")
      .eq("id", listingId)
      .eq("status", "published")
      .eq("is_available", true)
      .maybeSingle();

    if (listingError) return Response.json({ error: "The rental could not be checked. Please try again." }, { status: 503, headers: noStoreHeaders });
    if (!listing) {
      const submittedById = await loadSubmittedRentalsMap(session.supabase, new Set([listingId]), false);
      if (!submittedById.has(listingId)) {
        return Response.json({ error: "This rental is no longer available to save." }, { status: 409, headers: noStoreHeaders });
      }
    }

    const { error: insertError } = await session.supabase
      .from("favorites")
      .insert({ user_id: session.user.id, listing_id: listingId });

    if (insertError && insertError.code !== "23505") {
      return Response.json({ error: "This rental could not be saved. Please try again." }, { status: 503, headers: noStoreHeaders });
    }
    return Response.json({ saved: true }, { status: insertError ? 200 : 201, headers: noStoreHeaders });
  } catch {
    return Response.json({ error: "This rental could not be saved. Please try again." }, { status: 503, headers: noStoreHeaders });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireRenter(request);
    if ("response" in session) return session.response;
    const limited = checkRateLimit(
      favoritesLimiter,
      request,
      session.user.id,
      "Too many favorites actions. Please wait a moment before trying again.",
    );
    if (limited) return limited;
    const listingId = await readListingId(request);
    if (!listingId) return Response.json({ error: "Choose a valid rental to remove." }, { status: 400, headers: noStoreHeaders });

    const { error } = await session.supabase
      .from("favorites")
      .delete()
      .eq("user_id", session.user.id)
      .eq("listing_id", listingId);

    if (error) return Response.json({ error: "This rental could not be removed. Please try again." }, { status: 503, headers: noStoreHeaders });
    return Response.json({ saved: false }, { headers: noStoreHeaders });
  } catch {
    return Response.json({ error: "This rental could not be removed. Please try again." }, { status: 503, headers: noStoreHeaders });
  }
}
