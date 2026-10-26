import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSyncExternalStore } from "react";
import { useFinderTheme } from "./useFinderTheme";

const testStore = vi.hoisted(() => ({ useServerSnapshot: false }));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useSyncExternalStore: vi.fn((
      _subscribe: (listener: () => void) => () => void,
      getSnapshot: () => string,
      getServerSnapshot: () => string,
    ) => testStore.useServerSnapshot ? getServerSnapshot() : getSnapshot()),
  };
});

const storageKey = "abangcebu-theme";
let stored: Map<string, string>;
let denyStorage: boolean;
let prefersDark: boolean;
let windowListeners: Map<string, Set<EventListener>>;
let mediaListeners: Set<(event: MediaQueryListEvent) => void>;
let mediaQuery: MediaQueryList;
let localStorageMock: Storage;

function setOsTheme(dark: boolean) {
  prefersDark = dark;
  for (const listener of mediaListeners) listener(new Event("change") as MediaQueryListEvent);
}

function fireWindowEvent(type: string, key?: string | null) {
  const event = Object.assign(new Event(type), { key });
  for (const listener of windowListeners.get(type) ?? []) listener(event);
}

function subscribeFromLastRender() {
  const subscribe = vi.mocked(useSyncExternalStore).mock.calls.at(-1)?.[0];
  if (!subscribe) throw new Error("useSyncExternalStore was not called");
  return subscribe as (listener: () => void) => () => void;
}

beforeEach(() => {
  stored = new Map();
  denyStorage = false;
  prefersDark = false;
  windowListeners = new Map();
  mediaListeners = new Set();
  testStore.useServerSnapshot = false;
  vi.mocked(useSyncExternalStore).mockClear();

  localStorageMock = {
    getItem: vi.fn((key: string) => {
      if (denyStorage) throw new Error("Storage access denied");
      return stored.get(key) ?? null;
    }),
    setItem: vi.fn((key: string, value: string) => {
      if (denyStorage) throw new Error("Storage access denied");
      stored.set(key, value);
    }),
  } as unknown as Storage;

  mediaQuery = {
    get matches() { return prefersDark; },
    addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => mediaListeners.add(listener)),
    removeEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => mediaListeners.delete(listener)),
  } as unknown as MediaQueryList;

  vi.stubGlobal("window", {
    localStorage: localStorageMock,
    matchMedia: vi.fn(() => mediaQuery),
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      const listeners = windowListeners.get(type) ?? new Set<EventListener>();
      listeners.add(listener);
      windowListeners.set(type, listeners);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => windowListeners.get(type)?.delete(listener)),
    dispatchEvent: vi.fn((event: Event) => {
      for (const listener of windowListeners.get(event.type) ?? []) listener(event);
      return true;
    }),
  } as unknown as Window);
});

afterEach(() => {
  testStore.useServerSnapshot = false;
  vi.unstubAllGlobals();
});

describe("useFinderTheme", () => {
  it("uses a stable light System snapshot for server rendering", () => {
    stored.set(storageKey, "dark");
    prefersDark = true;
    testStore.useServerSnapshot = true;

    expect(useFinderTheme()).toEqual({ preference: "system", resolvedTheme: "light", setPreference: expect.any(Function) });
  });

  it("treats missing and invalid values as System and follows the OS", () => {
    setOsTheme(true);
    expect(useFinderTheme()).toMatchObject({ preference: "system", resolvedTheme: "dark" });

    stored.set(storageKey, "sepia");
    setOsTheme(false);
    expect(useFinderTheme()).toMatchObject({ preference: "system", resolvedTheme: "light" });
  });

  it.each([
    ["light", false, "light"],
    ["light", true, "light"],
    ["dark", false, "dark"],
    ["dark", true, "dark"],
  ] as const)("explicit %s preference overrides OS dark=%s", (preference, osDark, resolvedTheme) => {
    stored.set(storageKey, preference);
    setOsTheme(osDark);
    expect(useFinderTheme()).toMatchObject({ preference, resolvedTheme });
  });

  it("persists a preference and notifies same-tab subscribers", () => {
    const listener = vi.fn();
    useFinderTheme();
    const unsubscribe = subscribeFromLastRender()(listener);

    useFinderTheme().setPreference("dark");

    expect(localStorageMock.setItem).toHaveBeenCalledWith(storageKey, "dark");
    expect(stored.get(storageKey)).toBe("dark");
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "abangcebu-theme-change" }));
    expect(listener).toHaveBeenCalledOnce();

    setOsTheme(true);
    useFinderTheme().setPreference("system");
    expect(localStorageMock.setItem).toHaveBeenLastCalledWith(storageKey, "system");
    expect(useFinderTheme()).toMatchObject({ preference: "system", resolvedTheme: "dark" });
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("keeps working when storage is denied", () => {
    denyStorage = true;
    stored.set(storageKey, "invalid");
    expect(() => useFinderTheme().setPreference("dark")).not.toThrow();
    expect(useFinderTheme()).toMatchObject({ preference: "dark", resolvedTheme: "dark" });
    expect(() => useFinderTheme().setPreference("light")).not.toThrow();
    expect(useFinderTheme()).toMatchObject({ preference: "light", resolvedTheme: "light" });
  });

  it("subscribes to OS, relevant storage, and custom theme changes, then cleans up", () => {
    useFinderTheme();
    const listener = vi.fn();
    const unsubscribe = subscribeFromLastRender()(listener);

    setOsTheme(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(useFinderTheme().resolvedTheme).toBe("dark");

    stored.set(storageKey, "light");
    fireWindowEvent("storage", storageKey);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(useFinderTheme()).toMatchObject({ preference: "light", resolvedTheme: "light" });
    setOsTheme(false);
    setOsTheme(true);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(useFinderTheme()).toMatchObject({ preference: "light", resolvedTheme: "light" });

    fireWindowEvent("storage", "unrelated-key");
    expect(listener).toHaveBeenCalledTimes(2);

    stored.set(storageKey, "dark");
    fireWindowEvent("abangcebu-theme-change");
    expect(listener).toHaveBeenCalledTimes(3);
    expect(useFinderTheme()).toMatchObject({ preference: "dark", resolvedTheme: "dark" });

    unsubscribe();
    setOsTheme(false);
    fireWindowEvent("storage", storageKey);
    fireWindowEvent("abangcebu-theme-change");
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
