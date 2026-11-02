"use server";

import { revalidatePath } from "next/cache";
import { normalizeInternationalPhoneNumber } from "@/lib/phone-number";
import { createClient } from "@/lib/supabase/server";
import { validatePasswordStrength } from "@/types/auth";
import { PROFILE_AVATAR_BUCKET, signProfileAvatar } from "@/lib/profile-avatar";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AvatarActionResult = { success: boolean; message: string; avatarUrl?: string | null };

export type AccountActionResult = {
  success: boolean;
  message: string;
  profile?: { fullName: string; phoneNumber: string | null };
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readPassword(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function updateAccountProfile(formData: FormData): Promise<AccountActionResult> {
  const fullName = readText(formData, "fullName").replace(/\s+/g, " ");
  const phoneInput = readText(formData, "phoneNumber");
  const phoneCountry = readText(formData, "phoneCountry");
  const fullNamePattern = /^[\p{L}\p{M} .'-]+$/u;

  if (fullName.length < 2 || fullName.length > 100 || !fullNamePattern.test(fullName)) {
    return { success: false, message: "Enter a name between 2 and 100 characters using letters, spaces, apostrophes, periods, or hyphens." };
  }

  const phoneNumber = phoneInput ? normalizeInternationalPhoneNumber(phoneInput, phoneCountry) : null;
  if (phoneInput && !phoneNumber) {
    return { success: false, message: "Enter a valid phone number for the selected country using digits only." };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, message: "Your session expired. Please sign in again." };

  const { data: currentProfile, error: profileReadError } = await supabase
    .from("profiles")
    .select("full_name, phone_number")
    .eq("id", user.id)
    .maybeSingle();

  if (profileReadError || !currentProfile) return { success: false, message: "We couldn’t load your profile. Please try again." };
  if (currentProfile.full_name === fullName && (currentProfile.phone_number ?? null) === phoneNumber) {
    return { success: true, message: "No changes to save.", profile: { fullName: currentProfile.full_name, phoneNumber: currentProfile.phone_number } };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone_number: phoneNumber })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) return { success: false, message: "We couldn’t save your details. Please try again." };

  revalidatePath("/account");
  return { success: true, message: "Your account details were saved.", profile: { fullName, phoneNumber } };
}
export async function updateAccountAvatar(formData: FormData): Promise<AvatarActionResult> {
  const value = formData.get("avatar");
  if (!(value instanceof File) || value.size === 0) return { success: false, message: "Choose a photo to upload." };
  if (!Object.hasOwn(AVATAR_TYPES, value.type)) return { success: false, message: "Choose a JPG, PNG, or WebP image." };
  if (value.size > MAX_AVATAR_BYTES) return { success: false, message: "This photo could not be prepared for upload. Please try another image." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, message: "Your session expired. Please sign in again." };

  const { data: profile, error: profileReadError } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
  if (profileReadError || !profile) return { success: false, message: "We couldn’t load your profile. Please try again." };

  const extension = AVATAR_TYPES[value.type as keyof typeof AVATAR_TYPES];
  const avatarPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await createAdminClient().storage.from(PROFILE_AVATAR_BUCKET).upload(avatarPath, value, {
    cacheControl: "3600",
    contentType: value.type,
    upsert: false,
  });
  if (uploadError) return { success: false, message: "Profile photos aren’t ready yet. Please try again later." };

  const { data, error } = await supabase.from("profiles").update({ avatar_url: avatarPath }).eq("id", user.id).select("id").maybeSingle();
  if (error || !data) {
    await createAdminClient().storage.from(PROFILE_AVATAR_BUCKET).remove([avatarPath]);
    return { success: false, message: "We couldn’t save your photo. Please try again." };
  }

  const oldPath = profile.avatar_url;
  if (oldPath && oldPath.startsWith(`${user.id}/`) && /^[0-9a-f-]+\/[\w-]+\.(?:jpg|png|webp)$/i.test(oldPath) && oldPath !== avatarPath) {
    await createAdminClient().storage.from(PROFILE_AVATAR_BUCKET).remove([oldPath]);
  }
  const avatarUrl = await signProfileAvatar(user.id, avatarPath);
  revalidatePath("/account");
  revalidatePath("/");
  return { success: true, message: "Your profile photo was updated.", avatarUrl };
}

export async function removeAccountAvatar(): Promise<AvatarActionResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, message: "Your session expired. Please sign in again." };

  const { data: profile, error: profileReadError } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
  if (profileReadError || !profile) return { success: false, message: "We couldn’t load your profile. Please try again." };

  const { data, error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id).select("id").maybeSingle();
  if (error || !data) return { success: false, message: "We couldn’t remove your photo. Please try again." };

  const oldPath = profile.avatar_url;
  if (oldPath && oldPath.startsWith(`${user.id}/`) && /^[0-9a-f-]+\/[\w-]+\.(?:jpg|png|webp)$/i.test(oldPath)) {
    await createAdminClient().storage.from(PROFILE_AVATAR_BUCKET).remove([oldPath]);
  }
  revalidatePath("/account");
  revalidatePath("/");
  return { success: true, message: "Your profile photo was removed.", avatarUrl: null };
}

export async function updateAccountPassword(formData: FormData): Promise<AccountActionResult> {
  const password = readPassword(formData, "password");
  const confirmation = readPassword(formData, "confirmPassword");

  if (!validatePasswordStrength(password).isValid) {
    return { success: false, message: "Use 8–72 characters and include at least 3 of: uppercase, lowercase, number, and symbol." };
  }
  if (password !== confirmation) return { success: false, message: "The new passwords do not match." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, message: "Your session expired. Please sign in again." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { success: false, message: "We couldn’t update your password. Check the password requirements and try again." };

  revalidatePath("/account");
  return { success: true, message: "Your password was updated." };
}
