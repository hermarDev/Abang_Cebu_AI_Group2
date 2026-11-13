import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { PASSWORD_RESET_FORM_PATH, PASSWORD_RESET_RECOVERY_COOKIE } from "@/lib/auth/password-reset";
import { isSafeRedirectUrl } from "@/types/auth";
import { getSiteOrigin } from "@/server/site-origin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") || PASSWORD_RESET_FORM_PATH;

  let origin: string;
  try {
    origin = getSiteOrigin();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "AUTH_PASSWORD_RESET_UNAVAILABLE", message: "Password recovery is temporarily unavailable." } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const errorRedirect = (reason: "invalid_recovery_link" | "expired_recovery_link") => {
    const failed = NextResponse.redirect(new URL(`/login?error=${reason}`, origin));
    failed.cookies.delete(PASSWORD_RESET_RECOVERY_COOKIE);
    failed.headers.set("Cache-Control", "no-store");
    failed.headers.set("Referrer-Policy", "no-referrer");
    return failed;
  };
  if (!code || type !== "recovery" || !isSafeRedirectUrl(next) || next !== PASSWORD_RESET_FORM_PATH) {
    return errorRedirect("invalid_recovery_link");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (process.env.NODE_ENV === "production" && (!supabaseUrl || supabaseUrl.includes("placeholder.supabase.co") || !supabaseKey || supabaseKey === "placeholder-anon-key")) {
    return NextResponse.json(
      { success: false, error: { code: "AUTH_PASSWORD_RESET_UNAVAILABLE", message: "Password recovery is temporarily unavailable." } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(new URL(next, origin));
  const cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];
  const supabase = createServerClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseKey || "placeholder-anon-key",
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
    return errorRedirect("expired_recovery_link");
  }
  if (error || !data.user) {
    return errorRedirect("expired_recovery_link");
  }

  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options);
  }
  response.cookies.set(PASSWORD_RESET_RECOVERY_COOKIE, "1", {
    httpOnly: true,
    secure: new URL(origin).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
