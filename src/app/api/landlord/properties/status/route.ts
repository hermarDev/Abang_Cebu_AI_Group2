import { createRoleGuard } from "@/server/role-access";

const headers = { "Cache-Control": "no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (error: string, status: number) => Response.json({ error }, { status, headers });

const access = createRoleGuard({
  allowedRoles: ["landlord"],
  unauthenticatedMessage: "Sign in required.",
  forbiddenMessage: "Landlord account required.",
});

export async function GET(request: Request) {
  const session = await access(request);
  if ("response" in session && session.response) return session.response;
  const operationId = new URL(request.url).searchParams.get("operationId");
  if (operationId !== null && !uuid.test(operationId)) return reply("Invalid operation id.", 400);
  const { data, error } = await session.supabase.rpc("landlord_property_status", { p_operation_id: operationId });
  if (error) return reply("Status could not be loaded. Please retry.", 503);
  return Response.json(data ?? {}, { headers });
}
