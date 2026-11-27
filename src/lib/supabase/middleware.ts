import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createBoundedFetch } from "./fetch-timeout";
import { getPostLoginRedirect, getRoleHomeRoute, isWorkspaceRole } from "@/types/auth";

const PUBLIC_ENTRY_PATHS = new Set(["/", "/map", "/login", "/register"]);

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
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  if (PUBLIC_ENTRY_PATHS.has(pathname)) {
    supabaseResponse.headers.set("Cache-Control", "private, no-store");
    const errorParam = request.nextUrl.searchParams.get("error");
    const isRecoveryErrorOnLogin =
      pathname === "/login" &&
      (errorParam === "expired_recovery_link" || errorParam === "invalid_recovery_link" || errorParam === "password_reset_unavailable");

    if (!authError && authData?.user && !isRecoveryErrorOnLogin) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_suspended")
        .eq("id", authData.user.id)
        .maybeSingle();
      if (!profileError && !profile?.is_suspended && isWorkspaceRole(profile?.role)) {
        const destination =
          pathname === "/login"
            ? getPostLoginRedirect(request.nextUrl.searchParams.get("next"), profile.role)
            : getRoleHomeRoute(profile.role);
        const safeTarget =
          new URL(destination, request.url).pathname === "/login"
            ? getRoleHomeRoute(profile.role)
            : destination;
        const response = NextResponse.redirect(new URL(safeTarget, request.url));
        for (const cookie of supabaseResponse.cookies.getAll()) response.cookies.set(cookie);
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      }
    }
  }

  return supabaseResponse;
}
