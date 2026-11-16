import { createAdminClient } from "@/lib/supabase/admin";
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

  if (Array.isArray(data)) {
    const missingIds = data
      .filter(
        (row): row is Record<string, unknown> & { id: string } =>
          Boolean(row && typeof row === "object" && validUuid((row as { id?: unknown }).id) && !(row as { ticketNumber?: unknown }).ticketNumber),
      )
      .map((row) => row.id);

    if (missingIds.length > 0) {
      try {
        const admin = createAdminClient();
        const { data: ticketNums } = await admin
          .from("support_tickets")
          .select("id,ticket_number")
          .in("id", missingIds);
        if (Array.isArray(ticketNums) && ticketNums.length > 0) {
          const map = new Map<string, string>();
          for (const item of ticketNums) {
            if (typeof item?.id === "string" && typeof item?.ticket_number === "string" && item.ticket_number) {
              map.set(item.id, item.ticket_number);
            }
          }
          if (map.size > 0) {
            return jsonOk({
              tickets: data.map((row) =>
                row && typeof row === "object" && typeof (row as { id?: unknown }).id === "string" && map.has((row as { id: string }).id)
                  ? { ...(row as Record<string, unknown>), ticketNumber: map.get((row as { id: string }).id) }
                  : row,
              ),
            });
          }
        }
      } catch {
        // Fall through with RPC rows if admin client is unavailable or fails
      }
    }
  }

  return jsonOk({ tickets: data });
}
