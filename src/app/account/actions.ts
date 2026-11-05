"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { normalizePhilippineAccountMobile } from "@/lib/phone-number";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_AVATAR_BUCKET, signProfileAvatar } from "@/lib/profile-avatar";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePasswordStrength } from "@/types/auth";

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
  field?: "currentPassword";
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateAccountProfile(formData: FormData): Promise<AccountActionResult> {
  const fullName = readText(formData, "fullName").replace(/\s+/g, " ");
  const phoneInput = readText(formData, "phoneNumber");
  const fullNamePattern = /^[\p{L}\p{M} .'-]+$/u;

  if (fullName.length < 2 || fullName.length > 100 || !fullNamePattern.test(fullName)) {
    return { success: false, message: "Enter a name between 2 and 100 characters using letters, spaces, apostrophes, periods, or hyphens." };
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
  const phoneNumber = phoneInput === currentProfile.phone_number
    ? currentProfile.phone_number
    : phoneInput ? normalizePhilippineAccountMobile(phoneInput) : null;
  if (phoneInput && !phoneNumber) return { success: false, message: "Enter a Philippine mobile number, such as 0912 345 6789." };
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
  const currentPassword = formData.get("currentPassword");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  if (typeof currentPassword !== "string" || !currentPassword) return { success: false, message: "Enter your current password." };
  if (typeof password !== "string" || !validatePasswordStrength(password).isValid) return { success: false, message: "Use 8–72 characters and at least 3 of: uppercase, lowercase, number and symbol." };
  if (password !== confirmPassword) return { success: false, message: "Passwords do not match." };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { success: false, message: "Password changes are temporarily unavailable. Please try again later." };

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, message: "Your session expired. Please sign in again." };
    if (!user.identities || !user.email) return { success: false, message: "We couldn’t verify your sign-in method. Please try again." };
    if (!user.identities.some((identity) => identity.provider === "email")) return { success: false, message: "This account uses an external sign-in provider. Manage your password with that provider." };

    const verifier = createSupabaseClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
    const { data, error } = await verifier.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (error?.code === "invalid_credentials") return { success: false, field: "currentPassword", message: "We couldn’t verify your current password. Please check it and try again." };
    if (error || data.user?.id !== user.id) return { success: false, message: "Password verification is temporarily unavailable. Please try again later." };
    const { data: { user: currentUser }, error: currentError } = await supabase.auth.getUser();
    if (currentError || currentUser?.id !== user.id) return { success: false, message: "Your session expired. Please sign in again." };
    const { error: updateError } = await supabase.auth.updateUser({ password, current_password: currentPassword });
    if (updateError) return { success: false, message: "We couldn’t update your password. Please try again." };
    return { success: true, message: "Your password was updated." };
  } catch {
    return { success: false, message: "We couldn’t update your password. Please try again." };
  }
}
