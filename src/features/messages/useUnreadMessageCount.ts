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

const inFlight = new Map<string, Promise<number>>();
let channel: BroadcastChannel | null = null;

/** Concurrent callers for one user (nav, workspace layout, drawer) share a single request; result is broadcast to other tabs. */
function fetchUnreadShared(userId: string): Promise<number> {
  const running = inFlight.get(userId);
  if (running) return running;
  const request = fetchUnreadMessageCount(userId)
    .then((count) => {
      if (!channel && typeof BroadcastChannel !== "undefined") channel = new BroadcastChannel("abangcebu:messages");
      channel?.postMessage({ userId, count });
      return count;
    })
    .finally(() => inFlight.delete(userId));
  inFlight.set(userId, request);
  return request;
}

interface ScopedCountState {
  scope: string | null;
  unreadCount: number;
  generation: number;
}

const buildBaselineState = (scope: string | null, generation = 0): ScopedCountState => ({
  scope,
  unreadCount: 0,
  generation,
});

export function useUnreadMessageCount(userId: string | null | undefined, enabled: boolean = true): { unreadCount: number; refresh: () => Promise<void> } {
  const active = Boolean(enabled && userId);
  const scope = active && userId ? userId : null;

  const [state, setState] = useState<ScopedCountState>(() => buildBaselineState(scope));
  const latest = useRef(0);

  const effective = state.scope === scope
    ? state
    : buildBaselineState(scope, state.generation + 1);
  if (state.scope !== scope) {
    setState(effective);
  }

  const refresh = useCallback(async () => {
    const targetScope = scope;
    if (!targetScope) return;
    const request = ++latest.current;
    const requestGeneration = effective.generation;
    try {
      const count = await fetchUnreadShared(targetScope);
      if (request === latest.current) {
        setState((prev) => (prev.scope === targetScope && prev.generation === requestGeneration ? { scope: targetScope, unreadCount: count, generation: requestGeneration } : prev));
      }
    } catch {
      // Preserve the last known count; failed refresh is not evidence of zero unread messages.
    }
  }, [scope, effective.generation]);

  useEffect(() => {
    if (!scope) return;
    const requestCounter = latest;
    const stop = startUnreadPolling({ refresh: () => { void refresh(); }, win: window, doc: document });
    const peer = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("abangcebu:messages") : null;
    if (peer) {
      peer.onmessage = ({ data }: MessageEvent<{ userId?: string; count?: number }>) => {
        if (data?.userId === scope && typeof data.count === "number") {
          setState((prev) => (prev.scope === scope ? { scope, unreadCount: data.count!, generation: prev.generation } : prev));
        }
      };
    }
    return () => {
      requestCounter.current++;
      stop();
      peer?.close();
    };
  }, [scope, refresh]);

  return { unreadCount: effective.unreadCount, refresh };
}
