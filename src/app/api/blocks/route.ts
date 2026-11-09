import { readJson, reply, requireMessagingUser, rpcFailure, uuidPattern } from "@/server/messaging-api";

async function setBlock(request: Request) {
  try {
    const session = await requireMessagingUser(request);
    if (session.response) return session.response;
    const blocking = request.method === "POST";
    const body = await readJson(request);
    const targetUserId = typeof body.targetUserId === "string" || blocking ? body.targetUserId : new URL(request.url).searchParams.get("targetUserId");
    const { reason } = body;
    if (typeof targetUserId !== "string" || !uuidPattern.test(targetUserId)) return reply({ error: "Choose a valid account." }, 400);
    if (reason !== undefined && (typeof reason !== "string" || reason.length > 500)) return reply({ error: "Reason must be 500 characters or fewer." }, 400);

    const { data, error } = await session.supabase.rpc("set_user_block", { p_target_user_id: targetUserId, p_blocked: blocking, p_reason: reason?.trim() || null });
    if (error) return rpcFailure(error.code, { "42501": 403, "22023": 400 });
    return reply({ targetUserId, blocked: Boolean(data?.blocked ?? blocking) }, 200);
  } catch {
    return rpcFailure(undefined, {});
  }
}

export { setBlock as POST, setBlock as DELETE };
