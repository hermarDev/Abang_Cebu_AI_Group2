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

export const NOTIFICATION_TYPES = [
  "message",
  "inquiry",
  "listing_update",
  "listing_review",
  "listing_pending",
  "report",
  "security",
  "support",
] as const;

export type NotificationTypeFilter = (typeof NOTIFICATION_TYPES)[number];

/** Narrows a user-supplied search term to a safe PostgREST `or` filter fragment. */
export function buildNotificationSearchFilter(raw: string): string | null {
  const term = raw.replace(/[^a-zA-Z0-9 _-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!term) return null;
  return `title.ilike.%${term}%,body.ilike.%${term}%`;
}

export async function fetchNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  options: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
    types?: NotificationTypeFilter[];
    search?: string;
    includeCounts?: boolean;
  } = {}
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

  if (options.types && options.types.length > 0) {
    query = query.in("type", options.types);
  }

  const searchFilter = options.search ? buildNotificationSearchFilter(options.search) : null;
  if (searchFilter) {
    query = query.or(searchFilter);
  }

  const unreadQuery = supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("is_read", false);

  const countQueries = options.includeCounts
    ? {
        all: supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", userId),
        unread: supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", userId)
          .eq("is_read", false),
        messages: supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", userId)
          .in("type", ["message", "inquiry"]),
        listings: supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", userId)
          .in("type", ["listing_update", "listing_review", "listing_pending"]),
        system: supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", userId)
          .in("type", ["report", "security", "support"]),
      }
    : null;

  const [{ data, count, error }, { count: unreadCount, error: unreadError }, counts] = await Promise.all([
    query,
    unreadQuery,
    countQueries
      ? Promise.all([
          countQueries.all,
          countQueries.unread,
          countQueries.messages,
          countQueries.listings,
          countQueries.system,
        ])
      : Promise.resolve(null),
  ]);
  if (error) throw error;
  if (unreadError) throw unreadError;

  const countErrors = counts?.filter((result) => result.error) ?? [];
  if (countErrors.length > 0) throw countErrors[0].error;

  return {
    notifications: (data ?? []) as NotificationItem[],
    totalCount: count ?? 0,
    unreadCount: unreadCount ?? 0,
    hasMore: offset + limit < (count ?? 0),
    tabCounts: counts
      ? {
          all: counts[0].count ?? 0,
          unread: counts[1].count ?? 0,
          messages: counts[2].count ?? 0,
          listings: counts[3].count ?? 0,
          system: counts[4].count ?? 0,
        }
      : undefined,
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

export async function deleteNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  notificationId: string
) {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("recipient_id", userId);

  if (error) throw error;
  return { success: true, deleted: notificationId };
}

export async function clearNotifications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  scope: "read" | "all"
) {
  let query = supabase.from("notifications").delete().eq("recipient_id", userId);
  if (scope === "read") {
    query = query.eq("is_read", true);
  }
  const { error } = await query;
  if (error) throw error;
  return { success: true, scope };
}
