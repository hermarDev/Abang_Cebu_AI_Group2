import { reply, requireMessagingUser } from "@/server/messaging-api";

export async function GET(request: Request) {
  try {
    const session = await requireMessagingUser(request);
    if (session.response) return session.response;
    const { data, error } = await session.supabase.rpc("get_unread_rental_message_count");
    if (error) return reply({ error: "Unread count is temporarily unavailable." }, 503);
    return reply({ unreadCount: typeof data === "number" && data >= 0 ? data : 0 }, 200);
  } catch {
    return reply({ error: "Unread count is temporarily unavailable." }, 503);
  }
}
