import {
  jsonError,
  jsonOk,
  pageParams,
  requireActiveSupportOrAdmin,
  supportDeskRpc,
  validUuid,
} from "@/server/support-desk-access";

const VALID_STATUSES = [
  "open",
  "in_progress",
  "awaiting_landlord",
  "escalated",
  "resolved",
  "closed",
  "all",
];

export async function GET(request: Request) {
  const session = await requireActiveSupportOrAdmin(request);
  if ("response" in session && session.response) return session.response;

  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const category = params.get("category");
  const search = params.get("search");
  const ticketId = params.get("ticketId");
  const cursorCreatedAt = params.get("cursorCreatedAt");
  const cursorId = params.get("cursorId");

  const page = pageParams(params);
  if (!page) return jsonError("Invalid ticket filter.", 400);

  if (status !== null && !VALID_STATUSES.includes(status)) {
    return jsonError("Invalid ticket filter.", 400);
  }

  if (ticketId !== null && !validUuid(ticketId)) {
    return jsonError("Invalid ticket filter.", 400);
  }

  if ((cursorCreatedAt === null) !== (cursorId === null)) {
    return jsonError("Invalid ticket filter.", 400);
  }
  if (
    cursorCreatedAt !== null &&
    (Number.isNaN(Date.parse(cursorCreatedAt)) || !validUuid(cursorId))
  ) {
    return jsonError("Invalid ticket filter.", 400);
  }

  const rpcArgs: Record<string, unknown> = {
    p_status: status,
    p_category: category,
    p_search: search,
    p_limit: page.limit,
    p_offset: page.offset,
    p_ticket_id: ticketId,
  };
  if (cursorCreatedAt !== null && cursorId !== null) {
    rpcArgs.p_cursor_created_at = cursorCreatedAt;
    rpcArgs.p_cursor_id = cursorId;
  }

  const { data, error } = await supportDeskRpc(session.supabase, "support_desk_list_tickets", rpcArgs);

  if (error?.code === "42501") {
    return jsonError("Support workspace access is restricted to active customer support staff and administrators.", 403);
  }
  if (error) {
    return jsonError("Tickets could not be loaded. Please retry.", 503);
  }

  return jsonOk({ tickets: data });
}
