/** performance.measure that never throws on negative or non-finite timestamps (React 19 Flight dev profiler). */
export function safeMeasure(
  name: string,
  startOrOptions?: string | PerformanceMeasureOptions,
  endMark?: string
): PerformanceMeasure | undefined {
  if (typeof performance === "undefined" || typeof performance.measure !== "function") return undefined;
  if (startOrOptions && typeof startOrOptions === "object") {
    const { start, end } = startOrOptions;
    if (typeof start === "number" && (!Number.isFinite(start) || start < 0)) return undefined;
    if (typeof end === "number" && (!Number.isFinite(end) || end < 0)) return undefined;
    if (typeof start === "number" && typeof end === "number" && end < start) return undefined;
  }
  try {
    return performance.measure(name, startOrOptions as string, endMark);
  } catch (error) {
    if (error instanceof TypeError && /negative time stamp/i.test(error.message)) return undefined;
    throw error;
  }
}
