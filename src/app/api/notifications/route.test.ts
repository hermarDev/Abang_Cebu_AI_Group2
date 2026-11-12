import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  selectNotifications: vi.fn(),
  countUnread: vi.fn(),
  updateNotification: vi.fn(),
  deleteNotification: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mocks.profile,
            }),
          }),
        };
      }
      if (table === "notifications") {
        return {
          select: (columns: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return {
                eq: () => ({
                  eq: () => mocks.countUnread(),
                }),
              };
            }
            return {
              eq: () => ({
                order: () => ({
                  range: () => mocks.selectNotifications(),
                  eq: () => ({
                    order: () => ({
                      range: () => mocks.selectNotifications(),
                    }),
                  }),
                }),
                eq: () => ({
                  order: () => ({
                    range: () => mocks.selectNotifications(),
                  }),
                }),
              }),
            };
          },
          update: (values: Record<string, unknown>) => ({
            eq: (col1: string, val1: unknown) => ({
              eq: (col2: string, val2: unknown) => {
                const chain = {
                  select: () => ({
                    maybeSingle: () => mocks.updateNotification(values, { [col1]: val1, [col2]: val2 }),
                  }),
                };
                return Object.assign(mocks.updateNotification(values, { [col1]: val1, [col2]: val2 }), chain);
              },
            }),
          }),
          delete: () => {
            const chain = {
              eq: (col: string, val: unknown) => {
                mocks.deleteNotification(col, val);
                return chain;
              },
              then: (onfulfilled?: (val: unknown) => unknown, onrejected?: (err: unknown) => unknown) =>
                Promise.resolve({ error: null }).then(onfulfilled, onrejected),
            };
            return chain;
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  }),
}));

const uid = "user-123";
const headers = (expected?: string): Record<string, string> => ({
  "content-type": "application/json",
  ...(expected !== undefined ? { "x-expected-user-id": expected } : {}),
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: uid } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "renter", is_suspended: false }, error: null });
  mocks.selectNotifications.mockResolvedValue({
    data: [
      {
        id: "n-1",
        recipient_id: uid,
        type: "message",
        title: "New message",
        body: "Hello",
        link: "/messages?thread=t-1",
        is_read: false,
        created_at: "2026-11-10T00:00:00Z",
      },
    ],
    count: 1,
    error: null,
  });
  mocks.countUnread.mockResolvedValue({ count: 1, error: null });
  mocks.updateNotification.mockResolvedValue({
    data: { id: "n-1", is_read: true },
    error: null,
  });
});

import { GET, PATCH, DELETE } from "./route";

describe("Notifications API Route", () => {
  describe("GET /api/notifications", () => {
    it("returns 401 when user is signed out", async () => {
      mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
      const res = await GET(new Request("http://localhost/api/notifications"));
      expect(res?.status).toBe(401);
    });

    it("returns 503, not 401, when the auth check fails on a retryable network error", async () => {
      mocks.getUser.mockResolvedValue({ data: { user: null }, error: new AuthRetryableFetchError("fetch failed", 0) });
      const res = await GET(new Request("http://localhost/api/notifications"));
      expect(res?.status).toBe(503);
    });

    it("returns 409 when x-expected-user-id mismatches", async () => {
      const res = await GET(new Request("http://localhost/api/notifications", {
        headers: headers("different-user"),
      }));
      expect(res?.status).toBe(409);
    });

    it("returns 403 when user is suspended", async () => {
      mocks.profile.mockResolvedValue({ data: { role: "renter", is_suspended: true }, error: null });
      const res = await GET(new Request("http://localhost/api/notifications", {
        headers: headers(uid),
      }));
      expect(res?.status).toBe(403);
    });

    it("returns notifications and unreadCount on success", async () => {
      const res = await GET(new Request("http://localhost/api/notifications", {
        headers: headers(uid),
      }));
      expect(res?.status).toBe(200);
      const json = await res!.json() as { notifications: unknown[]; unreadCount: number };
      expect(json.notifications).toHaveLength(1);
      expect(json.unreadCount).toBe(1);
    });
  });

  describe("PATCH /api/notifications", () => {
    it("marks single notification as read", async () => {
      const res = await PATCH(new Request("http://localhost/api/notifications", {
        method: "PATCH",
        headers: headers(uid),
        body: JSON.stringify({ action: "mark_read", id: "n-1" }),
      }));
      expect(res?.status).toBe(200);
      expect(mocks.updateNotification).toHaveBeenCalled();
    });

    it("marks all notifications as read", async () => {
      mocks.countUnread.mockResolvedValue({ count: 0, error: null });
      const res = await PATCH(new Request("http://localhost/api/notifications", {
        method: "PATCH",
        headers: headers(uid),
        body: JSON.stringify({ action: "mark_all_read" }),
      }));
      expect(res?.status).toBe(200);
      const json = await res!.json() as { unreadCount: number };
      expect(json.unreadCount).toBe(0);
    });

    it("returns 400 on invalid action", async () => {
      const res = await PATCH(new Request("http://localhost/api/notifications", {
        method: "PATCH",
        headers: headers(uid),
        body: JSON.stringify({ action: "unknown" }),
      }));
      expect(res?.status).toBe(400);
    });
  });

  describe("DELETE /api/notifications", () => {
    it("returns 401 when user is signed out", async () => {
      mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
      const res = await DELETE(new Request("http://localhost/api/notifications?id=n-1", {
        method: "DELETE",
      }));
      expect(res?.status).toBe(401);
    });

    it("deletes a single notification by id", async () => {
      const res = await DELETE(new Request("http://localhost/api/notifications?id=n-1", {
        method: "DELETE",
        headers: headers(uid),
      }));
      expect(res?.status).toBe(200);
      const json = await res!.json() as { success: boolean; deleted: string };
      expect(json.success).toBe(true);
      expect(json.deleted).toBe("n-1");
      expect(mocks.deleteNotification).toHaveBeenCalledWith("id", "n-1");
      expect(mocks.deleteNotification).toHaveBeenCalledWith("recipient_id", uid);
    });

    it("clears read notifications when scope=read", async () => {
      const res = await DELETE(new Request("http://localhost/api/notifications?scope=read", {
        method: "DELETE",
        headers: headers(uid),
      }));
      expect(res?.status).toBe(200);
      const json = await res!.json() as { success: boolean; scope: string };
      expect(json.success).toBe(true);
      expect(json.scope).toBe("read");
      expect(mocks.deleteNotification).toHaveBeenCalledWith("recipient_id", uid);
      expect(mocks.deleteNotification).toHaveBeenCalledWith("is_read", true);
    });

    it("clears all notifications when scope=all", async () => {
      const res = await DELETE(new Request("http://localhost/api/notifications?scope=all", {
        method: "DELETE",
        headers: headers(uid),
      }));
      expect(res?.status).toBe(200);
      const json = await res!.json() as { success: boolean; scope: string };
      expect(json.success).toBe(true);
      expect(json.scope).toBe("all");
      expect(mocks.deleteNotification).toHaveBeenCalledWith("recipient_id", uid);
    });

    it("returns 400 when missing id and invalid scope", async () => {
      const res = await DELETE(new Request("http://localhost/api/notifications?scope=invalid", {
        method: "DELETE",
        headers: headers(uid),
      }));
      expect(res?.status).toBe(400);
    });
  });
});
