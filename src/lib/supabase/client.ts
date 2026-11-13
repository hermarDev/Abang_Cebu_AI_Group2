import { createBrowserClient } from "@supabase/ssr";
import { createBoundedFetch } from "./fetch-timeout";

/**
 * Creates a Supabase client for use in Client Components ('use client').
 * Automatically uses environment variables for connection.
 */
export function createClient() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build" && (!envUrl || !envKey || envUrl.includes("placeholder.supabase.co"))) {
    throw new Error("Supabase browser configuration is missing.");
  }
  const supabaseUrl = envUrl || "https://placeholder.supabase.co";
  const supabaseAnonKey = envKey || "placeholder-anon-key";

  return createBrowserClient(supabaseUrl, supabaseAnonKey, { global: { fetch: createBoundedFetch(6_000) } });
}
