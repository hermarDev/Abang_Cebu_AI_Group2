import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PASSWORD_RESET_RECOVERY_COOKIE } from "@/lib/auth/password-reset";
import { PASSWORD_RESET_CONSTANTS } from "@/types/auth";
import { validateResetConfirmation } from "@/lib/auth/password-reset-validation";

function failure(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return failure(400, "VALIDATION_ERROR", "Enter a new password and confirmation.");
  }

  const validation = validateResetConfirmation(payload);
  if (!validation.ok) {
    const weak = validation.code === "WEAK_PASSWORD";
    return failure(weak ? 422 : 400, validation.code, weak ? "Choose a stronger password." : "Enter matching password values.");
  }

  try {
    const cookieStore = await cookies();
    if (cookieStore.get(PASSWORD_RESET_RECOVERY_COOKIE)?.value !== "1") {
      return failure(401, "AUTH_PASSWORD_RESET_TOKEN_INVALID", "Your recovery session is invalid or expired. Request a new link.");
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return failure(401, "AUTH_PASSWORD_RESET_TOKEN_INVALID", "Your recovery session is invalid or expired. Request a new link.");
    }
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return failure(401, "AUTH_PASSWORD_RESET_TOKEN_INVALID", "Your recovery session is invalid or expired. Request a new link.");
    }
    const claimsResult = await supabase.auth.getClaims();
    const claims = claimsResult.data?.claims;
    const claimsError = claimsResult.error;
    const authMethods = claims?.amr;
    const hasRecoveryMethod = Array.isArray(authMethods) && authMethods.some(
      (method) => method && typeof method === "object" && "method" in method && method.method === "recovery",
    );
    if (claimsError || !hasRecoveryMethod) {
      return failure(401, "AUTH_PASSWORD_RESET_TOKEN_INVALID", "Your recovery session is invalid or expired. Request a new link.");
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: validation.newPassword });
    if (updateError) {
      return failure(400, "INTERNAL_AUTH_ERROR", "We could not update your password. Try again.");
    }

    const { error: revokeError } = await supabase.auth.signOut({ scope: "global" });
    if (revokeError) {
      return failure(502, "INTERNAL_AUTH_ERROR", "The password changed, but global session revocation failed. Contact support before continuing.");
    }

    cookieStore.delete(PASSWORD_RESET_RECOVERY_COOKIE);
    return NextResponse.json(
      {
        success: true,
        message: "Password successfully updated. All previous sessions have been invalidated.",
        data: { redirectUrl: PASSWORD_RESET_CONSTANTS.DEFAULT_PASSWORD_RESET_REDIRECT },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return failure(500, "INTERNAL_AUTH_ERROR", "We could not update your password. Try again later.");
  }
}
