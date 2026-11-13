import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as unknown[],
  pending: [] as (() => void)[],
  cleanups: [] as (() => void)[],
  container: {},
}));

vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    return hooks.slots[index] ??= { current: index === 0 ? hooks.container : initial };
  },
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return [hooks.slots[index], (value: unknown) => { hooks.slots[index] = value; }];
  },
  useEffect: (effect: () => (() => void) | void, deps: unknown[]) => {
    const index = hooks.cursor++;
    const previous = hooks.slots[index] as unknown[] | undefined;
    if (!previous || deps.some((value, position) => value !== previous[position])) {
      hooks.slots[index] = deps;
      hooks.pending.push(() => {
        hooks.cleanups[index]?.();
        hooks.cleanups[index] = effect() || (() => {});
      });
    }
  },
}));

type RenderOptions = {
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": (errorCode: number) => void;
  "timeout-callback": () => void;
  action?: string;
};

let options: RenderOptions;
let api: { render: ReturnType<typeof vi.fn>; reset: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
let script: EventTarget & { src?: string; async?: boolean };
let append: ReturnType<typeof vi.fn>;
let Widget: typeof import("./TurnstileWidget").TurnstileWidget;
let onTokenChange: ReturnType<typeof vi.fn<(token: string) => void>>;

function render(resetKey = 0, action: "signup" | "login" | "recovery" = "signup", callback = onTokenChange) {
  hooks.cursor = 0;
  const tree = Widget({ onTokenChange: callback, resetKey, action });
  hooks.pending.splice(0).forEach((effect) => effect());
  return renderToStaticMarkup(tree);
}

function unmount() {
  hooks.cleanups.forEach((cleanup) => cleanup());
  hooks.cleanups = [];
  hooks.slots = [];
  hooks.cursor = 0;
}

async function load() {
  (window as unknown as { turnstile: typeof api }).turnstile = api;
  script.dispatchEvent(new Event("load"));
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "synthetic-public-sitekey");
  api = {
    render: vi.fn((_container, value: RenderOptions) => { options = value; return "widget-1"; }),
    reset: vi.fn(),
    remove: vi.fn(),
  };
  script = new EventTarget();
  append = vi.fn();
  onTokenChange = vi.fn();
  vi.stubGlobal("window", {});
  vi.stubGlobal("document", { createElement: () => script, head: { appendChild: append } });
  ({ TurnstileWidget: Widget } = await import("./TurnstileWidget"));
});

afterEach(() => {
  unmount();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("TurnstileWidget", () => {
  it("loads the explicit script once and renders the requested action", async () => {
    render(0, "login");
    expect(script.src).toBe("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit");
    await load();
    expect(api.render).toHaveBeenCalledWith(hooks.container, expect.objectContaining({
      sitekey: "synthetic-public-sitekey",
      size: "flexible",
      action: "login",
    }));
  });

  it("delivers the token through the latest callback", async () => {
    render();
    await load();
    const latest = vi.fn();
    render(0, "signup", latest);
    options.callback("synthetic-token");
    expect(latest).toHaveBeenCalledWith("synthetic-token");
    expect(render()).toContain("Verification complete");
  });

  it.each(["expired-callback", "timeout-callback", "error-callback"] as const)("clears an issued token on %s", async (event) => {
    render();
    await load();
    options.callback("synthetic-token");
    options[event](event === "error-callback" ? 600010 : undefined as never);
    expect(onTokenChange).toHaveBeenLastCalledWith("");
    expect(render()).toMatch(/expired|failed/);
  });

  it("removes its widget and ignores late callbacks after unmount", async () => {
    render();
    await load();
    unmount();
    onTokenChange.mockClear();
    options.callback("stale-token");
    expect(api.remove).toHaveBeenCalledWith("widget-1");
    expect(onTokenChange).not.toHaveBeenCalled();
  });

  it("reuses the shared script on repeat mounts", async () => {
    render();
    unmount();
    render();
    expect(append).toHaveBeenCalledOnce();
    await load();
    expect(api.render).toHaveBeenCalledOnce();
  });

  it("clears the token and resets only when resetKey changes", async () => {
    render();
    await load();
    options.callback("synthetic-token");
    render(1);
    expect(onTokenChange).toHaveBeenLastCalledWith("");
    expect(api.reset).toHaveBeenCalledWith("widget-1");
    render(1);
    expect(api.reset).toHaveBeenCalledOnce();
  });

  it("shows an accessible failure and clears the token when script loading fails", async () => {
    render();
    script.dispatchEvent(new Event("error"));
    await Promise.resolve();
    await Promise.resolve();
    const html = render();
    expect(html).toContain('role="alert"');
    expect(html).toContain("unavailable");
    expect(onTokenChange).toHaveBeenLastCalledWith("");
    expect(api.render).not.toHaveBeenCalled();
  });

  it("fails visibly when no site key is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    vi.useFakeTimers();
    render();
    vi.runAllTimers();
    expect(render()).toContain("unavailable");
    expect(append).not.toHaveBeenCalled();
    expect(onTokenChange).toHaveBeenLastCalledWith("");
  });

  it("fails visibly if rendering throws", async () => {
    api.render.mockImplementation(() => { throw new Error("synthetic render failure"); });
    render();
    await load();
    expect(render()).toContain("unavailable");
    expect(onTokenChange).toHaveBeenLastCalledWith("");
  });

  it("fails visibly if the script loads without an API", async () => {
    render();
    script.dispatchEvent(new Event("load"));
    await Promise.resolve();
    await Promise.resolve();
    expect(render()).toContain("unavailable");
    expect(api.render).not.toHaveBeenCalled();
  });

  it("fails visibly if the script never finishes loading", async () => {
    vi.useFakeTimers();
    render();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(render()).toContain("unavailable");
  });
});
