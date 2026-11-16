import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Route handlers verify their own session; cookie-less visitors have nothing to refresh.
  let response: NextResponse;
  if (request.nextUrl.pathname.startsWith("/api/") || !request.cookies.getAll().some(({ name }) => name.startsWith("sb-"))) {
    response = NextResponse.next({ request });
  } else {
    response = await updateSession(request);
  }
  if (["/", "/map", "/login", "/register"].includes(request.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
