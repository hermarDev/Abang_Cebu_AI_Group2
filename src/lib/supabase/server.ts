import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createBoundedFetch } from "./fetch-timeout";

function resolvePublicSupabaseConfig() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build" && (!envUrl || !envKey || envUrl.includes("placeholder.supabase.co") || envKey === "placeholder-anon-key")) {
    throw new Error("Supabase server configuration is missing.");
  }
  return {
    supabaseUrl: envUrl || "https://placeholder.supabase.co",
    supabaseAnonKey: envKey || "placeholder-anon-key",
  };
}

/**
 * Cookie-less anon client for public, cacheable reads that must never read or set auth cookies.
 */
export function createPublicClient() {
  const { supabaseUrl, supabaseAnonKey } = resolvePublicSupabaseConfig();
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: createBoundedFetch(6_000) },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Creates a Supabase client for use in Server Components, Server Actions, and Route Handlers.
 * In Next.js 16, cookies() returns a Promise and must be awaited.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = resolvePublicSupabaseConfig();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: createBoundedFetch(6_000) },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}
