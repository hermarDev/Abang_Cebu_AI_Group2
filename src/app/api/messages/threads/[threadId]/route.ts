import { createRateLimiter } from "@/server/rate-limit";
import { enrichMessagesWithSignedAttachments, enrichThreads, invalidMessage, limited, readJson, reply, requireMessagingUser, rpcFailure, uuidPattern, validMessagePayload } from "@/server/messaging-api";

const messageLimiter = createRateLimiter({ windowMs: 5 * 60_000, maxPerIp: 30, maxPerActor: 30 });
type Context = { params: Promise<{ threadId: string }> };
const badThread = () => reply({ error: "Choose a valid conversation." }, 400);

export async function GET(request: Request, context: Context) {
  try {
    const session = await requireMessagingUser(request);
    if (session.response) return session.response;
    const { threadId } = await context.params;
    if (!uuidPattern.test(threadId)) return badThread();

    const params = new URL(request.url).searchParams;
    const before = params.get("before");
    if (before !== null && Number.isNaN(Date.parse(before))) return reply({ error: "Invalid page cursor." }, 400);
    const rawLimit = params.get("limit");
    const limit = rawLimit === null ? 50 : Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) return reply({ error: "Limit must be between 1 and 100." }, 400);

    const { data, error } = await session.supabase.rpc("get_rental_conversation_detail", { p_conversation_id: threadId, p_before: before, p_limit: limit });
    if (error) return rpcFailure(error.code, { "42501": 403, "22023": 404 }, error.message);
    if (!data?.thread) return reply({ error: "Conversation or listing not found." }, 404);

    // Best-effort: reading must not fail because the read marker could not be written.
    if (!before) await session.supabase.rpc("mark_rental_conversation_read", { p_conversation_id: threadId }).then(() => undefined, () => undefined);

    const [thread] = await enrichThreads([data.thread]);
    const messages = await enrichMessagesWithSignedAttachments(data.messages ?? []);
    return reply({ thread, messages, hasMore: Boolean(data.hasMore) }, 200);
  } catch {
    return rpcFailure(undefined, {});
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const session = await requireMessagingUser(request);
    if (session.response) return session.response;
    const limit = limited(messageLimiter, request, session.user.id);
    if (limit) return limit;
    const { threadId } = await context.params;
    if (!uuidPattern.test(threadId)) return badThread();

    const { operationId, body, replyToMessageId, attachments } = await readJson(request);
    if (typeof operationId !== "string" || !uuidPattern.test(operationId)) return reply({ error: "Invalid request id." }, 400);
    const validAttachments = Array.isArray(attachments) ? attachments : [];
    if (!validMessagePayload(body, validAttachments)) return invalidMessage();
    if (typeof replyToMessageId === "string" && !uuidPattern.test(replyToMessageId)) {
      return reply({ error: "Invalid reply message id." }, 400);
    }

    const { data, error } = await session.supabase.rpc("send_rental_message", {
      p_conversation_id: threadId,
      p_operation_id: operationId,
      p_body: typeof body === "string" ? body.trim() : "",
      p_reply_to_message_id: typeof replyToMessageId === "string" ? replyToMessageId : null,
      p_attachments: validAttachments,
    });
    if (error) return rpcFailure(error.code, { "23505": 409, "42501": 403, "22023": 400 }, error.message);

    const [enriched] = await enrichMessagesWithSignedAttachments(data ? [data] : []);
    return reply({ message: enriched ?? data }, data?.replayed === true ? 200 : 201);
  } catch {
    return rpcFailure(undefined, {});
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const session = await requireMessagingUser(request);
    if (session.response) return session.response;
    const { threadId } = await context.params;
    if (!uuidPattern.test(threadId)) return badThread();

    const { action } = await readJson(request);
    if (action !== "mark_read" && action !== "archive" && action !== "unarchive") return reply({ error: "Choose a valid action." }, 400);

    const { error } = action === "mark_read"
      ? await session.supabase.rpc("mark_rental_conversation_read", { p_conversation_id: threadId })
      : await session.supabase.rpc("set_rental_conversation_archived", { p_conversation_id: threadId, p_archived: action === "archive" });
    if (error) return rpcFailure(error.code, { "42501": 403, "22023": 400 }, error.message);
    return reply({ ok: true }, 200);
  } catch {
    return rpcFailure(undefined, {});
  }
}
