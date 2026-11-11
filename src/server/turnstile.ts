import { getClientIp } from "./rate-limit";

export type TurnstileVerificationResult = {
  valid: boolean;
  code?: string;
};

/**
 * Server-side verification for Cloudflare Turnstile tokens.
 *
 * If TURNSTILE_SECRET_KEY is not configured in environment variables, verification passes
 * to avoid blocking development, CI, and test environments without Turnstile keys.
 * When TURNSTILE_SECRET_KEY is configured (e.g. production/staging), a valid token is required.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  request: Request,
): Promise<TurnstileVerificationResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return { valid: true };
  }

  if (!token || typeof token !== "string" || !token.trim()) {
    return { valid: false, code: "MISSING_TURNSTILE_TOKEN" };
  }

  try {
    const params = new URLSearchParams({
      secret,
      response: token.trim(),
    });

    const ip = getClientIp(request);
    if (ip && ip !== "development") {
      params.set("remoteip", ip);
    }

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: params,
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return { valid: false, code: "VERIFICATION_NETWORK_ERROR" };
    }

    const data = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data && data.success === true) {
      return { valid: true };
    }

    return {
      valid: false,
      code: Array.isArray(data?.["error-codes"]) && data["error-codes"].length > 0
        ? data["error-codes"][0]
        : "VERIFICATION_REJECTED",
    };
  } catch {
    return { valid: false, code: "VERIFICATION_FAILED" };
  }
}
