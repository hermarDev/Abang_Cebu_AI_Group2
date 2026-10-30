import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const PROFILE_AVATAR_BUCKET = "profile-avatars";
const PROFILE_AVATAR_URL_TTL = 60 * 60 * 24 * 7;

export async function signProfileAvatar(userId: string, avatarReference: string | null | undefined): Promise<string | null> {
  if (!avatarReference) return null;
  if (/^https:\/\//i.test(avatarReference)) return avatarReference;
  if (!avatarReference.startsWith(`${userId}/`) || !/^[0-9a-f-]+\/[\w-]+\.(?:jpg|png|webp)$/i.test(avatarReference)) return null;

  const { data, error } = await createAdminClient().storage.from(PROFILE_AVATAR_BUCKET).createSignedUrl(avatarReference, PROFILE_AVATAR_URL_TTL);
  return error ? null : data.signedUrl;
}