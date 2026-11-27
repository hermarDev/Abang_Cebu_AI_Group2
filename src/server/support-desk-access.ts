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
export const supportDeskActionsLimiter = createRateLimiter(limiterOptions);

export const requireActiveSupportOrAdmin = createRoleGuard({
  allowedRoles: ["customer_support", "admin"],
  unauthenticatedMessage: "Sign in with a customer support or admin account to continue.",
  forbiddenMessage: "Support workspace access is restricted to active customer support staff and administrators.",
});

export type KnownSupportDeskRpc =
  | "support_desk_list_tickets"
  | "support_desk_act_on_ticket";

export function supportDeskRpc(
  supabase: unknown,
  fn: KnownSupportDeskRpc | (string & {}),
  args?: Record<string, unknown>,
) {
  return callTypedRpc(supabase, fn, args);
}

export function rateLimited(limiter: typeof supportDeskActionsLimiter, request: Request, actor: string) {
  return checkRateLimit(limiter, request, actor, "Too many support desk actions. Please wait before trying again.");
}
