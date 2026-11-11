import { placesSearchLimiter } from "@/server/api-limiters";
import { searchPlaces } from "@/server/places/search-places";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3 || query.length > 120) {
    return Response.json({ error: "Enter 3–120 characters to search Cebu." }, { status: 400, headers });
  }

  const { allowed, retryAfterSeconds } = placesSearchLimiter.checkDetailed(request, "search");
  if (!allowed) {
    return Response.json(
      { error: "Too many place search requests. Please wait a moment before searching again." },
      { status: 429, headers: { ...headers, "Retry-After": String(retryAfterSeconds) } },
    );
  }

  try {
    return Response.json({ places: await searchPlaces(query) }, { headers });
  } catch {
    return Response.json(
      { error: "Place search is temporarily unavailable. Please retry in a moment or choose a preset area." },
      { status: 503, headers },
    );
  }
}
