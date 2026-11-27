"use client";

import { useEffect, useState } from "react";

export type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/** Schedule work for browser idle time with a timeout fallback; returns a cancel function. */
export function deferWork(callback: () => void, win: IdleWindow, delayMs = 500): () => void {
  if (typeof win.requestIdleCallback === "function") {
    const handle = win.requestIdleCallback(callback, { timeout: 1000 });
    return () => win.cancelIdleCallback?.(handle);
  }
  const handle = setTimeout(callback, delayMs);
  return () => clearTimeout(handle);
}

/**
 * Defers background work until the browser is idle. Falls back to a short
 * timeout where requestIdleCallback is unavailable.
 */
export function useDeferredInteractive(enabled: boolean, delayMs = 500): boolean {
  const key = `${enabled}:${delayMs}`;
  const [readyFor, setReadyFor] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let cancelled = false;
    const cancel = deferWork(() => { if (!cancelled) setReadyFor(key); }, window as IdleWindow, delayMs);
    return () => {
      cancelled = true;
      cancel();
      setReadyFor((current) => (current === key ? null : current));
    };
  }, [enabled, delayMs, key]);

  return readyFor === key;
}
