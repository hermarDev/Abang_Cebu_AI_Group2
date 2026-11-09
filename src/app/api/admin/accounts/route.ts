import { adminAccountsLimiter, adminRpc, jsonError, jsonOk, pageParams, rateLimited, readJsonObject, requireActiveAdmin, validReason, validUuid } from "@/server/admin-access";

export async function GET(request: Request) {
  const session = await requireActiveAdmin(request);
  if ("response" in session && session.response) return session.response;
  const params = new URL(request.url).searchParams;
  const role = params.get("role");
  const status = params.get("status");
  const page = pageParams(params);
  if (!page || (role !== null && !["renter", "landlord", "admin"].includes(role)) || (status !== null && status !== "active" && status !== "suspended")) {
    return jsonError("Invalid account filter.", 400);
  }
  const { data, error } = await adminRpc(session.supabase, "admin_list_accounts", {
    p_role: role,
    p_suspended: status === "suspended" ? true : status === "active" ? false : null,
    p_search: params.get("search")?.trim() || null,
    p_limit: page.limit,
    p_offset: page.offset,
  });
  if (error) return jsonError("Accounts could not be loaded. Please retry.", 503);
  return jsonOk({ accounts: data });
}

export async function POST(request: Request) {
  const session = await requireActiveAdmin(request);
  if ("response" in session && session.response) return session.response;
  const limited = rateLimited(adminAccountsLimiter, request, session.user.id);
  if (limited) return limited;
  const input = await readJsonObject(request);
  if (!input || !validUuid(input.targetUserId) || !validUuid(input.operationId) || typeof input.suspend !== "boolean") return jsonError("Invalid account request.", 400);
  if (!validReason(input.reason)) return jsonError("Provide a reason of at least 5 characters.", 400);
  const { data, error } = await adminRpc(session.supabase, "admin_set_account_suspension", {
    p_target_user_id: input.targetUserId,
    p_operation_id: input.operationId,
    p_suspend: input.suspend,
    p_reason: input.reason.trim(),
    p_unpublish_listings: input.unpublishListings !== false,
  });
  if (error?.code === "42501") return jsonError("This account cannot be modified.", 403);
  if (error?.code === "23505" || error?.code === "40001") return jsonError("This account changed or the operation was already used. Reload and retry.", 409);
  if (error?.code === "22023") return jsonError("Invalid account request.", 400);
  if (error) return jsonError("The account change could not be confirmed. Reload before retrying.", 503);
  return jsonOk({ account: data });
}
