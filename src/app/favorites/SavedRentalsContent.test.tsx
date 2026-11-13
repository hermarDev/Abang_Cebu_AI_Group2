import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SavedRentalsContent } from "./SavedRentalsContent";
import { notify } from "@/components/ui/AppToaster";
import { Skeleton } from "@/components/ui/Skeleton";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/components/ui/AppToaster", () => ({ notify: vi.fn() }));
const hooks = vi.hoisted(() => ({
  cursor: 0,
  values: [] as unknown[],
  setters: [] as Array<ReturnType<typeof vi.fn<(value: unknown) => void>>>,
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
  const renderSession = () => {
    const element = SavedRentalsContent({ userId: "test-user" });
    if (!isValidElement<{ userId: string }>(element) || typeof element.type !== "function") throw new Error("Expected saved-rentals session");
    return (element.type as (props: { userId: string }) => ReactNode)(element.props);
  };
  renderSession();
  const cleanups = hooks.effects.map((effect) => effect());
  return {
    tree: () => {
      hooks.cursor = 0;
      hooks.refCursor = 0;
      return renderSession();
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
  vi.mocked(notify).mockClear();
});

describe("SavedRentalsContent fetch lifecycle", () => {
  it("only announces a successful removal after the server confirms it", async () => {
    let resolveRemoval!: (value: { ok: boolean }) => void;
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ favorites: [rental] }) })
      .mockImplementationOnce(() => new Promise(resolve => { resolveRemoval = resolve; })));
    const page = mounted();
    await settle();
    let remove: (() => void) | undefined;
    walk(page.tree(), element => { if (element.props["aria-label"] === "Remove Lahug studio from saved rentals") remove = element.props.onClick as () => void; });
    expect(remove).toBeTypeOf("function");
    remove?.();
    expect(notify).not.toHaveBeenCalled();
    resolveRemoval({ ok: true });
    await settle();
    expect(notify).toHaveBeenCalledWith("success", "saved-rental-removed-rental-1", "Rental removed from your saved list.", expect.objectContaining({ action: expect.objectContaining({ label: "Undo", onClick: expect.any(Function) }) }));
    expect(text(page.tree())).not.toContain("Lahug studio");
    expect(text(page.tree())).not.toContain("Rental removed from your saved list.");
    page.unmount();
  });
  it("restores a removed rental through POST /api/favorites when Undo is clicked", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ favorites: [rental] }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", request);
    const page = mounted();
    await settle();
    let remove: (() => void) | undefined;
    walk(page.tree(), element => { if (element.props["aria-label"] === "Remove Lahug studio from saved rentals") remove = element.props.onClick as () => void; });
    remove?.();
    await settle();
    expect(text(page.tree())).not.toContain("Lahug studio");
    const options = vi.mocked(notify).mock.calls[0][3];
    options?.action?.onClick();
    await settle();
    expect(request).toHaveBeenLastCalledWith("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-expected-user-id": "test-user" },
      body: JSON.stringify({ listingId: "rental-1" }),
    });
    expect(text(page.tree())).toContain("Lahug studio");
    expect(notify).toHaveBeenCalledWith("success", "saved-rental-restored", "Rental restored to your saved list.");
    page.unmount();
  });
  it("keeps the rental out of the list and reports an error when Undo fails", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ favorites: [rental] }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false });
    vi.stubGlobal("fetch", request);
    const page = mounted();
    await settle();
    let remove: (() => void) | undefined;
    walk(page.tree(), element => { if (element.props["aria-label"] === "Remove Lahug studio from saved rentals") remove = element.props.onClick as () => void; });
    remove?.();
    await settle();
    vi.mocked(notify).mock.calls[0][3]?.action?.onClick();
    await settle();
    expect(text(page.tree())).not.toContain("Lahug studio");
    expect(notify).toHaveBeenCalledWith("error", "saved-rental-restore-failed", "Rental could not be restored. Please try again.");
    page.unmount();
  });
  it("renders a 3-card skeleton grid while loading", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    const page = mounted();
    const tree = page.tree();
    let status: Record<string, unknown> | undefined;
    let skeletons = 0;
    walk(tree, element => {
      if (element.props.role === "status") status = element.props;
      if (element.type === Skeleton) skeletons += 1;
    });
    expect(status?.["aria-label"]).toBe("Loading saved rentals");
    expect(text(tree)).toContain("Loading your saved rentals…");
    expect(skeletons).toBe(3 * 4);
    page.unmount();
  });
  it("links available rentals to the map and not unavailable ones", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ favorites: [rental, { ...rental, id: "rental-2", title: "Gone studio", isAvailable: false }] }) }));
    const page = mounted();
    await settle();
    const tree = page.tree();
    const hrefs: string[] = [];
    walk(tree, element => { if (text(element.props.children as ReactNode).trim() === "View on map") hrefs.push(element.props.href as string); });
    expect(hrefs).toEqual(["/?selected=rental-1"]);
    expect(text(tree)).not.toContain("Currently available");
    expect(text(tree)).toContain("No longer available");
    page.unmount();
  });
  it("navigates to messages page for an available saved rental and hides the action for unavailable ones", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ favorites: [rental, { ...rental, id: "rental-2", title: "Gone studio", isAvailable: false }] }) }));
    const page = mounted();
    await settle();
    const labels: string[] = [];
    let open: (() => void) | undefined;
    walk(page.tree(), (element) => {
      const label = element.props["aria-label"];
      if (typeof label === "string" && label.startsWith("Message landlord about")) { labels.push(label); open = element.props.onClick as () => void; }
    });
    expect(labels).toEqual(["Message landlord about Lahug studio"]);
    expect(open).toBeTypeOf("function");
    navigation.push.mockClear();
    open?.();
    expect(navigation.push).toHaveBeenCalledWith("/messages?listing=rental-1");
    page.unmount();
  });
  it("does not display a zero price for an unavailable rental", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ favorites: [{ ...rental, title: "Unavailable rental", price: 0, propertyType: "", address: "", city: "", description: "", isAvailable: false }] }) }));
    const page = mounted();
    await settle();
    expect(text(page.tree())).toContain("Unavailable rental");
    expect(text(page.tree())).not.toContain("₱0");
    expect(text(page.tree())).not.toContain("/ month");
    page.unmount();
  });
  it("keeps the saved rental and its remove action available after a failed removal", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ favorites: [rental] }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Removal failed" }) });
    vi.stubGlobal("fetch", request);
    const page = mounted();
    await settle();
    let remove: (() => void) | undefined;
    walk(page.tree(), (element) => {
      if (element.props["aria-label"] === "Remove Lahug studio from saved rentals") remove = element.props.onClick as () => void;
    });
    expect(remove).toBeTypeOf("function");
    remove?.();
    await settle();
    const tree = page.tree();
    expect(text(tree)).toContain("Removal failed");
    expect(text(tree)).toContain("Lahug studio");
    let removeAvailable = false;
    walk(tree, (element) => { if (element.props["aria-label"] === "Remove Lahug studio from saved rentals") removeAvailable = true; });
    expect(removeAvailable).toBe(true);
    page.unmount();
  });
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
