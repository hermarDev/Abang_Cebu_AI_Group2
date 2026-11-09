import { adminLifecycleLimiter, adminRpc, jsonError, jsonOk, rateLimited, readJsonObject, requireActiveAdmin, validReason, validUuid } from "@/server/admin-access";

export async function POST(request: Request) {
  const session = await requireActiveAdmin(request);
  if ("response" in session && session.response) return session.response;
  const limited = rateLimited(adminLifecycleLimiter, request, session.user.id);
  if (limited) return limited;
  const input = await readJsonObject(request);
  if (!input || !validUuid(input.propertyId) || !validUuid(input.operationId) || (input.action !== "unpublish" && input.action !== "restore")) {
    return jsonError("Invalid property lifecycle request.", 400);
  }
  if (!validReason(input.reason)) return jsonError("Provide a reason of at least 5 characters.", 400);
  const { data, error } = await adminRpc(session.supabase, "admin_set_property_lifecycle", {
    p_property_id: input.propertyId,
    p_operation_id: input.operationId,
    p_action: input.action,
    p_reason: input.reason.trim(),
  });
  if (error?.code === "23505" || error?.code === "40001") return jsonError("This property changed or the operation was already used. Reload and retry.", 409);
  if (error?.code === "42501") return jsonError("This property cannot be changed.", 403);
  if (error?.code === "22023") return jsonError("Invalid property lifecycle request.", 400);
  const result = data as { propertyId?: unknown; status?: unknown } | null;
  if (error || !result || typeof result !== "object") return jsonError("The change could not be confirmed. Reload before retrying.", 503);
  return jsonOk({ propertyId: result.propertyId, status: result.status });
}
