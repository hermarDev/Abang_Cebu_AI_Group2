import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSafeRedirectUrl } from "@/types/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") || "/search";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=invalid_auth_link", url.origin));
  }
  if (type === "recovery" && !isSafeRedirectUrl(next)) {
    return NextResponse.redirect(new URL("/login?error=invalid_recovery_link", url.origin));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const target = type === "recovery" ? "/login?error=expired_recovery_link" : "/login?error=expired_auth_link";
      return NextResponse.redirect(new URL(target, url.origin));
    }
    return NextResponse.redirect(new URL(type === "recovery" ? next : isSafeRedirectUrl(next) ? next : "/search", url.origin));
  } catch {
    const target = type === "recovery" ? "/login?error=expired_recovery_link" : "/login?error=auth_callback_failed";
    return NextResponse.redirect(new URL(target, url.origin));
  }
}
