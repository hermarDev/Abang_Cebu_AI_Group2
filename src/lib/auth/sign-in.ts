import { createClient } from "@/lib/supabase/client";
import { isRegisterableRole, isSafeRedirectUrl } from "@/types/auth";

export type SignInResult = { success: true; role: "renter" | "landlord" } | { success: false; message: string };

export function getPostLoginRedirect(destination: string | null, role?: "renter" | "landlord"): string {
  if (destination && isSafeRedirectUrl(destination)) {
    const pathname = new URL(destination, "http://localhost").pathname;
    if (role === "landlord" && (pathname === "/" || pathname === "/map")) return "/landlord/dashboard";
    return destination;
  }
  return role === "landlord" ? "/landlord/dashboard" : "/";
}

export async function signInWithEmail(
  email: string,
  password: string,
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
      message: error?.status === 429 || error?.code === "over_request_rate_limit"
        ? "Too many login attempts. Please try again later."
        : error?.code === "invalid_credentials" || error?.code === "invalid_grant"
          ? "Invalid email or password."
          : "Sign in is temporarily unavailable. Please try again.",
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
