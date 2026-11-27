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
  validReason,
  validUuid,
} from "@/server/role-access";

export { jsonError, jsonOk, noStoreHeaders, pageParams, readJsonObject, uuidPattern, validReason, validUuid };

const limiterOptions = { windowMs: 5 * 60_000, maxPerIp: 60, maxPerActor: 60 };
export const adminLifecycleLimiter = createRateLimiter(limiterOptions);
export const adminAccountsLimiter = createRateLimiter(limiterOptions);
export const adminReportsLimiter = createRateLimiter(limiterOptions);
export const adminSupportLimiter = createRateLimiter(limiterOptions);

export const requireActiveAdmin = createRoleGuard({
  allowedRoles: ["admin"],
  unauthenticatedMessage: "Sign in with an admin account to continue.",
  forbiddenMessage: "Admin workspace access is restricted to active administrators.",
});

export type KnownAdminRpc =
  | "admin_list_properties"
  | "admin_update_property_location"
  | "admin_set_property_lifecycle"
  | "admin_list_accounts"
  | "admin_set_account_suspension"
  | "admin_dashboard_overview"
  | "admin_list_audit_logs"
  | "admin_list_abuse_reports"
  | "admin_get_abuse_report_detail"
  | "admin_resolve_abuse_report"
  | "admin_list_support_tickets"
  | "admin_update_support_ticket"
  | "review_property";

export function adminRpc(
  supabase: unknown,
  fn: KnownAdminRpc | (string & {}),
  args?: Record<string, unknown>,
) {
  return callTypedRpc(supabase, fn, args);
}

export function rateLimited(limiter: typeof adminLifecycleLimiter, request: Request, actor: string) {
  return checkRateLimit(limiter, request, actor, "Too many admin actions. Please wait before trying again.");
}
