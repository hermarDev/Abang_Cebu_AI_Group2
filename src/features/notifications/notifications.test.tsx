import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

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

import { NotificationCenter } from "./NotificationCenter";
import type { NotificationItem } from "@/types/database";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const dummyNotifications: NotificationItem[] = [
  {
    id: "n-1",
    recipient_id: "u-1",
    actor_id: "u-2",
    type: "message",
    title: "New message",
    body: "Your landlord replied to your inquiry.",
    link: "/messages?thread=t-1",
    entity_type: "conversation",
    entity_id: "t-1",
    is_read: false,
    read_at: null,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "n-2",
    recipient_id: "u-1",
    actor_id: "u-admin",
    type: "listing_update",
    title: "Listing updated",
    body: "A saved property has changed its price.",
    link: "/rentals/r-1",
    entity_type: "property",
    entity_id: "r-1",
    is_read: true,
    read_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

describe("NotificationCenter", () => {
  it("renders notifications with titles and relative timestamps", () => {
    const html = renderToStaticMarkup(
      <NotificationCenter
        notifications={dummyNotifications}
        unreadCount={1}
        loading={false}
        error={null}
        onRefresh={() => {}}
        onMarkAsRead={() => {}}
        onMarkAllAsRead={() => {}}
      />
    );

    expect(html).toContain("Notifications");
    expect(html).toContain("New message");
    expect(html).toContain("Your landlord replied to your inquiry.");
    expect(html).toContain("Listing updated");
    expect(html).toContain("Mark all read");
    expect(html).toContain('aria-label="Unread notification"');
  });

  it("coalesces concurrent loadNotifications calls for the same user into a single fetch", async () => {
    const { loadNotifications } = await import("./useNotificationCenter");
    let resolveFetch!: (value: Response) => void;
    const fetchSpy = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal("fetch", fetchSpy);

    const p1 = loadNotifications("dedupe-user-1", { force: true });
    const p2 = loadNotifications("dedupe-user-1", { force: false });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    resolveFetch({
      ok: true,
      json: async () => ({
        notifications: dummyNotifications,
        totalCount: 2,
        unreadCount: 1,
        hasMore: false,
      }),
    } as Response);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.unreadCount).toBe(1);
    expect(r2.unreadCount).toBe(1);

    // Subsequent non-forced call within 10s cooldown reuses cached state without fetching
    const r3 = await loadNotifications("dedupe-user-1", { force: false });
    expect(r3.unreadCount).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("renders 'No notifications yet' when there are no notifications", () => {
    const html = renderToStaticMarkup(
      <NotificationCenter
        notifications={[]}
        unreadCount={0}
        loading={false}
        error={null}
        userRole="renter"
        onRefresh={() => {}}
        onMarkAsRead={() => {}}
        onMarkAllAsRead={() => {}}
      />
    );

    expect(html).toContain("No notifications yet");
    expect(html).toContain("New landlord replies, inquiry updates, and rental alerts will appear here.");
    expect(html).not.toContain("role=\"group\"");
    expect(html).not.toContain("Mark all read");
  });

  it("renders role-specific descriptions for landlord and admin empty states", () => {
    const landlordHtml = renderToStaticMarkup(
      <NotificationCenter
        notifications={[]}
        unreadCount={0}
        loading={false}
        error={null}
        userRole="landlord"
        onRefresh={() => {}}
        onMarkAsRead={() => {}}
        onMarkAllAsRead={() => {}}
      />
    );
    expect(landlordHtml).toContain("New inquiries, renter messages, and listing reviews will appear here.");

    const adminHtml = renderToStaticMarkup(
      <NotificationCenter
        notifications={[]}
        unreadCount={0}
        loading={false}
        error={null}
        userRole="admin"
        onRefresh={() => {}}
        onMarkAsRead={() => {}}
        onMarkAllAsRead={() => {}}
      />
    );
    expect(adminHtml).toContain("New user reports, listing review submissions, and system alerts will appear here.");
  });

  it("renders verification_officer and customer_support specific empty state descriptions", () => {
    const fvoHtml = renderToStaticMarkup(
      <NotificationCenter
        notifications={[]}
        unreadCount={0}
        loading={false}
        error={null}
        userRole="verification_officer"
        onRefresh={() => {}}
        onMarkAsRead={() => {}}
        onMarkAllAsRead={() => {}}
      />
    );
    expect(fvoHtml).toContain("New listing verification requests and site visit alerts will appear here.");

    const supportHtml = renderToStaticMarkup(
      <NotificationCenter
        notifications={[]}
        unreadCount={0}
        loading={false}
        error={null}
        userRole="customer_support"
        onRefresh={() => {}}
        onMarkAsRead={() => {}}
        onMarkAllAsRead={() => {}}
      />
    );
    expect(supportHtml).toContain("New support escalations, landlord replies, and ticket updates will appear here.");
  });

  it("renders 'You’re all caught up!' when all notifications are read", () => {
    const readNotifications: NotificationItem[] = [
      {
        ...dummyNotifications[1],
        is_read: true,
      },
    ];
    const html = renderToStaticMarkup(
      <NotificationCenter
        notifications={readNotifications}
        unreadCount={0}
        loading={false}
        error={null}
        onRefresh={() => {}}
        onMarkAsRead={() => {}}
        onMarkAllAsRead={() => {}}
      />
    );

    expect(html).toContain("role=\"group\"");
    expect(html).toContain("Listing updated");
    expect(html).toContain("Mark all read");
    expect(html).toContain("disabled=\"\"");
  });

  it("renders per-item dismiss and clear read buttons when handlers provided", () => {
    const html = renderToStaticMarkup(
      <NotificationCenter
        notifications={dummyNotifications}
        unreadCount={1}
        loading={false}
        error={null}
        onRefresh={() => {}}
        onMarkAsRead={() => {}}
        onMarkAllAsRead={() => {}}
        onDeleteNotification={() => {}}
        onClearNotifications={() => {}}
      />
    );

    expect(html).toContain("Clear read");
    expect(html).toContain("Dismiss notification: New message");
    expect(html).toContain("Dismiss notification: Listing updated");
    expect(html).toContain("View all notifications");
  });

  it("renders error state when error is provided", () => {
    const html = renderToStaticMarkup(
      <NotificationCenter
        notifications={[]}
        unreadCount={0}
        loading={false}
        error="Network timeout"
        onRefresh={() => {}}
        onMarkAsRead={() => {}}
        onMarkAllAsRead={() => {}}
      />
    );

    expect(html).toContain("Network timeout");
    expect(html).toContain("Retry");
  });

  it("does not render pagination controls inside the modal/flyout", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      ...dummyNotifications[0],
      id: `n-${i}`,
    }));
    const html = renderToStaticMarkup(
      <NotificationCenter
        notifications={many}
        unreadCount={25}
        loading={false}
        error={null}
        onRefresh={() => {}}
        onMarkAsRead={() => {}}
        onMarkAllAsRead={() => {}}
      />
    );

    expect(html).not.toContain('aria-label="Pagination"');
    expect(html).toContain("View all notifications");
  });
});

function collectNodes(node: unknown): Array<import("react").ReactElement<Record<string, unknown>>> {
  if (Array.isArray(node)) return node.flatMap(collectNodes);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const el = node as import("react").ReactElement<Record<string, unknown>>;
  return [el, ...collectNodes(el.props.children)];
}

function flushEffects() {
  const pending = hooks.effects.splice(0, hooks.effects.length);
  for (let i = 0; i < pending.length; i++) {
    const prevCleanup = hooks.cleanups.get(i);
    if (prevCleanup) prevCleanup();
    const cleanup = pending[i].fn();
    if (typeof cleanup === "function") hooks.cleanups.set(i, cleanup);
  }
}

describe("NotificationBell and useNotificationCenter", () => {
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

  it("renders mobile trigger with onClick and aria-expanded directly on the semantic button without a div wrapper", async () => {
    const { NotificationBell } = await import("./NotificationBell");
    vi.stubGlobal("window", {
      innerWidth: 390,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal("document", {
      visibilityState: "hidden",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    hooks.active = true;
    const renderBell = () => {
      hooks.index = 0;
      return NotificationBell({ userId: "bell-mobile-user", userRole: "renter" });
    };

    renderBell();
    flushEffects();
    const mobileTree = collectNodes(renderBell());

    const divWithOnClick = mobileTree.find((el) => el.type === "div" && typeof el.props.onClick === "function");
    expect(divWithOnClick).toBeUndefined();

    const triggerButton = mobileTree.find(
      (el) => el.type === "button" && String(el.props["aria-label"] ?? "").startsWith("Notifications")
    );
    expect(triggerButton).toBeDefined();
    expect(typeof triggerButton?.props.onClick).toBe("function");
    expect(triggerButton?.props["aria-expanded"]).toBe(false);

    (triggerButton?.props.onClick as () => void)();
    const openTree = collectNodes(renderBell());
    const openButton = openTree.find(
      (el) => el.type === "button" && String(el.props["aria-label"] ?? "").startsWith("Notifications")
    );
    expect(openButton?.props["aria-expanded"]).toBe(true);
  });

  it("ignores a stale loadPage response after an A→B→A account switch", async () => {
    const { loadNotifications, useNotificationCenter } = await import("./useNotificationCenter");
    let resolveStalePage!: (res: Response) => void;
    let baseRequest = 0;
    const fetchMock = vi.fn((input: string | URL) => {
      if (String(input).includes("offset=20")) {
        return new Promise<Response>((resolve) => {
          resolveStalePage = resolve;
        });
      }
      const data = baseRequest++ === 0
        ? {
            notifications: [{ ...dummyNotifications[0], id: "aba-a-old", title: "Old A data" }],
            totalCount: 1,
            unreadCount: 1,
            hasMore: false,
          }
        : {
            notifications: [{ ...dummyNotifications[0], id: "aba-a-current", title: "Current A data" }],
            totalCount: 2,
            unreadCount: 2,
            hasMore: false,
          };
      return Promise.resolve({ ok: true, json: async () => data } as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    await loadNotifications("aba-user-a", { force: true });
    hooks.active = true;
    const useTestNotificationCenter = (uid: string | null) => {
      hooks.index = 0;
      return useNotificationCenter(uid, true);
    };

    const userA = useTestNotificationCenter("aba-user-a");
    expect(userA.notifications[0].title).toBe("Old A data");
    const staleLoadA = userA.loadPage(2);

    useTestNotificationCenter("aba-user-b");
    await loadNotifications("aba-user-a", { force: true });
    const reactivatedA = useTestNotificationCenter("aba-user-a");
    expect(reactivatedA.notifications[0].title).toBe("Current A data");
    expect(reactivatedA.unreadCount).toBe(2);

    resolveStalePage({
      ok: true,
      json: async () => ({
        notifications: [{ ...dummyNotifications[0], id: "aba-a-stale", title: "Stale A page" }],
        totalCount: 99,
        unreadCount: 99,
        hasMore: false,
      }),
    } as Response);
    await staleLoadA;

    const finalA = useTestNotificationCenter("aba-user-a");
    expect(finalA.notifications[0].title).toBe("Current A data");
    expect(finalA.unreadCount).toBe(2);
  });

  it("scopes and resets hook state immediately when userId changes and ignores stale async writes", async () => {
    const { loadNotifications, useNotificationCenter } = await import("./useNotificationCenter");
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal("document", {
      visibilityState: "visible",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    let resolveUserAFetch!: (res: Response) => void;
    let resolveUserBPage!: (res: Response) => void;
    const fetchMock = vi.fn((input: string | URL) => {
      const url = String(input);
      if (url.includes("offset=20")) {
        return new Promise<Response>((resolve) => {
          resolveUserBPage = resolve;
        });
      }
      return new Promise<Response>((resolve) => {
        resolveUserAFetch = resolve;
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    // Populate user-a cache first
    const primeA = loadNotifications("switch-user-a", { force: true });
    resolveUserAFetch({
      ok: true,
      json: async () => ({
        notifications: [dummyNotifications[0]],
        totalCount: 1,
        unreadCount: 1,
        hasMore: false,
      }),
    } as Response);
    await primeA;

    hooks.active = true;
    const useTestNotificationCenter = (uid: string | null) => {
      hooks.index = 0;
      return useNotificationCenter(uid, true);
    };

    const hookA = useTestNotificationCenter("switch-user-a");
    expect(hookA.notifications).toHaveLength(1);
    expect(hookA.unreadCount).toBe(1);

    // Start an async loadPage for user-a (offset=20)
    const staleLoadA = hookA.loadPage(2);

    // Immediately switch to user-b before user-a's loadPage settles
    const hookB = useTestNotificationCenter("switch-user-b");
    expect(hookB.notifications).toEqual([]);
    expect(hookB.unreadCount).toBe(0);
    expect(hookB.totalCount).toBe(0);
    expect(hookB.loading).toBe(true);

    // Settle stale user-a request: must NOT overwrite user-b's state
    resolveUserBPage({
      ok: true,
      json: async () => ({
        notifications: [dummyNotifications[0], dummyNotifications[1]],
        totalCount: 2,
        unreadCount: 1,
        hasMore: false,
      }),
    } as Response);
    await staleLoadA;

    const hookBAfterStale = useTestNotificationCenter("switch-user-b");
    expect(hookBAfterStale.notifications).toEqual([]);
    expect(hookBAfterStale.unreadCount).toBe(0);
  });

  it("rolls back pre-optimistic cache and sets error when markAsRead or markAllAsRead PATCH returns non-2xx", async () => {
    const { loadNotifications, useNotificationCenter } = await import("./useNotificationCenter");
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal("document", {
      visibilityState: "hidden",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const fetchMock = vi
      .fn()
      // Initial prime for patch-user-1
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notifications: dummyNotifications.map((n) => ({ ...n })),
          totalCount: 2,
          unreadCount: 1,
          hasMore: false,
        }),
      } as Response)
      // markAsRead PATCH -> 500
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Database unavailable" }),
      } as Response)
      // markAllAsRead PATCH -> 403
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "Forbidden" }),
      } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await loadNotifications("patch-user-1", { force: true });

    hooks.active = true;
    const useTestNotificationCenter = () => {
      hooks.index = 0;
      return useNotificationCenter("patch-user-1", true);
    };

    let hook = useTestNotificationCenter();
    flushEffects();
    expect(hook.unreadCount).toBe(1);
    expect(hook.notifications[0].is_read).toBe(false);

    // 1. Failing markAsRead
    await hook.markAsRead("n-1");
    hook = useTestNotificationCenter();
    expect(hook.unreadCount).toBe(1);
    expect(hook.notifications[0].is_read).toBe(false);
    expect(hook.error).toBeTruthy();

    // Verify shared cache itself rolled back (cooldown reuse returns pre-optimistic unread state)
    const cachedAfterSingle = await loadNotifications("patch-user-1", { force: false });
    expect(cachedAfterSingle.unreadCount).toBe(1);
    expect(cachedAfterSingle.notifications[0].is_read).toBe(false);

    // 2. Failing markAllAsRead
    await hook.markAllAsRead();
    hook = useTestNotificationCenter();
    expect(hook.unreadCount).toBe(1);
    expect(hook.notifications[0].is_read).toBe(false);
    expect(hook.error).toBeTruthy();

    const cachedAfterAll = await loadNotifications("patch-user-1", { force: false });
    expect(cachedAfterAll.unreadCount).toBe(1);
    expect(cachedAfterAll.notifications[0].is_read).toBe(false);

    // 3. Failing deleteNotification (500) rolls back item + unreadCount
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Delete failed" }),
    } as Response);
    const deleted = await hook.deleteNotification("n-1");
    expect(deleted).toBe(false);
    hook = useTestNotificationCenter();
    expect(hook.notifications).toHaveLength(2);
    expect(hook.unreadCount).toBe(1);

    // 4.Filtered loadNotifications (page 2 / search) does not overwrite unfiltered page-1 shared cache
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        notifications: [],
        totalCount: 0,
        unreadCount: 0,
        hasMore: false,
      }),
    } as Response);
    await loadNotifications("patch-user-1", { page: 2, search: "filtered-empty" });
    const cachedAfterFiltered = await loadNotifications("patch-user-1", { force: false });
    expect(cachedAfterFiltered.notifications).toHaveLength(2);
    expect(cachedAfterFiltered.unreadCount).toBe(1);
  });
});
