import { afterEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  slots: [] as unknown[],
  index: 0,
  effects: [] as Array<{ fn: () => void | (() => void); deps: unknown[] }>,
  cleanups: new Map<number, () => void>(),
  prevDeps: new Map<number, unknown[]>(),
}));

vi.mock("react", async (original) => {
  const actual = await original<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = hooks.index++;
      if (!(index in hooks.slots)) {
        hooks.slots[index] = typeof initial === "function" ? (initial as () => unknown)() : initial;
      }
      return [
        hooks.slots[index],
        (value: unknown) => {
          hooks.slots[index] =
            typeof value === "function"
              ? (value as (prev: unknown) => unknown)(hooks.slots[index])
              : value;
        },
      ];
    },
    useEffect: (fn: () => void | (() => void), deps?: unknown[]) => {
      const index = hooks.index++;
      const prev = hooks.prevDeps.get(index);
      const changed = !prev || !deps || deps.length !== prev.length || deps.some((d, i) => !Object.is(d, prev[i]));
      if (changed) {
        hooks.prevDeps.set(index, deps ?? []);
        hooks.effects.push({ fn, deps: deps ?? [] });
      }
    },
  };
});

import { deferWork, useDeferredInteractive, type IdleWindow } from "./useDeferredInteractive";

function resetHooks() {
  hooks.slots = [];
  hooks.index = 0;
  hooks.effects = [];
  hooks.cleanups.clear();
  hooks.prevDeps.clear();
}

function beginRender() {
  hooks.index = 0;
  hooks.effects = [];
}

function flushEffects() {
  for (const effect of hooks.effects) {
    hooks.cleanups.get(0)?.();
    const cleanup = effect.fn();
    if (typeof cleanup === "function") hooks.cleanups.set(0, cleanup);
    else hooks.cleanups.delete(0);
  }
}

afterEach(() => {
  resetHooks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("deferWork", () => {
  it("uses requestIdleCallback with a timeout when available", () => {
    const callback = vi.fn();
    const requestIdleCallback = vi.fn((cb: () => void) => { cb(); return 42; });
    const cancelIdleCallback = vi.fn();
    const win = { requestIdleCallback, cancelIdleCallback } as unknown as IdleWindow;

    const cancel = deferWork(callback, win);

    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 1000 });
    expect(callback).toHaveBeenCalledTimes(1);
    cancel();
    expect(cancelIdleCallback).toHaveBeenCalledWith(42);
  });

  it("falls back to a timeout and clears it on cancel", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const win = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout } as unknown as IdleWindow;

    deferWork(callback, win, 250);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(249);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);

    const second = vi.fn();
    const stop = deferWork(second, win, 250);
    stop();
    vi.advanceTimersByTime(500);
    expect(second).not.toHaveBeenCalled();
  });
});

describe("useDeferredInteractive", () => {
  it("defers readiness until idle and resets when disabled and re-enabled", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout });

    const useStep = (enabled: boolean, delayMs = 250) => {
      beginRender();
      const ready = useDeferredInteractive(enabled, delayMs);
      flushEffects();
      return ready;
    };

    expect(useStep(true, 250)).toBe(false);
    vi.advanceTimersByTime(250);
    expect(useStep(true, 250)).toBe(true);

    // Disabling clears readiness; re-enabling must wait for idle again.
    expect(useStep(false, 250)).toBe(false);
    expect(useStep(true, 250)).toBe(false);
    vi.advanceTimersByTime(249);
    expect(useStep(true, 250)).toBe(false);
    vi.advanceTimersByTime(1);
    expect(useStep(true, 250)).toBe(true);
  });
});
