"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationItem } from "@/types/database";

export const NOTIFICATION_POLL_MS = 30_000;
export const NOTIFICATIONS_UPDATED_EVENT = "abangcebu:notifications-updated";

export function dispatchNotificationsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
  }
}

export interface FetchNotificationsResponse {
  notifications: NotificationItem[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
  tabCounts?: {
    all: number;
    unread: number;
    messages: number;
    listings: number;
    system: number;
  };
}

export interface FetchNotificationsQuery {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
  types?: string[];
  includeCounts?: boolean;
}

export async function fetchNotificationsClient(
  userId: string,
  unreadOnly = false,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
  query: FetchNotificationsQuery = {}
): Promise<FetchNotificationsResponse> {
  const params = new URLSearchParams();
  if (unreadOnly || query.unreadOnly) params.set("unread", "true");
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  if (query.search) params.set("search", query.search);
  if (query.types && query.types.length > 0) params.set("type", query.types.join(","));
  if (query.includeCounts) params.set("counts", "true");

  const suffix = params.toString();
  const url = `/api/notifications${suffix ? `?${suffix}` : ""}`;
  const response = await fetchImpl(url, {
    cache: "no-store",
    headers: { "x-expected-user-id": userId },
    signal,
  });
  if (!response.ok) throw new Error("Failed to load notifications");
  return (await response.json()) as FetchNotificationsResponse;
}

export const NOTIFICATION_FOCUS_COOLDOWN_MS = 10_000;
export const DEFAULT_PAGE_SIZE = 20;

// One entry per signed-in user: every hook instance (bell, mobile nav, drawer) shares the request, result and abort handle.
interface Shared {
  data: FetchNotificationsResponse | null;
  at: number;
  inFlight: Promise<FetchNotificationsResponse> | null;
  abort: AbortController | null;
  listeners: Set<(data: FetchNotificationsResponse) => void>;
  realtimeChannel: unknown | null;
}
const shared = new Map<string, Shared>();
let channel: BroadcastChannel | null = null;

function entry(userId: string): Shared {
  let item = shared.get(userId);
  if (!item) shared.set(userId, (item = { data: null, at: 0, inFlight: null, abort: null, listeners: new Set(), realtimeChannel: null }));
  return item;
}

function publish(userId: string, data: FetchNotificationsResponse) {
  const item = entry(userId);
  item.data = data;
  item.at = Date.now();
  item.listeners.forEach((listener) => listener(data));
}

/** Shared fetch: joins an in-flight request, and reuses fresh data unless `force`. */
export function loadNotifications(
  userId: string,
  {
    force = false,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    unreadOnly = false,
    types,
    search,
    includeCounts = true,
  }: {
    force?: boolean;
    page?: number;
    pageSize?: number;
    unreadOnly?: boolean;
    types?: string[];
    search?: string;
    includeCounts?: boolean;
  } = {}
) {
  const item = entry(userId);
  const offset = (page - 1) * pageSize;
  const cacheKey = `${page}:${pageSize}:${unreadOnly}:${types?.join(",") ?? ""}:${search ?? ""}`;

  if (item.inFlight) return item.inFlight;
  if (!force && item.data && Date.now() - item.at < NOTIFICATION_FOCUS_COOLDOWN_MS) return Promise.resolve(item.data);

  const abort = new AbortController();
  item.abort = abort;
  const request = fetchNotificationsClient(userId, false, fetch, abort.signal, {
    unreadOnly,
    limit: pageSize,
    offset,
    types,
    search,
    includeCounts,
  })
    .then((data) => {
      publish(userId, data);
      channel?.postMessage({ userId, data });
      return data;
    })
    .finally(() => {
      item.inFlight = null;
      item.abort = null;
    });
  item.inFlight = request;
  return request;
}

function subscribe(userId: string, listener: (data: FetchNotificationsResponse) => void) {
  const item = entry(userId);
  item.listeners.add(listener);
  if (!channel && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel("abangcebu:notifications");
    channel.onmessage = ({ data }: MessageEvent<{ userId?: string; data?: FetchNotificationsResponse }>) => {
      if (data?.userId && data.data) publish(data.userId, data.data);
    };
  }

  // Realtime postgres_changes subscription per user
  if (!item.realtimeChannel && typeof window !== "undefined") {
    try {
      const supabase = createClient();
      item.realtimeChannel = supabase
        .channel(`realtime:notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${userId}`,
          },
          () => {
            void loadNotifications(userId, { force: true });
            dispatchNotificationsUpdated();
          }
        )
        .subscribe();
    } catch {
      // Graceful fallback to polling if realtime fails (offline or test mock)
    }
  }

  return () => {
    item.listeners.delete(listener);
    if (item.listeners.size === 0) {
      item.abort?.abort();
      if (item.realtimeChannel) {
        try {
          const supabase = createClient();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          void supabase.removeChannel(item.realtimeChannel as any);
        } catch {
          // ignore
        }
        item.realtimeChannel = null;
      }
    }
  };
}

const isAbort = (err: unknown) => err instanceof DOMException && err.name === "AbortError";

export interface UseNotificationCenterOptions {
  pageSize?: number;
  initialPage?: number;
}

export function useNotificationCenter(
  userId: string | null | undefined,
  enabled: boolean = true,
  options: UseNotificationCenterOptions = {}
) {
  const { pageSize = DEFAULT_PAGE_SIZE, initialPage = 1 } = options;
  const active = Boolean(enabled && userId);
  const cached = active && userId ? shared.get(userId)?.data ?? null : null;
  const [notifications, setNotifications] = useState<NotificationItem[]>(cached?.notifications ?? []);
  const [unreadCount, setUnreadCount] = useState<number>(cached?.unreadCount ?? 0);
  const [totalCount, setTotalCount] = useState<number>(cached?.totalCount ?? 0);
  const [loading, setLoading] = useState<boolean>(active && !cached);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const refresh = useCallback(
    async (showLoading = false) => {
      if (!active || !userId) {
        setNotifications([]);
        setUnreadCount(0);
        setTotalCount(0);
        setCurrentPage(1);
        setLoading(false);
        return;
      }
      if (showLoading) setLoading(true);
      try {
        await loadNotifications(userId, { force: true, page: 1, pageSize });
      } catch (err) {
        if (!isAbort(err)) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [active, userId, pageSize]
  );

  const loadPage = useCallback(
    async (page: number, opts: { unreadOnly?: boolean; types?: string[]; search?: string } = {}) => {
      if (!active || !userId) return;
      setLoading(true);
      setCurrentPage(page);
      try {
        const data = await loadNotifications(userId, {
          force: true,
          page,
          pageSize,
          unreadOnly: opts.unreadOnly,
          types: opts.types,
          search: opts.search,
        });
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setTotalCount(data.totalCount);
        setError(null);
      } catch (err) {
        if (!isAbort(err)) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [active, userId, pageSize]
  );

  useEffect(() => {
    if (!active || !userId) return;

    const unsubscribe = subscribe(userId, (data) => {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setTotalCount(data.totalCount);
      setError(null);
      setLoading(false);
    });

    const poll = async (force: boolean) => {
      if (document.visibilityState === "hidden") return;
      try {
        await loadNotifications(userId, { force, page: currentPage, pageSize });
      } catch (err) {
        if (!isAbort(err)) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };

    void poll(false);

    // Timer and explicit updates must refetch; focus/visibility bursts are absorbed by the cooldown.
    const onTimerOrUpdate = () => void poll(true);
    const onFocusOrVisible = () => void poll(false);

    const timer = setInterval(onTimerOrUpdate, NOTIFICATION_POLL_MS);
    window.addEventListener("focus", onFocusOrVisible);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onTimerOrUpdate);
    document.addEventListener("visibilitychange", onFocusOrVisible);

    return () => {
      unsubscribe();
      clearInterval(timer);
      window.removeEventListener("focus", onFocusOrVisible);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onTimerOrUpdate);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
    };
  }, [active, userId, currentPage, pageSize]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      const current = entry(userId).data ?? {
        notifications,
        totalCount,
        unreadCount,
        hasMore: false,
      };
      const nextNotifications = current.notifications.map((item) =>
        item.id === id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item
      );
      const target = current.notifications.find((item) => item.id === id);
      const nextUnreadCount = target && !target.is_read ? Math.max(0, current.unreadCount - 1) : current.unreadCount;
      const nextData: FetchNotificationsResponse = {
        ...current,
        notifications: nextNotifications,
        unreadCount: nextUnreadCount,
      };
      publish(userId, nextData);
      channel?.postMessage({ userId, data: nextData });

      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-expected-user-id": userId,
          },
          body: JSON.stringify({ action: "mark_read", id }),
        });
        dispatchNotificationsUpdated();
      } catch {
        void refresh(false);
      }
    },
    [userId, notifications, unreadCount, totalCount, refresh]
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    const current = entry(userId).data ?? {
      notifications,
      totalCount,
      unreadCount,
      hasMore: false,
    };
    const nextNotifications = current.notifications.map((item) => ({
      ...item,
      is_read: true,
      read_at: new Date().toISOString(),
    }));
    const nextData: FetchNotificationsResponse = {
      ...current,
      notifications: nextNotifications,
      unreadCount: 0,
    };
    publish(userId, nextData);
    channel?.postMessage({ userId, data: nextData });

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-expected-user-id": userId,
        },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      dispatchNotificationsUpdated();
    } catch {
      void refresh(false);
    }
  }, [userId, notifications, unreadCount, totalCount, refresh]);

  const deleteNotification = useCallback(
    async (id: string): Promise<boolean> => {
      if (!userId) return false;
      const current = entry(userId).data ?? {
        notifications,
        totalCount,
        unreadCount,
        hasMore: false,
      };

      const target = current.notifications.find((n) => n.id === id);
      const isUnread = target ? !target.is_read : false;
      const nextNotifications = current.notifications.filter((n) => n.id !== id);
      const nextUnreadCount = isUnread ? Math.max(0, current.unreadCount - 1) : current.unreadCount;
      const nextTotalCount = Math.max(0, current.totalCount - 1);

      const nextData: FetchNotificationsResponse = {
        notifications: nextNotifications,
        totalCount: nextTotalCount,
        unreadCount: nextUnreadCount,
        hasMore: current.hasMore,
      };

      publish(userId, nextData);
      channel?.postMessage({ userId, data: nextData });

      try {
        const res = await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: { "x-expected-user-id": userId },
        });
        if (!res.ok) throw new Error("Failed to delete notification");
        dispatchNotificationsUpdated();
        return true;
      } catch {
        void refresh(false);
        return false;
      }
    },
    [userId, notifications, unreadCount, totalCount, refresh]
  );

  const clearNotifications = useCallback(
    async (scope: "read" | "all"): Promise<boolean> => {
      if (!userId) return false;
      const current = entry(userId).data ?? {
        notifications,
        totalCount,
        unreadCount,
        hasMore: false,
      };

      let nextNotifications: NotificationItem[];
      let nextUnreadCount: number;
      let nextTotalCount: number;

      if (scope === "read") {
        const readCount = current.notifications.filter((n) => n.is_read).length;
        nextNotifications = current.notifications.filter((n) => !n.is_read);
        nextUnreadCount = current.unreadCount;
        nextTotalCount = Math.max(0, current.totalCount - readCount);
      } else {
        nextNotifications = [];
        nextUnreadCount = 0;
        nextTotalCount = 0;
      }

      const nextData: FetchNotificationsResponse = {
        notifications: nextNotifications,
        totalCount: nextTotalCount,
        unreadCount: nextUnreadCount,
        hasMore: false,
      };

      publish(userId, nextData);
      channel?.postMessage({ userId, data: nextData });

      try {
        const res = await fetch(`/api/notifications?scope=${encodeURIComponent(scope)}`, {
          method: "DELETE",
          headers: { "x-expected-user-id": userId },
        });
        if (!res.ok) throw new Error("Failed to clear notifications");
        dispatchNotificationsUpdated();
        return true;
      } catch {
        void refresh(false);
        return false;
      }
    },
    [userId, notifications, unreadCount, totalCount, refresh]
  );

  return {
    notifications,
    unreadCount,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
    loading,
    error,
    refresh,
    loadPage,
    setPage: setCurrentPage,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
  };
}