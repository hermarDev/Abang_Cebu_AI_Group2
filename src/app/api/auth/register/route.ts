import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateRegistration } from "@/lib/auth/validation";
import type { RegisterSuccessResponse } from "@/types/auth";

const registrationAccepted: RegisterSuccessResponse = {
  success: true,
  message: "If registration can proceed, check your email for the next steps.",
};

async function verifyTurnstile(token: string | undefined, request: Request) {
  if (process.env.NODE_ENV !== "production") return true;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!token || !secret) return false;
  try {
    const params = new URLSearchParams({ secret, response: token });
    const ip = request.headers.get("cf-connecting-ip");
    if (ip) params.set("remoteip", ip);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: params, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return false;
    const result: unknown = await response.json();
    return typeof result === "object" && result !== null && "success" in result && result.success === true;
  } catch {
    return false;
  }
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
  if (!(await verifyTurnstile(validation.value.turnstileToken, request))) return NextResponse.json({ success: false, error: { code: "CAPTCHA_VERIFICATION_FAILED", message: "Complete the security verification and try again." } }, { status: 403 });

  const { email, password, role, fullName, phoneNumber, preferredLandmark } = validation.value;
  try {
    const supabase = await createClient();
    const origin = new URL(request.url).origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Both roles return to discovery until protected onboarding routes exist.
        emailRedirectTo: `${origin}/auth/callback?next=/`,
        data: { role, full_name: fullName, ...(phoneNumber ? { phone_number: phoneNumber } : {}), ...(preferredLandmark ? { preferred_landmark: preferredLandmark } : {}) },
      },
    });
    if (error || !data.user) {
      const mapped = mapSupabaseAuthError(error, {
        fallbackMessage: "We could not create your account. Check your details and try again.",
      });
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
