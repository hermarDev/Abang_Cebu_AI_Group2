import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSafeRedirectUrl } from "@/types/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  let origin = url.origin;
  if (configuredSite) {
    try {
      origin = new URL(configuredSite).origin;
    } catch {
      // Fall back to request origin only when env URL is malformed.
    }
  }
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") || "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=invalid_auth_link", origin));
  }
  if (type === "recovery" && !isSafeRedirectUrl(next)) {
    return NextResponse.redirect(new URL("/login?error=invalid_recovery_link", origin));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const target = type === "recovery" ? "/login?error=expired_recovery_link" : "/login?error=expired_auth_link";
      return NextResponse.redirect(new URL(target, origin));
    }
    return NextResponse.redirect(new URL(type === "recovery" ? next : isSafeRedirectUrl(next) ? next : "/", origin));
  } catch {
    const target = type === "recovery" ? "/login?error=expired_recovery_link" : "/login?error=auth_callback_failed";
    return NextResponse.redirect(new URL(target, origin));
  }
}
