import { cache } from "react";
import type { JWK, User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";
import { createClient } from "./server";

/** Profile columns shared by every page that loads the signed-in user. */
const PROFILE_COLUMNS = "id, role, full_name, phone_number, avatar_url, is_suspended";
const JWKS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const PROFILE_CACHE_TTL_MS = 30 * 1000;
const PROFILE_CACHE_LIMIT = 2_000;

type CachedProfile = Pick<Profile, "id" | "role" | "full_name" | "phone_number" | "avatar_url" | "is_suspended">;

// shortcut: process-local auth/profile caches for single-instance EC2; move to shared store if horizontally scaled.
let jwksCache: { keys: JWK[]; expiresAt: number } | null = null;
let jwksInFlight: Promise<{ keys: JWK[] } | undefined> | null = null;
const profileCache = new Map<string, { profile: CachedProfile | null; expiresAt: number }>();

export function invalidateProfileCache(userId?: string | null) {
  if (userId) profileCache.delete(userId);
  else profileCache.clear();
}

export function resetProfileCache() {
  profileCache.clear();
  jwksCache = null;
  jwksInFlight = null;
}

async function getCachedJwks(): Promise<{ keys: JWK[] } | undefined> {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!envUrl || !/^https?:\/\//i.test(envUrl) || envUrl.includes("placeholder.supabase.co") || envUrl.includes("127.0.0.1:9")) {
    return undefined;
  }
  const now = Date.now();
  if (jwksCache && jwksCache.expiresAt > now) {
    return { keys: jwksCache.keys };
  }
  if (jwksInFlight) return jwksInFlight;

  jwksInFlight = (async () => {
    try {
      const response = await fetch(`${envUrl.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`, {
        signal: AbortSignal.timeout(3_000),
      });
      if (!response.ok) return undefined;
      const body = (await response.json().catch(() => null)) as { keys?: unknown } | null;
      if (!body || !Array.isArray(body.keys) || body.keys.length === 0) return undefined;
      const keys = body.keys as JWK[];
      jwksCache = { keys, expiresAt: Date.now() + JWKS_CACHE_TTL_MS };
      return { keys };
    } catch {
      return undefined;
    } finally {
      jwksInFlight = null;
    }
  })();

  return jwksInFlight;
}

function userFromClaims(claims: Record<string, unknown>): User {
  return {
    id: String(claims.sub),
    email: typeof claims.email === "string" ? claims.email : undefined,
    user_metadata: (claims.user_metadata && typeof claims.user_metadata === "object" ? claims.user_metadata : {}) as Record<string, unknown>,
    app_metadata: (claims.app_metadata && typeof claims.app_metadata === "object" ? claims.app_metadata : {}) as Record<string, unknown>,
    aud: typeof claims.aud === "string" ? claims.aud : "authenticated",
    role: typeof claims.role === "string" ? claims.role : undefined,
    created_at: "",
  } as User;
}

async function resolveVerifiedUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  if (typeof supabase.auth.getClaims === "function") {
    const jwks = await getCachedJwks();
    const { data, error } = await supabase.auth.getClaims(undefined, jwks ? { jwks } : undefined);
    if (!error) {
      const claims = data?.claims as Record<string, unknown> | undefined;
      if (!claims) return { user: null, authError: null };
      if (typeof claims.sub === "string" && claims.sub) {
        return { user: userFromClaims(claims), authError: null };
      }
    } else if (jwks) {
      // Clear cached JWKS on verification failure in case signing keys rotated, then confirm via GoTrue.
      jwksCache = null;
    }
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  return { user, authError };
}

/**
 * Request-scoped user + profile lookup. Verifies JWT locally via ES256 JWKS
 * when available (falling back to GoTrue getUser) and caches profile rows
 * briefly across navigations so routes avoid repeating WAN roundtrips.
 */
const isCrossRequestCacheEnabled = () => !process.env.VITEST;

export const loadProfile = cache(async () => {
  const supabase = await createClient();
  const { user, authError } = await resolveVerifiedUser(supabase);
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
