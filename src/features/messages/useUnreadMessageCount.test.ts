import { afterEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  active: false,
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
      if (!hooks.active) return actual.useState(initial);
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
    useRef: (initial: unknown) => {
      if (!hooks.active) return actual.useRef(initial);
      const index = hooks.index++;
      if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
      return hooks.slots[index];
    },
    useCallback: (fn: unknown) => fn,
    useEffect: (fn: () => void | (() => void), deps?: unknown[]) => {
      if (!hooks.active) return actual.useEffect(fn, deps);
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

import { MESSAGES_UPDATED_EVENT, UNREAD_POLL_MS, dispatchMessagesUpdated, fetchUnreadMessageCount, startUnreadPolling, useUnreadMessageCount } from "./useUnreadMessageCount";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

describe("fetchUnreadMessageCount", () => {
  it("sends the expected-user header with no-store and returns the count", async () => {
    const fetchImpl = vi.fn(async () => json({ unreadCount: 7 }));
    await expect(fetchUnreadMessageCount("user-1", fetchImpl as unknown as typeof fetch)).resolves.toBe(7);
    expect(fetchImpl).toHaveBeenCalledWith("/api/messages/unread-count", { cache: "no-store", headers: { "x-expected-user-id": "user-1" } });
  });
  it("rejects on non-ok and clamps invalid counts to 0", async () => {
    await expect(fetchUnreadMessageCount("u", (async () => json({}, false)) as unknown as typeof fetch)).rejects.toThrow();
    await expect(fetchUnreadMessageCount("u", (async () => json({ unreadCount: -3 })) as unknown as typeof fetch)).resolves.toBe(0);
  });
});

describe("startUnreadPolling", () => {
  const setup = (visibilityState: DocumentVisibilityState = "visible") => {
    vi.useFakeTimers();
    const win = new EventTarget();
    const doc = Object.assign(new EventTarget(), { visibilityState });
    const refresh = vi.fn();
    const stop = startUnreadPolling({ refresh, win, doc });
    return { win, doc, refresh, stop };
  };

  it("refreshes immediately and every 30 seconds", () => {
    const { refresh } = setup();
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(UNREAD_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(UNREAD_POLL_MS).toBe(30_000);
  });

  it("pauses while the document is hidden", () => {
    const { refresh, doc } = setup("hidden");
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(UNREAD_POLL_MS * 2);
    expect(refresh).not.toHaveBeenCalled();
    (doc as { visibilityState: string }).visibilityState = "visible";
    vi.advanceTimersByTime(UNREAD_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes on window focus and the messages-updated event, and stops after cleanup", () => {
    const { refresh, win, stop } = setup();
    refresh.mockClear();
    win.dispatchEvent(new Event("focus"));
    win.dispatchEvent(new Event(MESSAGES_UPDATED_EVENT));
    expect(refresh).toHaveBeenCalledTimes(2);
    stop();
    win.dispatchEvent(new Event("focus"));
    vi.advanceTimersByTime(UNREAD_POLL_MS);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});

it("dispatchMessagesUpdated fires the custom event on window", () => {
  const win = new EventTarget();
  vi.stubGlobal("window", win);
  vi.stubGlobal("CustomEvent", class extends Event { constructor(type: string) { super(type); } });
  const listener = vi.fn();
  win.addEventListener(MESSAGES_UPDATED_EVENT, listener);
  dispatchMessagesUpdated();
  expect(listener).toHaveBeenCalledTimes(1);
});

describe("useUnreadMessageCount hook", () => {
  afterEach(() => {
    for (const cleanup of hooks.cleanups.values()) cleanup();
    hooks.cleanups.clear();
    hooks.prevDeps.clear();
    hooks.effects = [];
    hooks.slots = [];
    hooks.index = 0;
    hooks.active = false;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const useTestUnreadCount = (userId: string | null, enabled: boolean = true) => {
    hooks.index = 0;
    return useUnreadMessageCount(userId, enabled);
  };

  it("resets unread count on account switch and ignores stale in-flight responses", async () => {
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("document", { visibilityState: "hidden" });

    let resolveUserA!: (res: Response) => void;
    const fetchMock = vi.fn((input: string | URL, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string> | undefined;
      const expectedUser = headers ? headers["x-expected-user-id"] : undefined;
      if (expectedUser === "user-a") {
        return new Promise<Response>((resolve) => {
          resolveUserA = resolve;
        });
      }
      if (expectedUser === "user-b") {
        return Promise.resolve(json({ unreadCount: 0 }));
      }
      return Promise.resolve(json({ unreadCount: 0 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    hooks.active = true;

    // 1. Initial render for user-a
    let hook = useTestUnreadCount("user-a");
    expect(hook.unreadCount).toBe(0);

    // Trigger refresh for user-a
    const refreshPromiseA = hook.refresh();
    resolveUserA(json({ unreadCount: 5 }));
    await refreshPromiseA;

    // Re-render after fetch settles
    hook = useTestUnreadCount("user-a");
    expect(hook.unreadCount).toBe(5);

    // 2. Start slow refresh for user-a
    let resolveUserA2!: (res: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>((res) => { resolveUserA2 = res; }));
    const staleRefreshA = hook.refresh();

    // 3. Switch account immediately to user-b: unread count must reset to 0
    hook = useTestUnreadCount("user-b");
    expect(hook.unreadCount).toBe(0);

    // 4. Stale user-a response arrives: must NOT overwrite user-b
    resolveUserA2(json({ unreadCount: 9 }));
    await staleRefreshA;

    hook = useTestUnreadCount("user-b");
    expect(hook.unreadCount).toBe(0);
  });

  it.each([
    ["account A-to-B-to-A", ["user-b", "user-a"] as const],
    ["disable-to-enable", [null, "user-a"] as const],
  ])("invalidates a held request across %s before effects run", async (_transition, [intermediateUser, returningUser]) => {
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("document", { visibilityState: "hidden" });

    let resolveUserA!: (res: Response) => void;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => Promise.resolve(json({ unreadCount: 5 })))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveUserA = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    hooks.active = true;

    let hook = useTestUnreadCount("user-a");
    await hook.refresh();
    hook = useTestUnreadCount("user-a");
    expect(hook.unreadCount).toBe(5);

    const heldRefresh = hook.refresh();
    hook = intermediateUser === null
      ? useTestUnreadCount("user-a", false)
      : useTestUnreadCount(intermediateUser);
    expect(hook.unreadCount).toBe(0);

    hook = useTestUnreadCount(returningUser);
    expect(hook.unreadCount).toBe(0);

    resolveUserA(json({ unreadCount: 9 }));
    await heldRefresh;

    hook = useTestUnreadCount(returningUser);
    expect(hook.unreadCount).toBe(0);
  });

  it("invalidates a held request when its effect is cleaned up on unmount", async () => {
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("document", { visibilityState: "hidden" });

    let resolveUserA!: (res: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { resolveUserA = resolve; })));
    hooks.active = true;

    const hook = useTestUnreadCount("user-a");
    const pendingEffects = hooks.effects.splice(0);
    const cleanup = pendingEffects[0]?.fn();
    expect(cleanup).toBeTypeOf("function");

    const heldRefresh = hook.refresh();
    (cleanup as () => void)();
    resolveUserA(json({ unreadCount: 9 }));
    await heldRefresh;

    const rerendered = useTestUnreadCount("user-a");
    expect(rerendered.unreadCount).toBe(0);
  });

  it("preserves the last known unread count when a refresh fails", async () => {
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("document", { visibilityState: "hidden" });

    const fetchMock = vi.fn()
      .mockImplementationOnce(() => Promise.resolve(json({ unreadCount: 7 })))
      .mockImplementationOnce(() => Promise.reject(new Error("Network failed")));
    vi.stubGlobal("fetch", fetchMock);

    hooks.active = true;

    let hook = useTestUnreadCount("user-fail");
    const initialRefresh = hook.refresh();
    await initialRefresh;

    hook = useTestUnreadCount("user-fail");
    expect(hook.unreadCount).toBe(7);

    const failedRefresh = hook.refresh();
    await failedRefresh;

    hook = useTestUnreadCount("user-fail");
    expect(hook.unreadCount).toBe(7);
  });
});
