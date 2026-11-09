import { createRateLimiter } from "@/server/rate-limit";
import { enrichThreads, invalidMessage, limited, readJson, reply, requireMessagingUser, rpcFailure, uuidPattern, validMessageBody } from "@/server/messaging-api";

const inquiryLimiter = createRateLimiter({ windowMs: 15 * 60_000, maxPerIp: 10, maxPerActor: 10 });

export async function GET(request: Request) {
  try {
    const session = await requireMessagingUser(request);
    if (session.response) return session.response;
    const includeArchived = new URL(request.url).searchParams.get("archived") === "true";
    const { data, error } = await session.supabase.rpc("list_rental_conversations", { p_include_archived: includeArchived });
    if (error) return rpcFailure(error.code, { "42501": 403 }, error.message);
    return reply({ threads: await enrichThreads(Array.isArray(data) ? data : []) }, 200);
  } catch {
    return rpcFailure(undefined, {});
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireMessagingUser(request, ["renter"]);
    if (session.response) return session.response;
    const limit = limited(inquiryLimiter, request, session.user.id);
    if (limit) return limit;

    const { listingId, operationId, body } = await readJson(request);
    if (typeof listingId !== "string" || !uuidPattern.test(listingId)) return reply({ error: "Choose a valid rental to message." }, 400);
    if (typeof operationId !== "string" || !uuidPattern.test(operationId)) return reply({ error: "Invalid request id." }, 400);
    if (!validMessageBody(body)) return invalidMessage();

    const { data, error } = await session.supabase.rpc("send_initial_rental_inquiry", { p_listing_id: listingId, p_operation_id: operationId, p_body: body.trim() });
    if (error) return rpcFailure(error.code, { "23505": 409, "42501": 403, "22023": 404 }, error.message);
    const result = (data ?? {}) as { conversationId?: string; messageId?: string; createdAt?: string; replayed?: boolean };
    return reply({ conversationId: result.conversationId, messageId: result.messageId, createdAt: result.createdAt, replayed: Boolean(result.replayed) }, result.replayed === true ? 200 : 201);
  } catch {
    return rpcFailure(undefined, {});
  }
}
