"use client";

import { useCallback, useEffect, useState } from "react";
import type { NotificationItem } from "@/types/database";

export const NOTIFICATION_POLL_MS = 30_000;
export const NOTIFICATIONS_UPDATED_EVENT = "abangcebu:notifications-updated";

export function dispatchNotificationsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
  }
}

interface FetchNotificationsResponse {
  notifications: NotificationItem[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
}

export async function fetchNotificationsClient(
  userId: string,
  unreadOnly = false,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal
): Promise<FetchNotificationsResponse> {
  const url = `/api/notifications${unreadOnly ? "?unread=true" : ""}`;
  const response = await fetchImpl(url, {
    cache: "no-store",
    headers: { "x-expected-user-id": userId },
    signal,
  });
  if (!response.ok) throw new Error("Failed to load notifications");
  return (await response.json()) as FetchNotificationsResponse;
}

export const NOTIFICATION_FOCUS_COOLDOWN_MS = 10_000;

// One entry per signed-in user: every hook instance (bell, mobile nav, drawer) shares the request, result and abort handle.
interface Shared {
  data: FetchNotificationsResponse | null;
  at: number;
  inFlight: Promise<FetchNotificationsResponse> | null;
  abort: AbortController | null;
  listeners: Set<(data: FetchNotificationsResponse) => void>;
}
const shared = new Map<string, Shared>();
let channel: BroadcastChannel | null = null;

function entry(userId: string): Shared {
  let item = shared.get(userId);
  if (!item) shared.set(userId, (item = { data: null, at: 0, inFlight: null, abort: null, listeners: new Set() }));
  return item;
}

function publish(userId: string, data: FetchNotificationsResponse) {
  const item = entry(userId);
  item.data = data;
  item.at = Date.now();
  item.listeners.forEach((listener) => listener(data));
}

/** Shared fetch: joins an in-flight request, and reuses fresh data unless `force`. */
export function loadNotifications(userId: string, { force = false }: { force?: boolean } = {}) {
  const item = entry(userId);
  if (item.inFlight) return item.inFlight;
  if (!force && item.data && Date.now() - item.at < NOTIFICATION_FOCUS_COOLDOWN_MS) return Promise.resolve(item.data);
  const abort = new AbortController();
  item.abort = abort;
  const request = fetchNotificationsClient(userId, false, fetch, abort.signal)
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
  return () => {
    item.listeners.delete(listener);
    if (item.listeners.size === 0) item.abort?.abort();
  };
}

const isAbort = (err: unknown) => err instanceof DOMException && err.name === "AbortError";

export function useNotificationCenter(
  userId: string | null | undefined,
  enabled: boolean = true
) {
  const active = Boolean(enabled && userId);
  const cached = active && userId ? shared.get(userId)?.data ?? null : null;
  const [notifications, setNotifications] = useState<NotificationItem[]>(cached?.notifications ?? []);
  const [unreadCount, setUnreadCount] = useState<number>(cached?.unreadCount ?? 0);
  const [loading, setLoading] = useState<boolean>(active && !cached);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (showLoading = false) => {
      if (!active || !userId) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      if (showLoading) setLoading(true);
      try {
        await loadNotifications(userId, { force: true });
      } catch (err) {
        if (!isAbort(err)) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [active, userId]
  );

  useEffect(() => {
    if (!active || !userId) return;

    const unsubscribe = subscribe(userId, (data) => {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setError(null);
      setLoading(false);
    });

    const poll = async (force: boolean) => {
      if (document.visibilityState === "hidden") return;
      try {
        await loadNotifications(userId, { force });
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
  }, [active, userId]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      // Optimistic update
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

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
    [userId, refresh]
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    // Optimistic update
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, is_read: true, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);

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
  }, [userId, refresh]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  };
}
