import { createClient } from "@/lib/supabase/server";
import { publicRentalsLimiter } from "@/server/api-limiters";
import { getClientIp } from "@/server/rate-limit";
import { loadPublicRentals } from "@/server/rentals/public-rentals";

export async function GET(request: Request): Promise<Response>;
export async function GET(): Promise<Response>;
export async function GET(request?: Request): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  if (request) {
    const { allowed, retryAfterSeconds } = publicRentalsLimiter.checkDetailed(request, getClientIp(request) ?? "unknown-ip");
    if (!allowed) {
      return Response.json(
        { error: "Too many rental requests. Please wait a moment before trying again." },
        { status: 429, headers: { ...headers, "Retry-After": String(retryAfterSeconds) } },
      );
    }
  }
  try {
    const url = request ? new URL(request.url) : null;
    const targetId = url?.searchParams.get("id");
    const supabase = await createClient();
    const result = await loadPublicRentals(supabase, targetId);
    if (result.status !== "ok") {
      return Response.json({ error: "Rental listings are temporarily unavailable. Please try again later." }, { status: 503, headers });
    }
    return Response.json({ rentals: result.rentals }, { headers });
  } catch {
    return Response.json({ error: "Rental listings are temporarily unavailable. Please try again later." }, { status: 503, headers });
  }
}
