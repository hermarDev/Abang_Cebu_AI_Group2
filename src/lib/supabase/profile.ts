import { cache } from "react";
import type { Profile } from "@/types/database";
import { createClient } from "./server";

/** Profile columns shared by every page that loads the signed-in user. */
const PROFILE_COLUMNS = "id, role, full_name, phone_number, avatar_url, is_suspended";
const PROFILE_CACHE_TTL_MS = 30 * 1000;
const PROFILE_CACHE_LIMIT = 2_000;

type CachedProfile = Pick<Profile, "id" | "role" | "full_name" | "phone_number" | "avatar_url" | "is_suspended">;

// shortcut: process-local profile cache for single-instance EC2; move to shared store if horizontally scaled.
const profileCache = new Map<string, { profile: CachedProfile | null; expiresAt: number }>();

export function invalidateProfileCache(userId?: string | null) {
  if (userId) profileCache.delete(userId);
  else profileCache.clear();
}

export function resetProfileCache() {
  profileCache.clear();
}

/**
 * Request-scoped user + profile lookup. Always verifies the session with GoTrue
 * `getUser()` so globally revoked sessions are rejected, while caching profile rows
 * briefly across navigations.
 */
const isCrossRequestCacheEnabled = () => !process.env.VITEST;

export const loadProfile = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { user: null, profile: null, authError, profileError: null };

  const cacheEnabled = isCrossRequestCacheEnabled();
  const now = Date.now();
  const cached = cacheEnabled ? profileCache.get(user.id) : undefined;
  if (cached && cached.expiresAt > now) {
    return {
      user,
      profile: cached.profile,
      authError: null,
      profileError: null,
    };
  }
  if (cached) profileCache.delete(user.id);

  const { data, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as unknown as CachedProfile | null;
  if (cacheEnabled && !profileError) {
    if (profileCache.size >= PROFILE_CACHE_LIMIT && !profileCache.has(user.id)) {
      const oldest = profileCache.keys().next().value;
      if (oldest !== undefined) profileCache.delete(oldest);
    }
    profileCache.set(user.id, { profile, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
  }

  return {
    user,
    profile,
    authError,
    profileError,
  };
});
