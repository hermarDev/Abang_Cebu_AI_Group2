import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateRegistration } from "@/lib/auth/validation";
import type { RegisterSuccessResponse } from "@/types/auth";

const registrationAccepted: RegisterSuccessResponse = {
  success: true,
  message: "If registration can proceed, check your email for the next steps.",
};
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_KEYS = 10_000;
// shortcut: process-local limits do not protect other instances or direct provider requests; use shared enforcement for multi-instance deployments.
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

function hasExceededRateLimit(request: Request, email: string) {
  const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || (
    process.env.NODE_ENV !== "production"
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "development"
      : undefined
  );
  if (!clientIp) return true;
  const now = Date.now();
  const ipLimited = trackAttempt(attemptsByIp, clientIp, 5, now);
  const emailKey = createHash("sha256").update(email).digest("hex");
  const emailLimited = trackAttempt(attemptsByEmail, emailKey, 3, now);
  return ipLimited || emailLimited;
}

import { mapSupabaseAuthError } from "@/lib/auth/auth-error";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Enter valid registration details." } }, { status: 400 });
  }
  const validation = validateRegistration(payload);
  if (!validation.ok) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "The submitted registration data is invalid.", details: validation.errors } }, { status: 422 });

  const { email, password, role, fullName, phoneNumber, preferredLandmark } = validation.value;
  let rateLimited = true;
  try {
    rateLimited = hasExceededRateLimit(request, email);
  } catch {
    // Fail closed if local limiter bookkeeping fails.
  }
  if (rateLimited) {
    return NextResponse.json(
      { success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many registration requests. Please try again later." } },
      { status: 429, headers: { "Retry-After": "900", "Cache-Control": "no-store" } },
    );
  }
  try {
    const supabase = await createClient();
    const origin = new URL(request.url).origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/`,
        data: { role, full_name: fullName, ...(phoneNumber ? { phone_number: phoneNumber } : {}), ...(preferredLandmark ? { preferred_landmark: preferredLandmark } : {}) },
      },
    });
    if (error || !data.user) {
      const mapped = mapSupabaseAuthError(error, {
        fallbackMessage: "We could not create your account. Check your details and try again.",
      });
      if (mapped.body.error.code === "RATE_LIMIT_EXCEEDED") {
        mapped.body.error.message = "Too many confirmation emails requested. Please try again later.";
      }
      if (mapped.body.error.code === "EMAIL_ALREADY_REGISTERED") {
        return NextResponse.json(registrationAccepted, { status: 201 });
      }
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    return NextResponse.json(registrationAccepted, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: { code: "REGISTRATION_FAILED", message: "We could not create your account. Try again later." } }, { status: 500 });
  }
}
