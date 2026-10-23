import { createClient } from "@/lib/supabase/client";
import { mapSupabaseAuthError } from "@/lib/auth/auth-error";
import { isSafeRedirectUrl } from "@/types/auth";

export type SignInRole = "renter" | "landlord";
export type SignInResult = { success: true } | { success: false; message: string };

export function getPostLoginRedirect(destination: string | null): string {
  return destination && isSafeRedirectUrl(destination) ? destination : "/";
}

export async function signInWithEmail(
  email: string,
  password: string,
  expectedRole: SignInRole,
): Promise<SignInResult> {
  const supabase = createClient();
  let data: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["data"];
  let error: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["error"];
  try {
    ({ data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
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

    if (profile.role !== expectedRole) {
      await supabase.auth.signOut({ scope: "local" });
      return {
        success: false,
        message: "This account does not have the selected role.",
      };
    }

    return { success: true };
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
