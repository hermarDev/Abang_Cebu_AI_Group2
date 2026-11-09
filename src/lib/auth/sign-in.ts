import { createClient } from "@/lib/supabase/client";
import { isSafeRedirectUrl } from "@/types/auth";
import type { UserRole } from "@/types/database";

export type SignInResult = { success: true; role: UserRole } | { success: false; message: string };

export function isAllowedSessionRole(role: unknown): role is UserRole {
  return role === "renter" || role === "landlord" || role === "admin";
}

export function getPostLoginRedirect(destination: string | null, role?: UserRole): string {
  if (destination && isSafeRedirectUrl(destination)) {
    const pathname = new URL(destination, "http://localhost").pathname;
    if (role === "admin" && (pathname === "/" || pathname === "/map" || pathname.startsWith("/landlord"))) return "/admin/dashboard";
    if (role === "landlord" && (pathname === "/" || pathname === "/map" || pathname.startsWith("/admin"))) return "/landlord/dashboard";
    if (role === "renter" && (pathname.startsWith("/landlord") || pathname.startsWith("/admin"))) return "/";
    return destination;
  }
  if (role === "admin") return "/admin/dashboard";
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
        : error?.code === "email_not_confirmed"
          ? "Your email address is not yet verified."
        : error?.code === "invalid_credentials" || error?.code === "invalid_grant" || (!error?.code && error?.status === 400)
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

    if (!isAllowedSessionRole(profile.role)) {
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
