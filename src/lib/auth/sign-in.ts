import { createClient } from "@/lib/supabase/client";
import { mapSupabaseAuthError } from "@/lib/auth/auth-error";
import { isRegisterableRole, isSafeRedirectUrl } from "@/types/auth";

export type SignInResult = { success: true; role: "renter" | "landlord" } | { success: false; message: string };

export function getPostLoginRedirect(destination: string | null, role: "renter" | "landlord" = "renter"): string {
  if (destination && isSafeRedirectUrl(destination)) return destination;
  return role === "landlord" ? "/landlord/dashboard" : "/";
}

export async function signInWithEmail(
  email: string,
  password: string,
  captchaToken?: string,
): Promise<SignInResult> {
  const supabase = createClient();
  let data: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["data"];
  let error: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["error"];
  try {
    ({ data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
      ...(captchaToken ? { options: { captchaToken } } : {}),
    }));
  } catch {
    return {
      success: false,
      message: "Sign in is temporarily unavailable. Please try again.",
    };
  }

  if (error || !data.user) {
    return {
      success: false,
      message: mapSupabaseAuthError(error, {
        fallbackMessage: "Invalid email or password.",
        fallbackStatus: 401,
      }).body.error.message,
    };
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_suspended")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      await supabase.auth.signOut({ scope: "local" });
      return {
        success: false,
        message: "We could not verify this account. Please try again.",
      };
    }

    if (profile.is_suspended) {
      await supabase.auth.signOut({ scope: "local" });
      return {
        success: false,
        message: "This account is suspended. Contact support for help.",
      };
    }

    if (!isRegisterableRole(profile.role)) {
      await supabase.auth.signOut({ scope: "local" });
      return {
        success: false,
        message: "We could not verify this account. Please try again.",
      };
    }

    return { success: true, role: profile.role };
  } catch {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Keep backend and local database errors out of user-visible feedback.
    }
    return {
      success: false,
      message: "We could not verify this account. Please try again.",
    };
  }
}
