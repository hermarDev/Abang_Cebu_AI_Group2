import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PASSWORD_RESET_CALLBACK_PATH } from "@/lib/auth/password-reset";
import { validateResetRequest } from "@/lib/auth/password-reset-validation";
import { getClientIp } from "@/server/rate-limit";
import { verifyTurnstileToken } from "@/server/turnstile";

const genericSuccess = {
  success: true,
  message: "If an account is associated with this email, a password recovery link has been dispatched.",
} as const;

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_ATTEMPT_LIMIT = 3;
const IP_ATTEMPT_LIMIT = 5;
const MAX_TRACKED_KEYS = 10_000;
const attemptsByIp = new Map<string, number[]>();
const attemptsByEmail = new Map<string, number[]>();

function trackAttempt(store: Map<string, number[]>, key: string, limit: number, now: number) {
  const recent = (store.get(key) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= limit) {
    store.set(key, recent);
    return true;
  }

  recent.push(now);
  store.delete(key);
  if (store.size >= MAX_TRACKED_KEYS) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) store.delete(oldestKey);
  }
  store.set(key, recent);
  return false;
}

function hasExceededRateLimit(request: Request, email: string, now: number) {
  // Production IP identity must come from a trusted proxy (Cloudflare or Caddy reverse proxy), never a spoofable client header.
  const clientIp = getClientIp(request);
  if (!clientIp) return true;

  const ipLimited = trackAttempt(attemptsByIp, clientIp, IP_ATTEMPT_LIMIT, now);
  const emailKey = createHash("sha256").update(email).digest("hex");
  const emailLimited = trackAttempt(attemptsByEmail, emailKey, EMAIL_ATTEMPT_LIMIT, now);
  return ipLimited || emailLimited;
}

async function addTimingJitter(startedAt: number) {
  const targetDelayMs = randomInt(200, 400);
  const remainingDelayMs = targetDelayMs - (Date.now() - startedAt);
  if (remainingDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingDelayMs));
  }
}



export async function POST(request: Request) {
  const startedAt = Date.now();
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Enter a valid email address." } },
      { status: 400 },
    );
  }

  const validation = validateResetRequest(payload);
  if (!validation.ok) {
    return NextResponse.json(
      { success: false, error: { code: validation.code, message: "Enter valid password recovery details." } },
      { status: validation.status },
    );
  }

  if (process.env.TURNSTILE_SECRET_KEY) {
    const turnstile = await verifyTurnstileToken(validation.turnstileToken, request);
    if (!turnstile.valid) {
      return NextResponse.json(
        { success: false, error: { code: "CAPTCHA_VERIFICATION_FAILED", message: "Complete the security verification and try again." } },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
  }


  let rateLimited = false;
  try {
    rateLimited = hasExceededRateLimit(request, validation.email, Date.now());
  } catch {
    // Fail closed if local limiter bookkeeping unexpectedly fails.
    rateLimited = true;
  }
  if (rateLimited) {
    return NextResponse.json(
      { success: false, error: { code: "AUTH_PASSWORD_RESET_RATE_LIMIT", message: "Too many recovery requests. Try again later." } },
      { status: 429, headers: { "Retry-After": "900", "Cache-Control": "no-store" } },
    );
  }

  let configuredSite: URL;
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) throw new Error("NEXT_PUBLIC_SITE_URL is required");
    configuredSite = new URL(siteUrl);
    if (configuredSite.username || configuredSite.password || configuredSite.search || configuredSite.hash || configuredSite.pathname !== "/") {
      throw new Error("NEXT_PUBLIC_SITE_URL must be an origin only");
    }
    if (configuredSite.protocol !== "https:" && process.env.NODE_ENV === "production") {
      throw new Error("Production site URL must use HTTPS");
    }
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "AUTH_PASSWORD_RESET_UNAVAILABLE", message: "Password recovery is temporarily unavailable." } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const recoveryUrl = new URL(PASSWORD_RESET_CALLBACK_PATH, configuredSite.origin);
    recoveryUrl.searchParams.set("type", "recovery");
    recoveryUrl.searchParams.set("next", "/reset-password");

    const supabase = await createClient();
    // Suppress provider-specific account existence and failure details.
    await supabase.auth.resetPasswordForEmail(validation.email, { redirectTo: recoveryUrl.toString() });
  } catch {
    // Keep provider failures indistinguishable from successful dispatch.
  }

  await addTimingJitter(startedAt);
  return NextResponse.json(genericSuccess, { status: 200, headers: { "Cache-Control": "no-store" } });
}
