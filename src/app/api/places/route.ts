import { placesSearchLimiter } from "@/server/api-limiters";
import { getClientIp } from "@/server/rate-limit";
import { searchPlaces } from "@/server/places/search-places";

export async function GET(request: Request) {
  const noStoreHeaders = { "Cache-Control": "no-store" };
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3 || query.length > 120) {
    return Response.json({ error: "Enter 3–120 characters to search Cebu." }, { status: 400, headers: noStoreHeaders });
  }

  const { allowed, retryAfterSeconds } = placesSearchLimiter.checkDetailed(request, getClientIp(request) ?? "unknown-ip");
  if (!allowed) {
    return Response.json(
      { error: "Too many place search requests. Please wait a moment before searching again." },
      { status: 429, headers: { ...noStoreHeaders, "Retry-After": String(retryAfterSeconds) } },
    );
  }

  try {
    return Response.json(
      { places: await searchPlaces(query) },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
    );
  } catch {
    return Response.json(
      { error: "Place search is temporarily unavailable. Please retry in a moment or choose a preset area." },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
