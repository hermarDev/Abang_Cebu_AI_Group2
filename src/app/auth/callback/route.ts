import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSafeRedirectUrl } from "@/types/auth";
import { getSiteOrigin } from "@/server/site-origin";
import { PASSWORD_RESET_FORM_PATH, PASSWORD_RESET_RECOVERY_COOKIE } from "@/lib/auth/password-reset";

export async function GET(request: Request) {
  const url = new URL(request.url);
  let origin: string;
  try {
    origin = getSiteOrigin();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "AUTH_CALLBACK_UNAVAILABLE", message: "Authentication is temporarily unavailable." } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const redirect = (target: string) => {
    const response = NextResponse.redirect(new URL(target, origin));
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") || (type === "recovery" ? PASSWORD_RESET_FORM_PATH : "/");

  if (!code) {
    return redirect("/login?error=invalid_auth_link");
  }
  if (type === "recovery" && (!isSafeRedirectUrl(next) || next !== PASSWORD_RESET_FORM_PATH)) {
    return redirect("/login?error=invalid_recovery_link");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const target = type === "recovery" ? "/login?error=expired_recovery_link" : "/login?error=expired_auth_link";
      return redirect(target);
    }
    const response = redirect(type === "recovery" ? next : isSafeRedirectUrl(next) ? next : "/");
    if (type === "recovery") {
      response.cookies.set(PASSWORD_RESET_RECOVERY_COOKIE, "1", {
        httpOnly: true, secure: new URL(origin).protocol === "https:", sameSite: "lax", path: "/", maxAge: 10 * 60,
      });
    }
    return response;
  } catch {
    const target = type === "recovery" ? "/login?error=expired_recovery_link" : "/login?error=auth_callback_failed";
    return redirect(target);
  }
}
