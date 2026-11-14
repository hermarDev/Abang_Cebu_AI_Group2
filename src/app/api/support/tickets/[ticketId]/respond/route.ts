import { createClient } from "@/lib/supabase/server";
import { uuidPattern } from "@/server/support-desk-access";

const noStoreHeaders = { "Cache-Control": "no-store" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: noStoreHeaders });

type Context = { params: Promise<{ ticketId: string }> };

export async function POST(request: Request, context: Context) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return reply({ error: "Sign in with a landlord account to continue." }, 401);
  }

  const expectedUserId = request.headers.get("x-expected-user-id");
  if (expectedUserId && expectedUserId !== user.id) {
    return reply({ error: "Your account changed. Please refresh and try again." }, 409);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "landlord" || profile?.is_suspended) {
    return reply({ error: "Landlord complaint response is restricted to active landlords." }, 403);
  }

  const { ticketId } = await context.params;
  if (!uuidPattern.test(ticketId)) {
    return reply({ error: "Invalid ticket ID." }, 400);
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return reply({ error: "Invalid request body." }, 400);
  }

  const operationId = String(body.operationId ?? "");
  const responseText = String(body.response ?? "").trim();

  if (!uuidPattern.test(operationId) || responseText.length < 5 || responseText.length > 2000) {
    return reply({ error: "Provide a valid operation ID and a response between 5 and 2,000 characters." }, 400);
  }

  const { data, error } = await supabase.rpc("landlord_respond_to_support_ticket", {
    p_ticket_id: ticketId,
    p_operation_id: operationId,
    p_response: responseText,
  });

  if (error?.code === "42501") {
    return reply({ error: "Not authorized to respond to this ticket." }, 403);
  }
  if (error?.code === "P0002") {
    return reply({ error: "Ticket not found." }, 404);
  }
  if (error?.code === "23505" || error?.code === "40001") {
    return reply({ error: "This response was already recorded or the operation was used." }, 409);
  }
  if (error?.code === "22023") {
    return reply({ error: error.message || "Invalid ticket response parameters." }, 400);
  }
  if (error) {
    return reply({ error: "Could not submit response. Please try again." }, 503);
  }

  return reply({ result: data }, 200);
}
