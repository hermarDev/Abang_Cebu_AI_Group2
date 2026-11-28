import { createRateLimiter } from "@/server/rate-limit";
import {
  callTypedRpc,
  checkRateLimit,
  createRoleGuard,
  jsonError,
  jsonOk,
  noStoreHeaders,
  pageParams,
  readJsonObject,
  uuidPattern,
  validUuid,
} from "@/server/role-access";

export { jsonError, jsonOk, noStoreHeaders, pageParams, readJsonObject, uuidPattern, validUuid as isUuid };

const limiterOptions = { windowMs: 5 * 60_000, maxPerIp: 60, maxPerActor: 60 };
export const verificationLimiter = createRateLimiter(limiterOptions);

export const requireActiveVerifier = createRoleGuard({
  allowedRoles: ["verification_officer", "admin"],
  unauthenticatedMessage: "Sign in with a verification officer or admin account to continue.",
  forbiddenMessage: "Field verification workspace is restricted to active field verification officers and administrators.",
});

export function verifierRpc(
  supabase: unknown,
  fn: string,
  args?: Record<string, unknown>,
) {
  return callTypedRpc(supabase, fn, args);
}

export function rateLimited(limiter: typeof verificationLimiter, request: Request, actor: string) {
  return checkRateLimit(limiter, request, actor, "Too many actions. Please wait before trying again.");
}

export const isValidVerificationStatus = (val: unknown): val is "verified" | "flagged" =>
  typeof val === "string" && ["verified", "flagged"].includes(val);
export const isValidNotes = (val: unknown): val is string =>
  typeof val === "string" && val.trim().length >= 5 && val.trim().length <= 2000;
