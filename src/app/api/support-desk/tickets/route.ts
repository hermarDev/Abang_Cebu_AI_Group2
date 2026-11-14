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

  const page = pageParams(params);
  if (!page) return jsonError("Invalid ticket filter.", 400);

  if (status !== null && !VALID_STATUSES.includes(status)) {
    return jsonError("Invalid ticket filter.", 400);
  }

  if (ticketId !== null && !validUuid(ticketId)) {
    return jsonError("Invalid ticket filter.", 400);
  }

  const { data, error } = await supportDeskRpc(session.supabase, "support_desk_list_tickets", {
    p_status: status,
    p_category: category,
    p_search: search,
    p_limit: page.limit,
    p_offset: page.offset,
    p_ticket_id: ticketId,
  });

  if (error?.code === "42501") {
    return jsonError("Support workspace access is restricted to active customer support staff and administrators.", 403);
  }
  if (error) {
    return jsonError("Tickets could not be loaded. Please retry.", 503);
  }

  return jsonOk({ tickets: data });
}
