import { PLACE_BOUNDS } from "@/lib/search/places";
import { reverseGeocode } from "@/server/places/reverse-places";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = params.get("lat");
  const lon = params.get("lon");
  const latitude = Number(lat);
  const longitude = Number(lon);
  const headers = { "Cache-Control": "no-store" };
  if (!lat?.trim() || !lon?.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < PLACE_BOUNDS.south || latitude > PLACE_BOUNDS.north || longitude < PLACE_BOUNDS.west || longitude > PLACE_BOUNDS.east) {
    return Response.json({ error: "Choose a location within Cebu." }, { status: 400, headers });
  }
  try {
    return Response.json({ place: await reverseGeocode([longitude, latitude]) }, { headers });
  } catch {
    return Response.json({ error: "Address lookup is unavailable. Enter the address manually." }, { status: 503, headers });
  }
}
