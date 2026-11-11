import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { createBoundedFetch } from "./fetch-timeout";

/**
 * Creates a Supabase client for use in Server Components, Server Actions, and Route Handlers.
 * In Next.js 16, cookies() returns a Promise and must be awaited.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

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

/** Request-scoped: layouts and pages calling this share one GoTrue round trip. */
export const getCachedServerUser = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getUser();
});
