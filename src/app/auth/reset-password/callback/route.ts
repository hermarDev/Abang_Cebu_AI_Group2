import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { PASSWORD_RESET_FORM_PATH, PASSWORD_RESET_RECOVERY_COOKIE } from "@/lib/auth/password-reset";
import { isSafeRedirectUrl } from "@/types/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") || PASSWORD_RESET_FORM_PATH;

  if (!code || type !== "recovery" || !isSafeRedirectUrl(next) || next !== PASSWORD_RESET_FORM_PATH) {
    return NextResponse.redirect(new URL("/login?error=invalid_recovery_link", url.origin));
  }

  const canonicalSite = process.env.NEXT_PUBLIC_SITE_URL;
  if (!canonicalSite) {
    return NextResponse.json(
      { success: false, error: { code: "AUTH_PASSWORD_RESET_UNAVAILABLE", message: "Password recovery is temporarily unavailable." } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  let origin: string;
  try {
    const parsed = new URL(canonicalSite);
    if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) throw new Error("Invalid canonical site origin");
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") throw new Error("Recovery origin must use HTTPS");
    origin = parsed.origin;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "AUTH_PASSWORD_RESET_UNAVAILABLE", message: "Password recovery is temporarily unavailable." } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(new URL(next, origin));
  const cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToWrite) => {
          cookiesToSet.push(...cookiesToWrite);
        },
      },
    },
  );

  let data: Awaited<ReturnType<typeof supabase.auth.exchangeCodeForSession>>["data"];
  let error: Awaited<ReturnType<typeof supabase.auth.exchangeCodeForSession>>["error"];
  try {
    ({ data, error } = await supabase.auth.exchangeCodeForSession(code));
  } catch {
    const failed = NextResponse.redirect(new URL("/login?error=expired_recovery_link", url.origin));
    failed.cookies.delete(PASSWORD_RESET_RECOVERY_COOKIE);
    failed.headers.set("Cache-Control", "no-store");
    failed.headers.set("Referrer-Policy", "no-referrer");
    return failed;
  }
  if (error || !data.user) {
    const failed = NextResponse.redirect(new URL("/login?error=expired_recovery_link", url.origin));
    failed.cookies.delete(PASSWORD_RESET_RECOVERY_COOKIE);
    return failed;
  }

  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options);
  }
  response.cookies.set(PASSWORD_RESET_RECOVERY_COOKIE, "1", {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
