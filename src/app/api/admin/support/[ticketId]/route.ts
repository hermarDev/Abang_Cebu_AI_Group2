import {
  adminRpc,
  adminSupportLimiter,
  jsonError,
  jsonOk,
  rateLimited,
  readJsonObject,
  requireActiveAdmin,
  validUuid,
} from "@/server/admin-access";

const VALID_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
const VALID_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

type Context = { params: Promise<{ ticketId: string }> };

export async function POST(request: Request, context: Context) {
  const session = await requireActiveAdmin(request);
  if ("response" in session && session.response) return session.response;

  const limited = rateLimited(adminSupportLimiter, request, session.user.id);
  if (limited) return limited;

  const { ticketId } = await context.params;
  if (!validUuid(ticketId)) {
    return jsonError("Invalid ticket request.", 400);
  }

  const input = await readJsonObject(request);
  if (!input || !validUuid(input.operationId)) {
    return jsonError("Invalid operation ID.", 400);
  }

  if (
    typeof input.status !== "string" ||
    !VALID_STATUSES.includes(input.status as (typeof VALID_STATUSES)[number])
  ) {
    return jsonError("Invalid ticket status.", 400);
  }

  if (
    input.priority !== undefined &&
    input.priority !== null &&
    (typeof input.priority !== "string" ||
      !VALID_PRIORITIES.includes(input.priority as (typeof VALID_PRIORITIES)[number]))
  ) {
    return jsonError("Invalid ticket priority.", 400);
  }

  if (
    input.adminResponse !== undefined &&
    input.adminResponse !== null &&
    (typeof input.adminResponse !== "string" || input.adminResponse.trim().length > 2000)
  ) {
    return jsonError("Admin response must be 2,000 characters or less.", 400);
  }

  if (
    input.reason !== undefined &&
    input.reason !== null &&
    (typeof input.reason !== "string" || input.reason.trim().length > 1000)
  ) {
    return jsonError("Audit reason must be 1,000 characters or less.", 400);
  }

  const { data, error } = await adminRpc(
    session.supabase,
    "admin_update_support_ticket",
    {
      p_ticket_id: ticketId,
      p_operation_id: input.operationId,
      p_status: input.status,
      p_priority: input.priority ?? null,
      p_admin_response:
        typeof input.adminResponse === "string" ? input.adminResponse.trim() : null,
      p_reason: typeof input.reason === "string" ? input.reason.trim() : null,
    },
  );

  if (error?.code === "42501") {
    return jsonError("This ticket cannot be modified.", 403);
  }
  if (error?.code === "23505" || error?.code === "40001") {
    return jsonError(
      "This ticket changed or the operation was already used. Reload and retry.",
      409,
    );
  }
  if (error?.code === "22023") {
    return jsonError("Invalid ticket update request.", 400);
  }
  if (error) {
    return jsonError(
      "The ticket update could not be confirmed. Reload before retrying.",
      503,
    );
  }

  return jsonOk({ ticket: data });
}
