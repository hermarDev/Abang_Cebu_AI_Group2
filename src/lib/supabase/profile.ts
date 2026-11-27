import { cache } from "react";
import type { Profile } from "@/types/database";
import { createClient } from "./server";

/** Profile columns shared by every page that loads the signed-in user. */
const PROFILE_COLUMNS = "id, role, full_name, phone_number, avatar_url, is_suspended";

type CachedProfile = Pick<Profile, "id" | "role" | "full_name" | "phone_number" | "avatar_url" | "is_suspended">;

/**
 * Request-scoped user + profile lookup. Pages share one GoTrue and one profiles
 * round trip during a server render instead of repeating them.
 */
export const loadProfile = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { user: null, profile: null, authError, profileError: null };

  const { data, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: data as unknown as CachedProfile | null,
    authError,
    profileError,
  };
});
