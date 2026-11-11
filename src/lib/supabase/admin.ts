import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createBoundedFetch } from "./fetch-timeout";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server storage is not configured.");
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    global: { fetch: createBoundedFetch(8_000) },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}