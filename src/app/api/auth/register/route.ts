import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateRegistration } from "@/lib/auth/validation";
import type { RegisterSuccessResponse } from "@/types/auth";

const registrationAccepted: RegisterSuccessResponse = {
  success: true,
  message: "If registration can proceed, check your email for the next steps.",
};



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
