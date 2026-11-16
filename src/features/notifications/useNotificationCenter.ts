"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

function rollbackCache(
  userId: string,
  prevCached: FetchNotificationsResponse | null,
  prevAt: number,
  fallback: FetchNotificationsResponse
) {
  const item = entry(userId);
  item.data = prevCached;
  item.at = prevAt;
  const restored = prevCached ?? fallback;
  item.listeners.forEach((listener) => listener(restored));
  channel?.postMessage({ userId, data: restored });
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
  const offset = (page - 1) * pageSize;
  const isDefaultQuery =
    page === 1 &&
    pageSize === DEFAULT_PAGE_SIZE &&
    !unreadOnly &&
    (!types || types.length === 0) &&
    !search?.trim();

  if (!isDefaultQuery) {
    return fetchNotificationsClient(userId, false, fetch, undefined, {
      unreadOnly,
      limit: pageSize,
      offset,
      types,
      search,
      includeCounts,
    });
  }

  const item = entry(userId);
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
      if (data?.userId && data.data && (shared.get(data.userId)?.listeners.size ?? 0) > 0) {
        publish(data.userId, data.data);
      }
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

async function readApiErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown } | null;
    if (body && typeof body.error === "string" && body.error.trim()) return body.error;
  } catch {
    // Ignore non-JSON error responses
  }
  return fallback;
}

interface ScopedState {
  scope: string | null;
  notifications: NotificationItem[];
  unreadCount: number;
  totalCount: number;
  loading: boolean;
  error: string | null;
  currentPage: number;
}

function buildBaselineState(scope: string | null, initialPage: number): ScopedState {
  const cached = scope ? shared.get(scope)?.data ?? null : null;
  return {
    scope,
    notifications: cached?.notifications ?? [],
    unreadCount: cached?.unreadCount ?? 0,
    totalCount: cached?.totalCount ?? 0,
    loading: Boolean(scope && !cached),
    error: null,
    currentPage: initialPage,
  };
}

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
  const scope = active && userId ? userId : null;

  const [state, setState] = useState<ScopedState>(() => buildBaselineState(scope, initialPage));
  const activeScopeRef = useRef<string | null>(scope);

  // Scope/reset state immediately on userId or enabled transitions so stale cross-user data is never rendered.
  const effective = state.scope === scope ? state : buildBaselineState(scope, initialPage);

  if (state.scope !== scope) {
    setState(effective);
  }

  const { notifications, unreadCount, totalCount, loading, error, currentPage } = effective;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const setCurrentPage = useCallback(
    (pageOrUpdater: number | ((prev: number) => number)) => {
      setState((prev) => {
        const base = prev.scope === scope ? prev : buildBaselineState(scope, initialPage);
        const nextPage = typeof pageOrUpdater === "function" ? pageOrUpdater(base.currentPage) : pageOrUpdater;
        return { ...base, currentPage: nextPage };
      });
    },
    [scope, initialPage]
  );

  const refresh = useCallback(
    async (showLoading = false) => {
      const targetScope = scope;
      if (!targetScope) {
        setState(buildBaselineState(null, 1));
        return;
      }
      if (showLoading) {
        setState((prev) => (prev.scope === targetScope ? { ...prev, loading: true } : prev));
      }
      try {
        await loadNotifications(targetScope, { force: true, page: 1, pageSize });
      } catch (err) {
        if (!isAbort(err)) {
          const message = err instanceof Error ? err.message : "Failed to load";
          setState((prev) => (prev.scope === targetScope ? { ...prev, error: message } : prev));
        }
      } finally {
        setState((prev) => (prev.scope === targetScope ? { ...prev, loading: false } : prev));
      }
    },
    [scope, pageSize]
  );

  const loadPage = useCallback(
    async (page: number, opts: { unreadOnly?: boolean; types?: string[]; search?: string } = {}) => {
      const targetScope = scope;
      if (!targetScope) return;
      setState((prev) => (prev.scope === targetScope ? { ...prev, loading: true, currentPage: page } : prev));
      try {
        const data = await loadNotifications(targetScope, {
          force: true,
          page,
          pageSize,
          unreadOnly: opts.unreadOnly,
          types: opts.types,
          search: opts.search,
        });
        setState((prev) =>
          prev.scope === targetScope
            ? {
                ...prev,
                notifications: data.notifications,
                unreadCount: data.unreadCount,
                totalCount: data.totalCount,
                error: null,
              }
            : prev
        );
      } catch (err) {
        if (!isAbort(err)) {
          const message = err instanceof Error ? err.message : "Failed to load";
          setState((prev) => (prev.scope === targetScope ? { ...prev, error: message } : prev));
        }
      } finally {
        setState((prev) => (prev.scope === targetScope ? { ...prev, loading: false } : prev));
      }
    },
    [scope, pageSize]
  );

  useEffect(() => {
    activeScopeRef.current = scope;
    if (!scope) return;

    const targetScope = scope;
    let cancelled = false;

    const unsubscribe = subscribe(targetScope, (data) => {
      if (cancelled || activeScopeRef.current !== targetScope) return;
      setState((prev) =>
        prev.scope === targetScope
          ? {
              ...prev,
              notifications: data.notifications,
              unreadCount: data.unreadCount,
              totalCount: data.totalCount,
              error: null,
              loading: false,
            }
          : prev
      );
    });

    const poll = async (force: boolean) => {
      if (document.visibilityState === "hidden") return;
      try {
        await loadNotifications(targetScope, { force, page: currentPage, pageSize });
      } catch (err) {
        if (!cancelled && !isAbort(err)) {
          const message = err instanceof Error ? err.message : "Failed to load";
          setState((prev) => (prev.scope === targetScope ? { ...prev, error: message } : prev));
        }
      } finally {
        if (!cancelled) {
          setState((prev) => (prev.scope === targetScope ? { ...prev, loading: false } : prev));
        }
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
      cancelled = true;
      unsubscribe();
      clearInterval(timer);
      window.removeEventListener("focus", onFocusOrVisible);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onTimerOrUpdate);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
    };
  }, [scope, currentPage, pageSize]);

  const markAsRead = useCallback(
    async (id: string) => {
      const targetUserId = scope;
      if (!targetUserId) return;
      const item = entry(targetUserId);
      const prevCached = item.data;
      const prevAt = item.at;
      const current = prevCached ?? {
        notifications,
        totalCount,
        unreadCount,
        hasMore: false,
      };
      const nextNotifications = current.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      );
      const target = current.notifications.find((n) => n.id === id);
      const nextUnreadCount = target && !target.is_read ? Math.max(0, current.unreadCount - 1) : current.unreadCount;
      const nextData: FetchNotificationsResponse = {
        ...current,
        notifications: nextNotifications,
        unreadCount: nextUnreadCount,
      };
      publish(targetUserId, nextData);
      channel?.postMessage({ userId: targetUserId, data: nextData });

      try {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-expected-user-id": targetUserId,
          },
          body: JSON.stringify({ action: "mark_read", id }),
        });
        if (!res.ok) {
          throw new Error(await readApiErrorMessage(res, "Failed to mark notification as read"));
        }
        setState((prev) => (prev.scope === targetUserId && prev.error ? { ...prev, error: null } : prev));
        if (activeScopeRef.current === targetUserId) dispatchNotificationsUpdated();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to mark notification as read";
        rollbackCache(targetUserId, prevCached, prevAt, current);
        setState((prev) =>
          prev.scope === targetUserId
            ? {
                ...prev,
                notifications: (prevCached ?? current).notifications,
                unreadCount: (prevCached ?? current).unreadCount,
                totalCount: (prevCached ?? current).totalCount,
                error: message,
              }
            : prev
        );
      }
    },
    [scope, notifications, unreadCount, totalCount]
  );

  const markAllAsRead = useCallback(async () => {
    const targetUserId = scope;
    if (!targetUserId) return;
    const item = entry(targetUserId);
    const prevCached = item.data;
    const prevAt = item.at;
    const current = prevCached ?? {
      notifications,
      totalCount,
      unreadCount,
      hasMore: false,
    };
    const nextNotifications = current.notifications.map((n) => ({
      ...n,
      is_read: true,
      read_at: new Date().toISOString(),
    }));
    const nextData: FetchNotificationsResponse = {
      ...current,
      notifications: nextNotifications,
      unreadCount: 0,
    };
    publish(targetUserId, nextData);
    channel?.postMessage({ userId: targetUserId, data: nextData });

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-expected-user-id": targetUserId,
        },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res, "Failed to mark notifications as read"));
      }
      setState((prev) => (prev.scope === targetUserId && prev.error ? { ...prev, error: null } : prev));
      if (activeScopeRef.current === targetUserId) dispatchNotificationsUpdated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to mark notifications as read";
      rollbackCache(targetUserId, prevCached, prevAt, current);
      setState((prev) =>
        prev.scope === targetUserId
          ? {
              ...prev,
              notifications: (prevCached ?? current).notifications,
              unreadCount: (prevCached ?? current).unreadCount,
              totalCount: (prevCached ?? current).totalCount,
              error: message,
            }
          : prev
      );
    }
  }, [scope, notifications, unreadCount, totalCount]);

  const deleteNotification = useCallback(
    async (id: string): Promise<boolean> => {
      const targetUserId = scope;
      if (!targetUserId) return false;
      const item = entry(targetUserId);
      const prevCached = item.data;
      const prevAt = item.at;
      const current = prevCached ?? {
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

      publish(targetUserId, nextData);
      channel?.postMessage({ userId: targetUserId, data: nextData });

      try {
        const res = await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: { "x-expected-user-id": targetUserId },
        });
        if (!res.ok) throw new Error(await readApiErrorMessage(res, "Failed to delete notification"));
        if (activeScopeRef.current === targetUserId) dispatchNotificationsUpdated();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete notification";
        rollbackCache(targetUserId, prevCached, prevAt, current);
        setState((prev) =>
          prev.scope === targetUserId
            ? {
                ...prev,
                notifications: (prevCached ?? current).notifications,
                unreadCount: (prevCached ?? current).unreadCount,
                totalCount: (prevCached ?? current).totalCount,
                error: message,
              }
            : prev
        );
        return false;
      }
    },
    [scope, notifications, unreadCount, totalCount]
  );

  const clearNotifications = useCallback(
    async (clearScope: "read" | "all"): Promise<boolean> => {
      const targetUserId = scope;
      if (!targetUserId) return false;
      const item = entry(targetUserId);
      const prevCached = item.data;
      const prevAt = item.at;
      const current = prevCached ?? {
        notifications,
        totalCount,
        unreadCount,
        hasMore: false,
      };

      let nextNotifications: NotificationItem[];
      let nextUnreadCount: number;
      let nextTotalCount: number;

      if (clearScope === "read") {
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

      publish(targetUserId, nextData);
      channel?.postMessage({ userId: targetUserId, data: nextData });

      try {
        const res = await fetch(`/api/notifications?scope=${encodeURIComponent(clearScope)}`, {
          method: "DELETE",
          headers: { "x-expected-user-id": targetUserId },
        });
        if (!res.ok) throw new Error(await readApiErrorMessage(res, "Failed to clear notifications"));
        if (activeScopeRef.current === targetUserId) dispatchNotificationsUpdated();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to clear notifications";
        rollbackCache(targetUserId, prevCached, prevAt, current);
        setState((prev) =>
          prev.scope === targetUserId
            ? {
                ...prev,
                notifications: (prevCached ?? current).notifications,
                unreadCount: (prevCached ?? current).unreadCount,
                totalCount: (prevCached ?? current).totalCount,
                error: message,
              }
            : prev
        );
        return false;
      }
    },
    [scope, notifications, unreadCount, totalCount]
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
