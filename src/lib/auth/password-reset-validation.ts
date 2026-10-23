import { validatePasswordStrength } from "@/types/auth";

export type ResetRequestValidation =
  | { ok: true; email: string }
  | { ok: false; status: 400 | 422; code: "VALIDATION_ERROR" | "CAPTCHA_VERIFICATION_FAILED" };

export function validateResetRequest(payload: unknown): ResetRequestValidation {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, status: 400, code: "VALIDATION_ERROR" };
  }

  const input = payload as Record<string, unknown>;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, status: 422, code: "VALIDATION_ERROR" };
  }
  if (input.turnstileToken !== undefined && typeof input.turnstileToken !== "string") {
    return { ok: false, status: 422, code: "VALIDATION_ERROR" };
  }
  if (typeof input.redirectTo === "string" && input.redirectTo.length > 2048) {
    return { ok: false, status: 422, code: "VALIDATION_ERROR" };
  }

  return { ok: true, email };
}

export type ResetConfirmationValidation =
  | { ok: true; newPassword: string }
  | { ok: false; code: "VALIDATION_ERROR" | "WEAK_PASSWORD" };

export function validateResetConfirmation(payload: unknown): ResetConfirmationValidation {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, code: "VALIDATION_ERROR" };
  }

  const input = payload as Record<string, unknown>;
  if (typeof input.newPassword !== "string" || typeof input.confirmPassword !== "string") {
    return { ok: false, code: "VALIDATION_ERROR" };
  }
  if (input.newPassword !== input.confirmPassword) {
    return { ok: false, code: "VALIDATION_ERROR" };
  }
  if (!validatePasswordStrength(input.newPassword).isValid) {
    return { ok: false, code: "WEAK_PASSWORD" };
  }

  return { ok: true, newPassword: input.newPassword };
}
