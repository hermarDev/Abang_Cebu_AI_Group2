export const NAV_START_MARK = "abangcebu:nav-start";
export const NAV_END_MARK = "abangcebu:nav-end";
export const NAV_MEASURE = "abangcebu:navigation";
export const SOFT_NAV_MEASURE = "abangcebu:soft-navigation";

let lastNavigationDuration: number | null = null;

function hasPerformanceApi(): boolean {
  return typeof performance !== "undefined" && typeof performance.mark === "function" && typeof performance.measure === "function";
}

/** Mark the start of a same-origin link transition. Repeated clicks reset the mark. */
export function markNavigationStart(): void {
  if (!hasPerformanceApi()) return;
  performance.clearMarks?.(NAV_START_MARK);
  performance.clearMarks?.(NAV_END_MARK);
  performance.mark(NAV_START_MARK);
}

/** Close the navigation measure if a start mark exists. */
export function markNavigationEnd(): void {
  if (!hasPerformanceApi()) return;
  if (performance.getEntriesByName?.(NAV_START_MARK, "mark").length === 0) return;
  performance.mark(NAV_END_MARK);
  try {
    performance.measure(NAV_MEASURE, NAV_START_MARK, NAV_END_MARK);
    const entries = performance.getEntriesByName?.(NAV_MEASURE, "measure") ?? [];
    lastNavigationDuration = entries.length ? entries[entries.length - 1].duration : null;
  } catch {
    // The root layout guard swallows invalid timestamps; leave the last value intact.
  } finally {
    performance.clearMarks?.(NAV_START_MARK);
    performance.clearMarks?.(NAV_END_MARK);
  }
}

export function getLastNavigationDuration(): number | null {
  return lastNavigationDuration;
}

export function getNavigationMeasures(): PerformanceEntry[] {
  if (typeof performance === "undefined" || typeof performance.getEntriesByName !== "function") return [];
  return performance.getEntriesByName(NAV_MEASURE, "measure");
}

/**
 * Progressive enhancement for browsers exposing soft-navigation entries.
 * Feature detection keeps unsupported browsers quiet; buffered=true captures
 * navigations that started before this listener mounted.
 */
export function observeSoftNavigationPaints(): (() => void) | null {
  if (typeof PerformanceObserver === "undefined") return null;
  if (!PerformanceObserver.supportedEntryTypes?.includes("soft-navigation")) return null;
  if (!hasPerformanceApi()) return null;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name.startsWith("about:")) continue;
      try {
        performance.measure(SOFT_NAV_MEASURE, {
          start: entry.startTime,
          end: "presentationTime" in entry && typeof entry.presentationTime === "number" ? entry.presentationTime : entry.startTime,
        });
      } catch {
        // Skip entries without a usable presentation timestamp.
      }
    }
  });
  observer.observe({ type: "soft-navigation", buffered: true });
  return () => observer.disconnect();
}
