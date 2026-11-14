import {
  jsonError,
  jsonOk,
  rateLimited,
  readJsonObject,
  requireActiveSupportOrAdmin,
  supportDeskActionsLimiter,
  supportDeskRpc,
  validReason,
  validUuid,
} from "@/server/support-desk-access";

type Context = { params: Promise<{ ticketId: string }> };

const VALID_ACTIONS = [
  "request_landlord_response",
  "resolve",
  "escalate_to_admin",
] as const;

const VALID_ADMIN_ACTIONS = [
  "suspend_account",
  "unpublish_listing",
  "both",
  "review",
] as const;

export async function GET(request: Request, context: Context) {
  const session = await requireActiveSupportOrAdmin(request);
  if ("response" in session && session.response) return session.response;

  const { ticketId } = await context.params;
  if (!validUuid(ticketId)) return jsonError("Invalid ticket request.", 400);

  const { data, error } = await supportDeskRpc(session.supabase, "support_desk_list_tickets", {
    p_ticket_id: ticketId,
  });

  if (error?.code === "42501") {
    return jsonError("Support workspace access is restricted to active customer support staff and administrators.", 403);
  }
  if (error) {
    return jsonError("The ticket could not be loaded. Please retry.", 503);
  }

  const list = Array.isArray(data) ? data : [];
  if (list.length === 0) {
    return jsonError("Ticket not found.", 404);
  }

  return jsonOk({ ticket: list[0] });
}

export async function POST(request: Request, context: Context) {
  const session = await requireActiveSupportOrAdmin(request);
  if ("response" in session && session.response) return session.response;

  const limited = rateLimited(supportDeskActionsLimiter, request, session.user.id);
  if (limited) return limited;

  const { ticketId } = await context.params;
  const input = await readJsonObject(request);
  if (!input || !validUuid(ticketId)) return jsonError("Invalid ticket request.", 400);

  const operationId = input.operationId;
  const action = input.action;
  const note = input.note;
  const reportedLandlordId = input.reportedLandlordId ?? null;
  const recommendedAdminAction = input.recommendedAdminAction ?? null;

  if (
    !validUuid(operationId) ||
    typeof action !== "string" ||
    !VALID_ACTIONS.includes(action as (typeof VALID_ACTIONS)[number]) ||
    !validReason(note)
  ) {
    return jsonError("Invalid ticket action parameters.", 400);
  }

  if (reportedLandlordId !== null && !validUuid(reportedLandlordId)) {
    return jsonError("Invalid reported landlord ID.", 400);
  }

  if (
    recommendedAdminAction !== null &&
    (typeof recommendedAdminAction !== "string" ||
      !VALID_ADMIN_ACTIONS.includes(recommendedAdminAction as (typeof VALID_ADMIN_ACTIONS)[number]))
  ) {
    return jsonError("Invalid recommended admin action.", 400);
  }

  const { data, error } = await supportDeskRpc(session.supabase, "support_desk_act_on_ticket", {
    p_ticket_id: ticketId,
    p_operation_id: operationId,
    p_action: action,
    p_note: typeof note === "string" ? note.trim() : "",
    p_reported_landlord_id: reportedLandlordId,
    p_recommended_admin_action: recommendedAdminAction,
  });

  if (error?.code === "P0002") {
    return jsonError("Ticket not found.", 404);
  }
  if (error?.code === "42501") {
    return jsonError("Support workspace access is restricted to active customer support staff and administrators.", 403);
  }
  if (error?.code === "23505" || error?.code === "40001") {
    return jsonError("This ticket changed or the operation was already used. Reload and retry.", 409);
  }
  if (error?.code === "22023") {
    return jsonError(error.message || "Invalid ticket action parameters.", 400);
  }
  if (error) {
    return jsonError("The ticket action could not be completed. Reload before retrying.", 503);
  }

  return jsonOk({ result: data });
}
