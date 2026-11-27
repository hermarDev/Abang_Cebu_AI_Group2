import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const PROFILE_AVATAR_BUCKET = "profile-avatars";
const PROFILE_AVATAR_URL_TTL = 60 * 60 * 24 * 7;
const AVATAR_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const AVATAR_CACHE_LIMIT = 2_000;

// shortcut: process-local signed avatar cache; move to shared store if scaled beyond one instance.
const avatarUrlCache = new Map<string, { url: string; expiresAt: number }>();

export function invalidateProfileAvatarCache(avatarReference: string | null | undefined) {
  if (avatarReference) avatarUrlCache.delete(avatarReference);
}

export function resetProfileAvatarCache() {
  avatarUrlCache.clear();
}

export async function signProfileAvatar(userId: string, avatarReference: string | null | undefined): Promise<string | null> {
  if (!avatarReference) return null;
  if (/^https:\/\//i.test(avatarReference)) return avatarReference;
  if (!avatarReference.startsWith(`${userId}/`) || !/^[0-9a-f-]+\/[\w-]+\.(?:jpg|png|webp)$/i.test(avatarReference)) return null;

  const cacheEnabled = !process.env.VITEST;
  const now = Date.now();
  const cached = cacheEnabled ? avatarUrlCache.get(avatarReference) : undefined;
  if (cached && cached.expiresAt > now) return cached.url;
  if (cached) avatarUrlCache.delete(avatarReference);

  try {
    const { data, error } = await createAdminClient().storage.from(PROFILE_AVATAR_BUCKET).createSignedUrl(avatarReference, PROFILE_AVATAR_URL_TTL);
    if (error || !data?.signedUrl) return null;
    if (cacheEnabled) {
      if (avatarUrlCache.size >= AVATAR_CACHE_LIMIT && !avatarUrlCache.has(avatarReference)) {
        const oldest = avatarUrlCache.keys().next().value;
        if (oldest !== undefined) avatarUrlCache.delete(oldest);
      }
      avatarUrlCache.set(avatarReference, { url: data.signedUrl, expiresAt: Date.now() + AVATAR_CACHE_TTL_MS });
    }
    return data.signedUrl;
  } catch {
    return null;
  }
}
