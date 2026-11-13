import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createBoundedFetch } from "./fetch-timeout";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build" && (!envUrl || !envKey || envUrl.includes("placeholder.supabase.co") || envKey === "placeholder-anon-key")) {
    throw new Error("Supabase middleware configuration is missing.");
  }
  const supabaseUrl = envUrl || "https://placeholder.supabase.co";
  const supabaseAnonKey = envKey || "placeholder-anon-key";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: createBoundedFetch(6_000) },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  await supabase.auth.getUser();

  return supabaseResponse;
}
