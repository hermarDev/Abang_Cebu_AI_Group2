import { validatePasswordStrength } from "@/types/auth";
import type { RegisterPayload, RegisterableRole } from "@/types/auth";

export type RegistrationValidation =
  | { ok: true; value: RegisterPayload }
  | { ok: false; errors: Partial<Record<keyof RegisterPayload, string>> };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[\p{L}\p{M} .'-]+$/u;
const landmarkPattern = /^[\p{L}\p{M}\p{N} .,'#()/-]+$/u;

export function normalizePhilippineMobile(value: string): string | null {
  const digits = value.replace(/[\s()-]/g, "");
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  if (/^\+639\d{9}$/.test(digits)) return digits;
  return null;
}

export function validateRegistration(payload: unknown): RegistrationValidation {
  const input = typeof payload === "object" && payload !== null && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
  const errors: Partial<Record<keyof RegisterPayload, string>> = {};
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const fullName = typeof input.fullName === "string" ? input.fullName.trim().replace(/\s+/g, " ") : "";
  const password = typeof input.password === "string" ? input.password : "";
  const role = input.role;
  if (typeof role !== "string" || !["renter", "landlord"].includes(role)) errors.role = "Choose renter or landlord.";
  if (email.length > 254 || !emailPattern.test(email)) errors.email = "Enter a valid email address.";
  if (!validatePasswordStrength(password).isValid) errors.password = "Use 8–72 characters with at least 3 of: uppercase, lowercase, number, symbol.";
  if (fullName.length < 2 || fullName.length > 100 || !namePattern.test(fullName)) errors.fullName = "Enter a name of 2–100 letters, spaces, hyphens, or periods.";

  let phoneNumber: string | undefined;
  if (input.phoneNumber !== undefined && input.phoneNumber !== "") {
    if (typeof input.phoneNumber !== "string") errors.phoneNumber = "Enter a valid Philippine mobile number.";
    else {
      const normalized = normalizePhilippineMobile(input.phoneNumber);
      if (normalized) phoneNumber = normalized;
      else errors.phoneNumber = "Enter a valid Philippine mobile number.";
    }
  }
  let preferredLandmark: string | undefined;
  if (input.preferredLandmark !== undefined && input.preferredLandmark !== "") {
    if (typeof input.preferredLandmark !== "string") errors.preferredLandmark = "Enter a valid landmark.";
    else {
      preferredLandmark = input.preferredLandmark.trim();
      if (preferredLandmark.length < 1 || preferredLandmark.length > 100 || !landmarkPattern.test(preferredLandmark)) errors.preferredLandmark = "Landmark must be 1–100 valid characters.";
    }
  }
  if (input.turnstileToken !== undefined && typeof input.turnstileToken !== "string") errors.turnstileToken = "Invalid verification token.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { email, password, role: role as RegisterableRole, fullName, ...(phoneNumber ? { phoneNumber } : {}), ...(preferredLandmark ? { preferredLandmark } : {}), ...(typeof input.turnstileToken === "string" ? { turnstileToken: input.turnstileToken } : {}) } };
}
