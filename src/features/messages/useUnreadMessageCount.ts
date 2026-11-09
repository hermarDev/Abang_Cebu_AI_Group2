"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const UNREAD_POLL_MS = 30_000;
export const MESSAGES_UPDATED_EVENT = "abangcebu:messages-updated";

export async function fetchUnreadMessageCount(userId: string, fetchImpl: typeof fetch = fetch): Promise<number> {
  const response = await fetchImpl("/api/messages/unread-count", { cache: "no-store", headers: { "x-expected-user-id": userId } });
  if (!response.ok) throw new Error("Unread count unavailable");
  const { unreadCount } = await response.json() as { unreadCount?: unknown };
  return typeof unreadCount === "number" && Number.isFinite(unreadCount) && unreadCount > 0 ? Math.floor(unreadCount) : 0;
}

/** Call after a thread is read, archived, or a message is sent so nav badges update immediately. */
export function dispatchMessagesUpdated() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(MESSAGES_UPDATED_EVENT));
}

type PollTarget = { addEventListener: EventTarget["addEventListener"]; removeEventListener: EventTarget["removeEventListener"] };

/** Pure poll wiring (visibility-aware 30s interval + focus/custom-event refresh); returns cleanup. */
export function startUnreadPolling({ refresh, win, doc }: { refresh: () => void; win: PollTarget; doc: { visibilityState: DocumentVisibilityState; addEventListener?: EventTarget["addEventListener"]; removeEventListener?: EventTarget["removeEventListener"] }; }) {
  const refreshIfVisible = () => { if (doc.visibilityState !== "hidden") refresh(); };
  refreshIfVisible();
  const timer = setInterval(refreshIfVisible, UNREAD_POLL_MS);
  win.addEventListener("focus", refreshIfVisible);
  win.addEventListener(MESSAGES_UPDATED_EVENT, refreshIfVisible);
  doc.addEventListener?.("visibilitychange", refreshIfVisible);
  return () => {
    clearInterval(timer);
    win.removeEventListener("focus", refreshIfVisible);
    win.removeEventListener(MESSAGES_UPDATED_EVENT, refreshIfVisible);
    doc.removeEventListener?.("visibilitychange", refreshIfVisible);
  };
}

export function useUnreadMessageCount(userId: string | null | undefined, enabled: boolean = true): { unreadCount: number; refresh: () => Promise<void> } {
  const [unreadCount, setUnreadCount] = useState(0);
  const latest = useRef(0);
  const active = Boolean(enabled && userId);

  const refresh = useCallback(async () => {
    if (!active || !userId) return;
    const request = ++latest.current;
    try {
      const count = await fetchUnreadMessageCount(userId);
      if (request === latest.current) setUnreadCount(count);
    } catch { /* keep last known count; the next poll retries */ }
  }, [active, userId]);

  useEffect(() => {
    if (!active) return;
    const stop = startUnreadPolling({ refresh: () => { void refresh(); }, win: window, doc: document });
    return stop;
  }, [active, refresh]);

  return { unreadCount: active ? unreadCount : 0, refresh };
}
