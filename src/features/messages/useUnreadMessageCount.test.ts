import { afterEach, describe, expect, it, vi } from "vitest";
import { MESSAGES_UPDATED_EVENT, UNREAD_POLL_MS, dispatchMessagesUpdated, fetchUnreadMessageCount, startUnreadPolling } from "./useUnreadMessageCount";

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
