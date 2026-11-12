import {
  clearNotifications,
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_TYPES,
  reply,
  requireNotificationUser,
  type NotificationTypeFilter,
} from "@/server/notifications-api";

export async function GET(request: Request) {
  const auth = await requireNotificationUser(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "true";
  const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined;
  const offset = url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : undefined;
  const search = url.searchParams.get("search") ?? undefined;
  const includeCounts = url.searchParams.get("counts") === "true";
  const requestedTypes = url.searchParams
    .get("type")
    ?.split(",")
    .map((value) => value.trim())
    .filter((value): value is NotificationTypeFilter =>
      (NOTIFICATION_TYPES as readonly string[]).includes(value)
    );

  try {
    const result = await fetchNotifications(auth.supabase, auth.user.id, {
      unreadOnly,
      limit,
      offset,
      search,
      includeCounts,
      types: requestedTypes && requestedTypes.length > 0 ? requestedTypes : undefined,
    });
    return reply(result, 200);
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return reply({ error: "Failed to load notifications." }, 500);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireNotificationUser(request);
  if ("response" in auth) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = body.action;

    if (action === "mark_all_read") {
      const result = await markAllNotificationsRead(auth.supabase, auth.user.id);
      return reply(result, 200);
    }

    if (action === "mark_read" && typeof body.id === "string") {
      const result = await markNotificationRead(auth.supabase, auth.user.id, body.id);
      return reply(result, 200);
    }

    return reply({ error: "Invalid notification action." }, 400);
  } catch (error) {
    console.error("Failed to update notifications:", error);
    return reply({ error: "Failed to update notification." }, 500);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireNotificationUser(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const scope = url.searchParams.get("scope");

  try {
    if (id) {
      const result = await deleteNotification(auth.supabase, auth.user.id, id);
      return reply(result, 200);
    }
    if (scope === "read" || scope === "all") {
      const result = await clearNotifications(auth.supabase, auth.user.id, scope);
      return reply(result, 200);
    }
    return reply({ error: "Missing required 'id' or valid 'scope' ('read' | 'all') parameter." }, 400);
  } catch (error) {
    console.error("Failed to delete notifications:", error);
    return reply({ error: "Failed to delete notifications." }, 500);
  }
}
