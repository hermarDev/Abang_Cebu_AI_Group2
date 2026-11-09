import { createRateLimiter } from "@/server/rate-limit";
import { limited, readJson, reply, requireMessagingUser, rpcFailure, uuidPattern } from "@/server/messaging-api";

const reportLimiter = createRateLimiter({ windowMs: 15 * 60_000, maxPerIp: 10, maxPerActor: 10 });
const TARGETS = ["conversation", "message", "listing", "account"];
const CATEGORIES = ["scam_or_fraud", "harassment", "inaccurate_listing", "off_platform_payment", "spam", "other"];
const optionalUuid = (value: unknown) => value === undefined || value === null || (typeof value === "string" && uuidPattern.test(value));

export async function POST(request: Request) {
  try {
    const session = await requireMessagingUser(request);
    if (session.response) return session.response;
    const limit = limited(reportLimiter, request, session.user.id);
    if (limit) return limit;

    const { operationId, targetType, conversationId, messageId, listingId, category, details, blockUser, blockCounterpart } = await readJson(request);
    const trimmed = typeof details === "string" ? details.trim() : "";
    if (typeof operationId !== "string" || !uuidPattern.test(operationId)
      || typeof targetType !== "string" || !TARGETS.includes(targetType)
      || typeof category !== "string" || !CATEGORIES.includes(category)
      || trimmed.length < 10 || trimmed.length > 1000
      || !optionalUuid(conversationId) || !optionalUuid(messageId) || !optionalUuid(listingId)) {
      return reply({ error: "Choose a category and describe the problem in 10 to 1,000 characters." }, 400);
    }

    const { data, error } = await session.supabase.rpc("submit_abuse_report", {
      p_operation_id: operationId, p_target_type: targetType,
      p_conversation_id: (conversationId as string | null | undefined) ?? null,
      p_message_id: (messageId as string | null | undefined) ?? null,
      p_listing_id: (listingId as string | null | undefined) ?? null,
      p_category: category, p_details: trimmed,
      p_block_counterpart: blockUser === true || blockCounterpart === true,
    });
    if (error) return rpcFailure(error.code, { "23505": 409, "42501": 403, "22023": 400 });
    const result = (data ?? {}) as { reportId?: string; status?: string; blocked?: boolean; replayed?: boolean };
    return reply({ reportId: result.reportId, status: result.status, blocked: Boolean(result.blocked), replayed: Boolean(result.replayed) }, result.replayed === true ? 200 : 201);
  } catch {
    return rpcFailure(undefined, {});
  }
}
