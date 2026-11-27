import { createClient } from "@/lib/supabase/server";
import { publicRentalsLimiter } from "@/server/api-limiters";
import { getClientIp } from "@/server/rate-limit";
import { loadPublicRentals } from "@/server/rentals/public-rentals";

export async function GET(request: Request): Promise<Response>;
export async function GET(): Promise<Response>;
export async function GET(request?: Request): Promise<Response> {
  const noStoreHeaders = { "Cache-Control": "no-store" };
  const publicCacheHeaders = { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" };
  if (request) {
    const { allowed, retryAfterSeconds } = publicRentalsLimiter.checkDetailed(request, getClientIp(request) ?? "unknown-ip");
    if (!allowed) {
      return Response.json(
        { error: "Too many rental requests. Please wait a moment before trying again." },
        { status: 429, headers: { ...noStoreHeaders, "Retry-After": String(retryAfterSeconds) } },
      );
    }
  }
  try {
    const url = request ? new URL(request.url) : null;
    const targetId = url?.searchParams.get("id");
    const supabase = await createClient();
    const result = await loadPublicRentals(supabase, targetId);
    if (result.status !== "ok") {
      return Response.json({ error: "Rental listings are temporarily unavailable. Please try again later." }, { status: 503, headers: noStoreHeaders });
    }
    return Response.json({ rentals: result.rentals }, { headers: publicCacheHeaders });
  } catch {
    return Response.json({ error: "Rental listings are temporarily unavailable. Please try again later." }, { status: 503, headers: noStoreHeaders });
  }
}
