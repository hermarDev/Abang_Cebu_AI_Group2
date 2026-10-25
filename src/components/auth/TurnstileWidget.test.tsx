import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Existing tests use a hook harness because this project has no DOM test runtime.
const hooks = vi.hoisted(() => ({
  cursor: 0, slots: [] as unknown[], pending: [] as (() => void)[],
  cleanups: [] as (() => void)[], container: {},
}));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useRef: (initial: unknown) => {
    const i = hooks.cursor++;
    return hooks.slots[i] ??= { current: i === 0 ? hooks.container : initial };
  },
  useState: (initial: unknown) => {
    const i = hooks.cursor++;
    if (!(i in hooks.slots)) hooks.slots[i] = initial;
    return [hooks.slots[i], (value: unknown) => { hooks.slots[i] = value; }];
  },
  useEffect: (effect: () => (() => void) | void, deps: unknown[]) => {
    const i = hooks.cursor++;
    const previous = hooks.slots[i] as unknown[] | undefined;
    if (!previous || deps.some((value, j) => value !== previous[j])) {
      hooks.slots[i] = deps;
      hooks.pending.push(() => {
        hooks.cleanups[i]?.();
        hooks.cleanups[i] = effect() || (() => {});
      });
    }
  },
}));

type Options = { callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void };
let options: Options;
let api: { render: ReturnType<typeof vi.fn>; reset: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
let script: EventTarget & { src?: string; async?: boolean };
let append: ReturnType<typeof vi.fn>;
let Widget: typeof import("./TurnstileWidget").TurnstileWidget;
let onTokenChange: ReturnType<typeof vi.fn>;

function render(resetKey = 0, callback = onTokenChange) {
  hooks.cursor = 0;
  const tree = Widget({ onTokenChange: callback, resetKey });
  hooks.pending.splice(0).forEach((effect) => effect());
  return renderToStaticMarkup(tree);
}
function unmount() {
  hooks.cleanups.forEach((cleanup) => cleanup());
  hooks.cleanups = []; hooks.slots = []; hooks.cursor = 0;
}
async function load() {
  (window as unknown as { turnstile: typeof api }).turnstile = api;
  script.dispatchEvent(new Event("load"));
  await Promise.resolve(); await Promise.resolve();
}

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "synthetic-public-sitekey");
  api = { render: vi.fn((_container, value: Options) => { options = value; return "widget-1"; }), reset: vi.fn(), remove: vi.fn() };
  script = new EventTarget(); append = vi.fn(); onTokenChange = vi.fn();
  vi.stubGlobal("window", {});
  vi.stubGlobal("document", { createElement: () => script, head: { appendChild: append } });
  ({ TurnstileWidget: Widget } = await import("./TurnstileWidget"));
});
afterEach(() => { unmount(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("TurnstileWidget", () => {
  it("loads the explicit script and delivers the token through the latest callback", async () => {
    render();
    expect(script.src).toBe("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit");
    await load();
    expect(api.render).toHaveBeenCalledWith(hooks.container, expect.objectContaining({ sitekey: "synthetic-public-sitekey", size: "flexible" }));
    const latest = vi.fn(); render(0, latest);
    options.callback("synthetic-token");
    expect(latest).toHaveBeenCalledWith("synthetic-token");
    expect(render(0, latest)).toContain("Verification complete");
  });

  it.each(["expired-callback", "error-callback"] as const)("clears an issued token on %s", async (event) => {
    render(); await load(); options.callback("synthetic-token");
    options[event]();
    expect(onTokenChange).toHaveBeenLastCalledWith("");
    expect(render()).toContain(event === "expired-callback" ? "expired" : "failed");
  });

  it("removes its widget and ignores late callbacks after unmount", async () => {
    render(); await load();
    unmount(); onTokenChange.mockClear();
    options.callback("stale-token");
    expect(api.remove).toHaveBeenCalledWith("widget-1");
    expect(onTokenChange).not.toHaveBeenCalled();
  });

  it("reuses the shared script on repeat mounts including unmount before load", async () => {
    render(); unmount(); render();
    expect(append).toHaveBeenCalledOnce();
    await load();
    expect(api.render).toHaveBeenCalledOnce();
    unmount(); render(); await Promise.resolve(); await Promise.resolve();
    expect(api.render).toHaveBeenCalledTimes(2);
    expect(append).toHaveBeenCalledOnce();
  });

  it("clears the token and resets only when resetKey changes", async () => {
    render(); await load();
    options.callback("synthetic-token"); render(1);
    expect(onTokenChange).toHaveBeenLastCalledWith("");
    expect(api.reset).toHaveBeenCalledWith("widget-1");
    render(1); expect(api.reset).toHaveBeenCalledOnce();
  });

  it("shows an accessible failure and clears the token when script loading fails", async () => {
    render(); script.dispatchEvent(new Event("error"));
    await Promise.resolve(); await Promise.resolve();
    const html = render();
    expect(html).toContain('role="alert"');
    expect(html).toContain("unavailable");
    expect(onTokenChange).toHaveBeenLastCalledWith("");
    expect(api.render).not.toHaveBeenCalled();
  });

  it("fails visibly when no site key is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    render(); expect(render()).toContain("unavailable");
    expect(append).not.toHaveBeenCalled();
    expect(onTokenChange).toHaveBeenLastCalledWith("");
  });

  it("fails visibly if rendering throws", async () => {
    api.render.mockImplementation(() => { throw new Error("synthetic render failure"); });
    render(); await load();
    expect(render()).toContain("unavailable");
    expect(onTokenChange).toHaveBeenLastCalledWith("");
  });

  it("shares a pending script across concurrent widgets and removes each independently", async () => {
    render();
    const first = { slots: hooks.slots, cleanups: hooks.cleanups };
    hooks.slots = []; hooks.cleanups = [];
    render(); await load();
    expect(append).toHaveBeenCalledOnce();
    expect(api.render).toHaveBeenCalledTimes(2);
    unmount();
    expect(api.remove).toHaveBeenCalledOnce();
    hooks.slots = first.slots; hooks.cleanups = first.cleanups;
    unmount(); expect(api.remove).toHaveBeenCalledTimes(2);
  });

  it("fails visibly when the script loads without an API", async () => {
    render(); script.dispatchEvent(new Event("load"));
    await Promise.resolve(); await Promise.resolve();
    expect(render()).toContain("unavailable");
    expect(api.render).not.toHaveBeenCalled();
  });

  it("fails visibly when the script never finishes loading", async () => {
    vi.useFakeTimers(); render();
    await vi.advanceTimersByTimeAsync(15000);
    expect(render()).toContain("unavailable");
  });
});
