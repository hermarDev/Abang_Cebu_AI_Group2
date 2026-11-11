import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { PLACE_BOUNDS } from "@/lib/search/places";
import { reverseGeocode } from "@/server/places/reverse-places";
import { createRateLimiter } from "@/server/rate-limit";

const headers = { "Cache-Control": "no-store" };
const placesLimiter = createRateLimiter({ windowMs: 60_000, maxPerIp: 60, maxPerActor: 60 });

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && isAuthRetryableFetchError(authError)) {
    return Response.json({ error: "Your account could not be checked. Please try again." }, { status: 503, headers });
  }
  if (authError || !user) {
    return Response.json({ error: "Sign in required." }, { status: 401, headers });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return Response.json({ error: "Your account could not be checked. Please try again." }, { status: 503, headers });
  }
  if (profile?.role !== "landlord" || profile?.is_suspended) {
    return Response.json({ error: "Landlord account required." }, { status: 403, headers });
  }

  if (!placesLimiter.check(request, user.id)) {
    return Response.json({ error: "Too many location requests. Please wait a moment." }, { status: 429, headers });
  }

  const params = new URL(request.url).searchParams;
  const lat = params.get("lat");
  const lon = params.get("lon");
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (
    !lat?.trim() ||
    !lon?.trim() ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < PLACE_BOUNDS.south ||
    latitude > PLACE_BOUNDS.north ||
    longitude < PLACE_BOUNDS.west ||
    longitude > PLACE_BOUNDS.east
  ) {
    return Response.json({ error: "Choose a location within Cebu." }, { status: 400, headers });
  }

  try {
    return Response.json({ place: await reverseGeocode([longitude, latitude]) }, { headers });
  } catch {
    return Response.json({ error: "Address lookup is unavailable. Enter the address manually." }, { status: 503, headers });
  }
}
