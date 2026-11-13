import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUuid } from "@/lib/support/validation";
import { mapSupportTicketRow, reply, verifyGuestSupportToken } from "@/server/support-api";

type Context = { params: Promise<{ ticketId: string }> };

export async function GET(request: Request, context: Context) {
  const { ticketId } = await context.params;
  if (!isValidUuid(ticketId)) {
    return reply({ error: "Invalid ticket ID." }, 400);
  }

  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return reply({ error: "Missing ticket access token." }, 401);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return reply({ error: "Support service is temporarily unavailable." }, 503);
  }

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch {
    return reply({ error: "Support service is temporarily unavailable." }, 503);
  }

  const { data: ticket, error } = await adminClient
    .from("support_tickets")
    .select(
      "id,ticket_number,user_id,requester_name,requester_email,requester_role,category,subject,description,related_listing_id,attachments,status,priority,admin_response,resolved_at,created_at,updated_at,guest_access_token_hash",
    )
    .eq("id", ticketId)
    .maybeSingle();

  if (error) {
    return reply({ error: "Could not load support ticket." }, 503);
  }
  if (!ticket) {
    return reply({ error: "Ticket not found." }, 404);
  }

  const expectedHash = (ticket as Record<string, unknown>).guest_access_token_hash as string | null | undefined;
  if (!verifyGuestSupportToken(token, expectedHash)) {
    return reply({ error: "Invalid or expired ticket access link." }, 403);
  }

  const mapped = mapSupportTicketRow(ticket as Record<string, unknown>);
  return reply({ ticket: mapped }, 200);
}
