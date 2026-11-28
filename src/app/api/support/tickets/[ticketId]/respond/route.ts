import { supportRespondLimiter } from "@/server/api-limiters";
import {
  checkRateLimit,
  createRoleGuard,
  noStoreHeaders,
  readJsonObject,
  uuidPattern,
} from "@/server/role-access";

const reply = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { ...noStoreHeaders, ...extra } });

const requireActiveLandlord = createRoleGuard({
  allowedRoles: ["landlord"],
  unauthenticatedMessage: "Sign in with a landlord account to continue.",
  forbiddenMessage: "Landlord complaint response is restricted to active landlords.",
});

type Context = { params: Promise<{ ticketId: string }> };

export async function POST(request: Request, context: Context) {
  const session = await requireActiveLandlord(request);
  if ("response" in session && session.response) return session.response;

  const limited = checkRateLimit(
    supportRespondLimiter,
    request,
    session.user.id,
    "Too many ticket responses. Please wait before trying again.",
  );
  if (limited) return limited;

  const { ticketId } = await context.params;
  if (!uuidPattern.test(ticketId)) {
    return reply({ error: "Invalid ticket ID." }, 400);
  }

  const body = await readJsonObject(request);
  if (!body) {
    return reply({ error: "Invalid request body." }, 400);
  }

  const operationId = String(body.operationId ?? "");
  const responseText = String(body.response ?? "").trim();

  if (!uuidPattern.test(operationId) || responseText.length < 5 || responseText.length > 2000) {
    return reply({ error: "Provide a valid operation ID and a response between 5 and 2,000 characters." }, 400);
  }

  const { data, error } = await session.supabase.rpc("landlord_respond_to_support_ticket", {
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
