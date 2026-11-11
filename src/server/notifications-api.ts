import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { NotificationItem } from "@/types/database";

export const noStoreHeaders = { "Cache-Control": "no-store" };

export const reply = (body: unknown, status: number, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { ...noStoreHeaders, ...extra } });

export async function requireNotificationUser(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && isAuthRetryableFetchError(authError)) return { response: reply({ error: "Your account could not be checked. Please try again." }, 503) } as const;
  if (authError || !user) return { response: reply({ error: "Sign in to access notifications." }, 401) } as const;

  const expectedId = request.headers.get("x-expected-user-id");
  if (expectedId && expectedId !== user.id) {
    return { response: reply({ error: "Your account changed. Please refresh and try again." }, 409) } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) return { response: reply({ error: "Your account could not be checked." }, 503) } as const;
  if (!profile || profile.is_suspended) {
    return { response: reply({ error: "Notifications are unavailable for this account." }, 403) } as const;
  }

  return { supabase, user, profile } as const;
}

export async function fetchNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  options: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
) {
  const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 50);
  const offset = Math.max(Number(options.offset) || 0, 0);

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.unreadOnly) {
    query = query.eq("is_read", false);
  }

  const unreadQuery = supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("is_read", false);

  const [{ data, count, error }, { count: unreadCount, error: unreadError }] = await Promise.all([query, unreadQuery]);
  if (error) throw error;
  if (unreadError) throw unreadError;

  return {
    notifications: (data ?? []) as NotificationItem[],
    totalCount: count ?? 0,
    unreadCount: unreadCount ?? 0,
    hasMore: offset + limit < (count ?? 0),
  };
}

export async function markNotificationRead(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  notificationId: string
) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", userId)
    .select()
    .maybeSingle();

  if (error) throw error;

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("is_read", false);

  return { notification: data as NotificationItem | null, unreadCount: unreadCount ?? 0 };
}

export async function markAllNotificationsRead(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .eq("is_read", false);

  if (error) throw error;

  return { unreadCount: 0 };
}
