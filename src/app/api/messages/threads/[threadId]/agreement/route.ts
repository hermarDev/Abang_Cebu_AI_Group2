import {
  readJson,
  reply,
  requireMessagingUser,
  rpcFailure,
  uuidPattern,
} from "@/server/messaging-api";

type Context = { params: Promise<{ threadId: string }> };
const badThread = () => reply({ error: "Choose a valid conversation." }, 400);

export async function POST(request: Request, context: Context) {
  try {
    const session = await requireMessagingUser(request);
    if (session.response) return session.response;
    const { threadId } = await context.params;
    if (!uuidPattern.test(threadId)) return badThread();

    const { operationId, agree, unitId } = await readJson(request);
    if (typeof operationId !== "string" || !uuidPattern.test(operationId)) {
      return reply({ error: "Invalid request id." }, 400);
    }
    const isAgree = agree !== false;
    const effectiveUnitId = typeof unitId === "string" && uuidPattern.test(unitId) ? unitId : null;

    const { data, error } = await session.supabase.rpc("set_rental_agreement_consent", {
      p_conversation_id: threadId,
      p_operation_id: operationId,
      p_agree: isAgree,
      p_unit_id: effectiveUnitId,
    });

    if (error) {
      return rpcFailure(error.code, { "42501": 403, "22023": 400, "40001": 409 }, error.message);
    }

    return reply({ agreement: data }, 200);
  } catch {
    return rpcFailure(undefined, {});
  }
}
