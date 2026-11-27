import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NAV_MEASURE,
  NAV_START_MARK,
  SOFT_NAV_MEASURE,
  getNavigationMeasures,
  markNavigationEnd,
  markNavigationStart,
  observeSoftNavigationPaints,
} from "./navigation-timing";

type MarkEntry = { name: string; startTime: number };
type MeasureEntry = { name: string; duration: number };

function createPerformanceStub() {
  let clock = 100;
  const marks: MarkEntry[] = [];
  const measures: MeasureEntry[] = [];
  return {
    marks,
    measures,
    mark(name: string) {
      marks.push({ name, startTime: clock++ });
    },
    clearMarks(name: string) {
      for (let i = marks.length - 1; i >= 0; i -= 1) {
        if (marks[i].name === name) marks.splice(i, 1);
      }
    },
    measure(name: string, start: string | { start: number; end: number }, end?: string) {
      let duration = 0;
      if (typeof start === "object") {
        duration = start.end - start.start;
      } else {
        const from = marks.find((entry) => entry.name === start)?.startTime ?? 0;
        const to = marks.find((entry) => entry.name === end)?.startTime ?? from;
        duration = to - from;
      }
      measures.push({ name, duration });
    },
    getEntriesByName(name: string, type: string) {
      if (type === "mark") return marks.filter((entry) => entry.name === name);
      if (type === "measure") return measures.filter((entry) => entry.name === name);
      return [];
    },
  };
}

describe("navigation timing", () => {
  let perf: ReturnType<typeof createPerformanceStub>;

  beforeEach(() => {
    perf = createPerformanceStub();
    vi.stubGlobal("performance", perf);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("measures a navigation between start and end marks and clears them", () => {
    markNavigationStart();
    markNavigationEnd();
    expect(perf.measures).toMatchObject([{ name: NAV_MEASURE, duration: 1 }]);
    expect(getNavigationMeasures()).toHaveLength(1);
    expect(perf.marks).toHaveLength(0);
  });

  it("does not measure without a start mark", () => {
    markNavigationEnd();
    expect(perf.measures).toHaveLength(0);
  });

  it("resets the start mark on repeated clicks", () => {
    markNavigationStart();
    markNavigationStart();
    expect(perf.marks.filter((entry) => entry.name === NAV_START_MARK)).toHaveLength(1);
  });

  it("returns null when soft-navigation observation is unsupported", () => {
    vi.stubGlobal("PerformanceObserver", undefined);
    expect(observeSoftNavigationPaints()).toBeNull();
  });

  it("observes soft navigations with buffered=true and records a measure", () => {
    const state: { callback?: (list: { getEntries: () => unknown[] }) => void } = {};
    const observe = vi.fn();
    class ObserverStub {
      static supportedEntryTypes = ["soft-navigation"];
      constructor(cb: (list: { getEntries: () => unknown[] }) => void) {
        state.callback = cb;
      }
      observe = observe;
      disconnect = vi.fn();
    }
    vi.stubGlobal("PerformanceObserver", ObserverStub);

    const stop = observeSoftNavigationPaints();
    expect(observe).toHaveBeenCalledWith({ type: "soft-navigation", buffered: true });

    state.callback?.({ getEntries: () => [{ name: "/help", startTime: 100, presentationTime: 350 }] });
    expect(perf.measures).toMatchObject([{ name: SOFT_NAV_MEASURE, duration: 250 }]);
    expect(typeof stop).toBe("function");
  });
});
