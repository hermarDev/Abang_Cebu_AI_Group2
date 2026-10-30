import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const noStoreHeaders = { "Cache-Control": "no-store" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireRenter() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { response: Response.json({ error: "Sign in to access saved rentals." }, { status: 401, headers: noStoreHeaders }) } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { response: Response.json({ error: "Your account could not be checked. Please try again." }, { status: 503, headers: noStoreHeaders }) } as const;
  }
  if (profile?.role !== "renter" || profile.is_suspended) {
    return { response: Response.json({ error: "Saved rentals are available to renter accounts only." }, { status: 403, headers: noStoreHeaders }) } as const;
  }

  return { supabase, user } as const;
}

async function readListingId(request: Request): Promise<string | null> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("listingId" in body) || typeof body.listingId !== "string") return null;
    return uuidPattern.test(body.listingId) ? body.listingId : null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const session = await requireRenter();
    if ("response" in session) return session.response;

    const { data: favorites, error: favoriteError } = await session.supabase
      .from("favorites")
      .select("listing_id,created_at")
      .order("created_at", { ascending: false });

    if (favoriteError) {
      return Response.json({ error: "Saved rentals could not be loaded. Please try again." }, { status: 503, headers: noStoreHeaders });
    }
    if (!favorites?.length) return Response.json({ favorites: [] }, { headers: noStoreHeaders });

    const listingIds = favorites.map((favorite) => favorite.listing_id);
    const { data: listings, error: listingError } = await createAdminClient()
      .from("listings")
      .select("id,title,description,price,property_type,address,city,image_urls,is_available,status")
      .in("id", listingIds);

    if (listingError || !listings) {
      return Response.json({ error: "Saved rental details could not be loaded. Please try again." }, { status: 503, headers: noStoreHeaders });
    }

    const byId = new Map(listings.map((listing) => [listing.id, listing]));
    const savedRentals = favorites.flatMap((favorite) => {
      const listing = byId.get(favorite.listing_id);
      if (!listing || typeof listing.title !== "string" || !Number.isFinite(Number(listing.price))) return [];
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
    const session = await requireRenter();
    if ("response" in session) return session.response;
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
    if (!listing) return Response.json({ error: "This rental is no longer available to save." }, { status: 409, headers: noStoreHeaders });

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
    const session = await requireRenter();
    if ("response" in session) return session.response;
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