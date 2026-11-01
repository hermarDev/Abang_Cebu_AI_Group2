import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SavedRentalsContent } from "./SavedRentalsContent";

const hooks = vi.hoisted(() => ({
  cursor: 0,
  values: [] as unknown[],
  setters: [] as Array<ReturnType<typeof vi.fn>>,
  effects: [] as Array<() => void | (() => void)>,
  refCursor: 0,
  refs: [] as Array<{ current: unknown }>,
}));

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useState: (initial: unknown) => {
      const index = hooks.cursor++;
      if (!(index in hooks.values)) hooks.values[index] = initial;
      hooks.setters[index] ??= vi.fn();
      const trackedSetter = (value: unknown) => {
        hooks.setters[index](value);
        hooks.values[index] = typeof value === "function"
          ? (value as (current: unknown) => unknown)(hooks.values[index])
          : value;
      };
      return [hooks.values[index], trackedSetter];
    },
    useCallback: (callback: (...args: never[]) => unknown) => callback,
    useEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect); },
    useRef: (initial: unknown) => {
      const index = hooks.refCursor++;
      hooks.refs[index] ??= { current: initial };
      return hooks.refs[index];
    },
  };
});

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: { children: ReactNode }) => <a {...props}>{children}</a> }));
vi.mock("@/app/account/AccountMapBackground", () => ({ AccountMapBackground: () => null }));

const rental = {
  id: "rental-1",
  savedAt: "2026-01-01T00:00:00.000Z",
  title: "Lahug studio",
  description: "Near the university",
  price: 12000,
  propertyType: "studio",
  address: "Cebu City",
  city: "Cebu City",
  imageUrls: [],
  isAvailable: true,
};

function walk(node: ReactNode, visit: (element: React.ReactElement<Record<string, unknown>>) => void) {
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visit));
    return;
  }
  if (!isValidElement<Record<string, unknown>>(node)) return;
  visit(node);
  walk(node.props.children as ReactNode, visit);
}

function mounted() {
  hooks.cursor = 0;
  hooks.values = [];
  hooks.setters = [];
  hooks.effects = [];
  hooks.refCursor = 0;
  hooks.refs = [];
  SavedRentalsContent();
  const cleanups = hooks.effects.map((effect) => effect());
  return {
    tree: () => {
      hooks.cursor = 0;
      hooks.refCursor = 0;
      return SavedRentalsContent();
    },
    unmount: () => cleanups.forEach((cleanup) => typeof cleanup === "function" && cleanup()),
  };
}

function text(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (!isValidElement<Record<string, unknown>>(node)) return "";
  return text(node.props.children as ReactNode);
}

async function settle() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

beforeEach(() => {
  hooks.cursor = 0;
  hooks.values = [];
  hooks.setters = [];
  hooks.effects = [];
  hooks.refCursor = 0;
  hooks.refs = [];
  vi.unstubAllGlobals();
});

describe("SavedRentalsContent fetch lifecycle", () => {
  it("renders fetched saved rentals on success", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ favorites: [rental] }) });
    vi.stubGlobal("fetch", request);
    const page = mounted();
    await settle();

    expect(request).toHaveBeenCalledWith("/api/favorites", expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }));
    expect(text(page.tree())).toContain("Lahug studio");
    expect(text(page.tree())).toContain("1");
    expect(text(page.tree())).toContain("rental");
    page.unmount();
  });

  it("renders a fetch failure and lets Try again recover", async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ favorites: [rental] }) });
    vi.stubGlobal("fetch", request);
    const page = mounted();
    await settle();
    let retry: (() => void) | undefined;
    walk(page.tree(), (element) => {
      if (element.type === "button" && text(element.props.children as ReactNode).includes("Try again")) {
        retry = element.props.onClick as () => void;
      }
    });
    expect(text(page.tree())).toContain("offline");
    expect(retry).toBeTypeOf("function");

    retry?.();
    await settle();
    expect(request).toHaveBeenCalledTimes(2);
    expect(text(page.tree())).toContain("Lahug studio");
    expect(text(page.tree())).not.toContain("offline");
    page.unmount();
  });

  it("turns malformed JSON into the retryable load error", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new SyntaxError("bad json"); } });
    vi.stubGlobal("fetch", request);
    const page = mounted();
    await settle();

    const tree = page.tree();
    expect(text(tree)).toContain("Saved rentals could not be loaded. Please try again.");
    let alertCount = 0;
    walk(tree, (element) => { if (element.props.role === "alert") alertCount += 1; });
    expect(alertCount).toBe(1);
    page.unmount();
  });

  it("aborts a pending retry and skips its state updates after unmount", async () => {
    let resolveRetry!: (value: { ok: boolean; json: () => Promise<unknown> }) => void;
    const request = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementation(() => new Promise((resolve) => { resolveRetry = resolve; }));
    vi.stubGlobal("fetch", request);
    const page = mounted();
    await settle();
    let retry: (() => void) | undefined;
    walk(page.tree(), (element) => {
      if (element.type === "button" && text(element.props.children as ReactNode).includes("Try again")) {
        retry = element.props.onClick as () => void;
      }
    });

    retry?.();
    expect(retry).toBeTypeOf("function");
    expect(request).toHaveBeenCalledTimes(2);
    const retrySignal = request.mock.calls[1][1].signal as AbortSignal | undefined;
    const stateUpdatesBeforeUnmount = hooks.setters.reduce((count, setter) => count + setter.mock.calls.length, 0);

    page.unmount();
    expect(retrySignal?.aborted).toBe(true);
    resolveRetry({ ok: true, json: async () => ({ favorites: [rental] }) });
    await settle();

    expect(hooks.setters.reduce((count, setter) => count + setter.mock.calls.length, 0)).toBe(stateUpdatesBeforeUnmount);
  });

  it("aborts an older retry before starting a newer one", async () => {
    let resolveFirstRetry!: (value: { ok: boolean; json: () => Promise<unknown> }) => void;
    let resolveSecondRetry!: (value: { ok: boolean; json: () => Promise<unknown> }) => void;
    const request = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirstRetry = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecondRetry = resolve; }));
    vi.stubGlobal("fetch", request);
    const page = mounted();
    await settle();
    let retry: (() => void) | undefined;
    walk(page.tree(), (element) => {
      if (element.type === "button" && text(element.props.children as ReactNode).includes("Try again")) {
        retry = element.props.onClick as () => void;
      }
    });

    retry?.();
    const firstRetrySignal = request.mock.calls[1][1].signal as AbortSignal | undefined;
    retry?.();

    expect(request).toHaveBeenCalledTimes(3);
    expect(firstRetrySignal?.aborted).toBe(true);
    expect(request.mock.calls[2][1].signal).toBeInstanceOf(AbortSignal);
    const secondRetrySignal = request.mock.calls[2][1].signal as AbortSignal;
    const stateUpdatesBeforeStaleResponse = hooks.setters.reduce((count, setter) => count + setter.mock.calls.length, 0);
    resolveFirstRetry({ ok: true, json: async () => ({ favorites: [rental] }) });
    await settle();
    expect(secondRetrySignal.aborted).toBe(false);
    expect(hooks.setters.reduce((count, setter) => count + setter.mock.calls.length, 0)).toBe(stateUpdatesBeforeStaleResponse);
    resolveSecondRetry({ ok: true, json: async () => ({ favorites: [rental] }) });
    await settle();
    expect(text(page.tree())).toContain("Lahug studio");
    page.unmount();
  });
  it("does not update component state when an in-flight fetch resolves after unmount", async () => {
    let resolveResponse!: (value: { ok: boolean; json: () => Promise<unknown> }) => void;
    const request = vi.fn().mockReturnValue(new Promise((resolve) => { resolveResponse = resolve; }));
    vi.stubGlobal("fetch", request);
    const page = mounted();
    const signal = request.mock.calls[0][1].signal as AbortSignal;
    const stateUpdatesBeforeUnmount = hooks.setters.reduce((count, setter) => count + setter.mock.calls.length, 0);

    page.unmount();
    expect(signal.aborted).toBe(true);
    resolveResponse({ ok: true, json: async () => ({ favorites: [rental] }) });
    await settle();

    expect(hooks.setters.reduce((count, setter) => count + setter.mock.calls.length, 0)).toBe(stateUpdatesBeforeUnmount);
  });
});
