import { readFileSync } from "node:fs";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FinderAssistant } from "./FinderAssistant";

const hooks = vi.hoisted(() => ({
  states: [] as unknown[],
  stateIndex: 0,
  refs: [] as { current: unknown }[],
  refIndex: 0,
  effects: [] as (() => void | (() => void))[],
  layoutEffects: [] as (() => void | (() => void))[],
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = hooks.stateIndex++;
    if (!(index in hooks.states)) {
      hooks.states[index] = typeof initial === "function" ? (initial as () => unknown)() : initial;
    }
    return [
      hooks.states[index],
      (value: unknown) => {
        hooks.states[index] = typeof value === "function" ? (value as (prev: unknown) => unknown)(hooks.states[index]) : value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const index = hooks.refIndex++;
    if (!(index in hooks.refs)) hooks.refs[index] = { current: initial };
    return hooks.refs[index];
  },
  useEffect: (effect: () => void | (() => void)) => {
    hooks.effects.push(effect);
  },
  useLayoutEffect: (effect: () => void | (() => void)) => {
    hooks.layoutEffects.push(effect);
  },
  useCallback: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

const assistantSource = readFileSync("src/features/map/FinderAssistant.tsx", "utf8");
const shellSource = readFileSync("src/features/map/RestoredFinderShell.tsx", "utf8");
const shellCss = readFileSync("src/features/map/RestoredFinderShell.module.css", "utf8");

afterEach(() => {
  hooks.states = [];
  hooks.stateIndex = 0;
  hooks.refs = [];
  hooks.refIndex = 0;
  hooks.effects = [];
  hooks.layoutEffects = [];
  vi.unstubAllGlobals();
});

function captureAssistant(props: Partial<Parameters<typeof FinderAssistant>[0]> = {}) {
  hooks.stateIndex = 0;
  hooks.refIndex = 0;
  hooks.effects = [];
  hooks.layoutEffects = [];
  let tree: ReactNode;
  function Capture() {
    tree = FinderAssistant({
      open: true,
      onOpenChange: () => undefined,
      onSearch: () => undefined,
      onFilters: () => undefined,
      onControlsTargetChange: () => undefined,
      ...props,
    });
    return null;
  }
  renderToStaticMarkup(<Capture />);
  return tree!;
}

function findElement<P extends Record<string, unknown> = Record<string, unknown>>(
  tree: ReactNode,
  predicate: (element: ReactElement<P & Record<string, unknown>>) => boolean,
): ReactElement<P & Record<string, unknown>> | undefined {
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const result = findElement<P>(child, predicate);
      if (result) return result;
    }
    return undefined;
  }
  if (!isValidElement<P & Record<string, unknown> & { children?: ReactNode }>(tree)) return undefined;
  if (predicate(tree)) return tree;
  return findElement<P>(tree.props.children, predicate);
}

describe("FinderAssistant", () => {
  it("renders accessible region, log, close control, and composer markup when open", () => {
    const html = renderToStaticMarkup(
      <FinderAssistant
        open
        onOpenChange={() => undefined}
        onSearch={() => undefined}
        onFilters={() => undefined}
        onControlsTargetChange={() => undefined}
      />,
    );

    expect(html).toContain('aria-label="AbangCebu assistant"');
    expect(html).toContain('role="log"');
    expect(html).toContain('aria-label="Message the AbangCebu assistant"');
    expect(html).toContain('aria-label="Close chat"');
    expect(html).not.toContain("Jump to latest");
  });

  it("guards Enter submission during IME composition", () => {
    expect(assistantSource).toContain("onCompositionStart");
    expect(assistantSource).toContain("onCompositionEnd");
    expect(assistantSource).toContain("isComposing");
    expect(assistantSource).toContain("229");
  });

  it("guards Escape dismissal during IME composition or already-handled events", () => {
    const onOpenChange = vi.fn();
    const listeners = new Map<string, (event: unknown) => void>();
    vi.stubGlobal("window", {
      addEventListener: (type: string, fn: (event: unknown) => void) => listeners.set(type, fn),
      removeEventListener: vi.fn(),
    });

    const tree = captureAssistant({ open: true, onOpenChange });
    hooks.effects[2]();
    const onKeyDown = listeners.get("keydown");
    expect(onKeyDown).toBeTypeOf("function");

    const input = findElement<{ onCompositionStart?: () => void; onCompositionEnd?: () => void }>(
      tree,
      (el) => el.props["aria-label"] === "Message the AbangCebu assistant",
    )!;
    expect(input).toBeDefined();

    // 1. event.isComposing === true
    const composingEvent = { key: "Escape", isComposing: true, keyCode: 27, defaultPrevented: false, preventDefault: vi.fn() };
    onKeyDown!(composingEvent);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(composingEvent.preventDefault).not.toHaveBeenCalled();

    // 2. event.keyCode === 229 (IME process key)
    const imeKeyCodeEvent = { key: "Escape", isComposing: false, keyCode: 229, defaultPrevented: false, preventDefault: vi.fn() };
    onKeyDown!(imeKeyCodeEvent);
    expect(onOpenChange).not.toHaveBeenCalled();

    // 3. event.defaultPrevented === true
    const preventedEvent = { key: "Escape", isComposing: false, keyCode: 27, defaultPrevented: true, preventDefault: vi.fn() };
    onKeyDown!(preventedEvent);
    expect(onOpenChange).not.toHaveBeenCalled();

    // 4. composingRef.current === true (via onCompositionStart)
    input.props.onCompositionStart?.();
    const refComposingEvent = { key: "Escape", isComposing: false, keyCode: 27, defaultPrevented: false, preventDefault: vi.fn() };
    onKeyDown!(refComposingEvent);
    expect(onOpenChange).not.toHaveBeenCalled();

    // 5. Normal Escape after composition ends closes the assistant
    input.props.onCompositionEnd?.();
    const plainEscape = { key: "Escape", isComposing: false, keyCode: 27, defaultPrevented: false, preventDefault: vi.fn() };
    onKeyDown!(plainEscape);
    expect(plainEscape.preventDefault).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("preserves scroll position with a Jump to latest control and respects reduced motion", () => {
    expect(assistantSource).toContain("stickToBottomRef");
    expect(assistantSource).toContain("Jump to latest");
    expect(assistantSource).toContain("prefers-reduced-motion: reduce");
    expect(shellCss).toMatch(/\.chatJumpLatest\s*\{[^}]*position:\s*sticky;/);
  });

  it("resets scroll stickiness when starting a new chat or selecting local/account conversations", async () => {
    const scrollIntoView = vi.fn();
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: true }),
      localStorage: {
        getItem: () =>
          JSON.stringify([
            {
              id: "local-1",
              title: "Local chat",
              preview: "You: Hello",
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-02T00:00:00.000Z",
              messages: [
                { role: "user", content: "Hello" },
                { role: "assistant", content: "Hi there" },
              ],
            },
          ]),
        setItem: vi.fn(),
      },
    });

    const scrollUp = (tree: ReactNode) => {
      const log = findElement<{
        ref?: { current: unknown };
        onScroll?: () => void;
        children?: ReactNode;
      }>(tree, (el) => el.props.role === "log")!;
      log.props.ref!.current = { scrollHeight: 1000, scrollTop: 0, clientHeight: 400 };
      const children = [log.props.children].flat(Infinity).filter(isValidElement) as ReactElement<{ ref?: { current: unknown } }>[];
      const endSentinel = children.at(-1)!;
      endSentinel.props.ref!.current = { scrollIntoView };
      log.props.onScroll?.();
    };

    const hasJumpLatest = (tree: ReactNode) =>
      Boolean(findElement(tree, (el) => el.type === "button" && el.props.children === "Jump to latest"));

    // Load local guest history first
    captureAssistant({ open: true, authenticated: false });
    hooks.effects[0]();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Branch A: startNewChat resets stickToBottomRef and isAtBottom
    let tree = captureAssistant({ open: true, authenticated: false });
    scrollUp(tree);
    tree = captureAssistant({ open: true, authenticated: false });
    expect(hasJumpLatest(tree)).toBe(true);

    findElement<{ onClick?: () => void }>(tree, (el) => el.props["aria-label"] === "Open chat history")!.props.onClick?.();
    tree = captureAssistant({ open: true, authenticated: false });
    findElement<{ onClick?: () => void }>(
      tree,
      (el) => el.type === "button" && Array.isArray(el.props.children) && el.props.children.includes("New chat"),
    )!.props.onClick?.();

    scrollIntoView.mockClear();
    tree = captureAssistant({ open: true, authenticated: false });
    expect(hasJumpLatest(tree)).toBe(false);
    hooks.effects[1]();
    expect(scrollIntoView).toHaveBeenCalledOnce();

    // Branch B: selectConversation (local/cached branch) resets stickToBottomRef and isAtBottom
    scrollUp(tree);
    tree = captureAssistant({ open: true, authenticated: false });
    expect(hasJumpLatest(tree)).toBe(true);

    findElement<{ onClick?: () => void }>(tree, (el) => el.props["aria-label"] === "Open chat history")!.props.onClick?.();
    tree = captureAssistant({ open: true, authenticated: false });
    const localHistoryBtn = findElement<{ onClick?: () => void; className?: string }>(
      tree,
      (el) => el.type === "button" && typeof el.props.className === "string" && el.props.className.includes("chatHistoryOpen"),
    )!;
    localHistoryBtn.props.onClick?.();

    scrollIntoView.mockClear();
    tree = captureAssistant({ open: true, authenticated: false });
    expect(hasJumpLatest(tree)).toBe(false);
    hooks.effects[1]();
    expect(scrollIntoView).toHaveBeenCalledOnce();

    // Branch C: selectConversation (fetched account branch) resets stickToBottomRef and isAtBottom
    hooks.states = [];
    hooks.stateIndex = 0;
    hooks.refs = [];
    hooks.refIndex = 0;
    const remoteMessages = [
      { role: "user", content: "Studio in IT Park" },
      { role: "assistant", content: "Found 2 studios." },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("id=acct-2")) {
          return {
            ok: true,
            json: async () => ({
              conversation: {
                id: "acct-2",
                title: "IT Park studio",
                preview: "Found 2 studios.",
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-03T00:00:00.000Z",
                messages: remoteMessages,
              },
            }),
          };
        }
        if (url.includes("id=acct-1")) {
          return {
            ok: true,
            json: async () => ({
              conversation: {
                id: "acct-1",
                title: "Lahug room",
                preview: "Hi",
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-04T00:00:00.000Z",
                messages: remoteMessages,
              },
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            conversations: [
              { id: "acct-1", title: "Lahug room", preview: "Hi", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-04T00:00:00.000Z" },
              { id: "acct-2", title: "IT Park studio", preview: "Found 2 studios.", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-03T00:00:00.000Z" },
            ],
          }),
        };
      }),
    );

    captureAssistant({ open: true, authenticated: true, userId: "user-1" });
    hooks.effects[0]();
    await new Promise((resolve) => setTimeout(resolve, 0));

    tree = captureAssistant({ open: true, authenticated: true, userId: "user-1" });
    scrollUp(tree);
    tree = captureAssistant({ open: true, authenticated: true, userId: "user-1" });
    expect(hasJumpLatest(tree)).toBe(true);

    findElement<{ onClick?: () => void }>(tree, (el) => el.props["aria-label"] === "Open chat history")!.props.onClick?.();
    tree = captureAssistant({ open: true, authenticated: true, userId: "user-1" });
    // Select the second conversation (acct-2) which has no cached messages so it takes the fetched account branch
    const accountButtons: ReactElement<{ onClick?: () => void; className?: string }>[] = [];
    const collectButtons = (node: ReactNode) => {
      if (Array.isArray(node)) { node.forEach(collectButtons); return; }
      if (!isValidElement<{ children?: ReactNode; onClick?: () => void; className?: string }>(node)) return;
      if (node.type === "button" && typeof node.props.className === "string" && node.props.className.includes("chatHistoryOpen")) {
        accountButtons.push(node);
      }
      collectButtons(node.props.children);
    };
    collectButtons(tree);
    expect(accountButtons.length).toBeGreaterThanOrEqual(2);
    accountButtons[1].props.onClick?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    scrollIntoView.mockClear();
    tree = captureAssistant({ open: true, authenticated: true, userId: "user-1" });
    expect(hasJumpLatest(tree)).toBe(false);
    hooks.effects[1]();
    expect(scrollIntoView).toHaveBeenCalledOnce();
  });

  it("supports Escape dismissal and mobile Tab focus wrapping", () => {
    expect(assistantSource).toContain('"Escape"');
    expect(assistantSource).toContain("(max-width: 1023px)");
  });

  it("wraps mobile Tab focus into the panel when activeElement is outside focusables", () => {
    vi.stubGlobal("window", {
      matchMedia: (query: string) => ({ matches: query === "(max-width: 1023px)" }),
    });
    const first = { offsetParent: {}, focus: vi.fn() };
    const last = { offsetParent: {}, focus: vi.fn() };
    const outside = { offsetParent: {}, focus: vi.fn() };
    vi.stubGlobal("document", { activeElement: outside });

    const tree = captureAssistant({ open: true });
    const panel = findElement<{ onKeyDown?: (event: unknown) => void }>(
      tree,
      (el) => el.type === "section" && el.props["aria-label"] === "AbangCebu assistant",
    )!;
    expect(panel).toBeDefined();

    const forwardTab = {
      key: "Tab",
      shiftKey: false,
      preventDefault: vi.fn(),
      currentTarget: { querySelectorAll: () => [first, last] },
    };
    panel.props.onKeyDown?.(forwardTab);
    expect(forwardTab.preventDefault).toHaveBeenCalledOnce();
    expect(first.focus).toHaveBeenCalledOnce();
    expect(last.focus).not.toHaveBeenCalled();

    const backwardTab = {
      key: "Tab",
      shiftKey: true,
      preventDefault: vi.fn(),
      currentTarget: { querySelectorAll: () => [first, last] },
    };
    panel.props.onKeyDown?.(backwardTab);
    expect(backwardTab.preventDefault).toHaveBeenCalledOnce();
    expect(last.focus).toHaveBeenCalledOnce();
  });

  it("restores focus when closing the assistant from RestoredFinderShell", () => {
    expect(shellSource).toContain("wasHelpOpenRef");
    expect(shellSource).toContain('button[aria-label="Open rental assistant"]');
  });
});
