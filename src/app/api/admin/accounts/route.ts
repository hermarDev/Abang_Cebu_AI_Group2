import { createAdminClient } from "@/lib/supabase/admin";
import {
  adminAccountsLimiter,
  adminRpc,
  jsonError,
  jsonOk,
  pageParams,
  rateLimited,
  readJsonObject,
  requireActiveAdmin,
  validReason,
  validUuid,
} from "@/server/admin-access";

const allowedRoles = ["renter", "landlord", "admin", "verification_officer", "customer_support"];
const staffRoles = ["verification_officer", "customer_support"];
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  const session = await requireActiveAdmin(request);
  if ("response" in session && session.response) return session.response;
  const params = new URL(request.url).searchParams;
  const role = params.get("role");
  const status = params.get("status");
  const page = pageParams(params);
  if (!page || (role !== null && !allowedRoles.includes(role)) || (status !== null && status !== "active" && status !== "suspended")) {
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
  if (!input) return jsonError("Invalid account request.", 400);

  // Handle Create Staff Account action
  if (input.action === "create_staff") {
    const { operationId, role, fullName, email, password } = input;
    if (
      !validUuid(operationId) ||
      typeof role !== "string" ||
      !staffRoles.includes(role) ||
      typeof fullName !== "string" ||
      fullName.trim().length < 2 ||
      fullName.trim().length > 100 ||
      typeof email !== "string" ||
      !emailRegex.test(email) ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return jsonError("Invalid staff account parameters.", 400);
    }

    const admin = createAdminClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim(), role },
    });

    if (createError || !created?.user) {
      return jsonError(createError?.message || "Failed to create user in auth system.", 400);
    }

    const { data: rpcData, error: rpcError } = await adminRpc(session.supabase, "admin_assign_staff_role", {
      p_target_user_id: created.user.id,
      p_operation_id: operationId,
      p_role: role,
      p_full_name: fullName.trim(),
    });

    if (rpcError?.code === "42501") return jsonError("Admin permissions required.", 403);
    if (rpcError?.code === "23505") return jsonError("Operation conflict. Reload and retry.", 409);
    if (rpcError?.code === "22023") return jsonError("Invalid staff assignment data.", 400);
    if (rpcError) return jsonError("Staff account could not be assigned role. Please retry.", 503);

    return jsonOk({
      success: true,
      user: {
        id: created.user.id,
        email: email.trim(),
        fullName: fullName.trim(),
        role,
      },
      account: rpcData,
    });
  }

  // Handle Account Suspension
  if (!validUuid(input.targetUserId) || !validUuid(input.operationId) || typeof input.suspend !== "boolean") {
    return jsonError("Invalid account request.", 400);
  }
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
