import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), rpc: vi.fn(), createSignedUrls: vi.fn(), signAvatar: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ storage: { from: () => ({ createSignedUrls: mocks.createSignedUrls }) } }) }));
vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: mocks.signAvatar }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  rpc: mocks.rpc,
  from: (table: string) => {
    if (table === "profiles") return { select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) };
    throw new Error(`Unexpected table ${table}`);
  },
}) }));

const uid = "account-b";
let ipCounter = 0; // unique IP per request so the in-memory rate limiter only trips in the 429 tests
const headers = (...args: [expected?: string]): Record<string, string> => ({
  "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ipCounter}`,
  ...(args.length === 0 ? { "x-expected-user-id": uid } : args[0] === undefined ? {} : { "x-expected-user-id": args[0] }),
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: uid } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "renter", is_suspended: false }, error: null });
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  mocks.createSignedUrls.mockResolvedValue({ data: [], error: null });
  mocks.signAvatar.mockResolvedValue(null);
});

import { GET } from "./route";
const CALL = (h: Record<string, string>) => GET(new Request("http://localhost/api/messages/unread-count", { headers: h }));

describe("GET /api/messages/unread-count", () => {

  it("401 when signed out", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const r = await CALL(headers());
    expect(r.status).toBe(401);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
  });
  it.each([["mismatched", "account-a"], ["missing", undefined]])("409 on %s expected user before any query", async (_n, expected) => {
    const r = await CALL(headers(expected));
    expect(r.status).toBe(409);
    expect(mocks.profile).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("503 when the profile lookup fails", async () => {
    mocks.profile.mockResolvedValue({ data: null, error: { message: "x" } });
    expect((await CALL(headers())).status).toBe(503);
  });
  it.each([[{ role: "renter", is_suspended: true }], [{ role: "admin", is_suspended: false }], [null]])("403 for suspended, admin or missing profile %#", async (profile) => {
    mocks.profile.mockResolvedValue({ data: profile, error: null });
    expect((await CALL(headers())).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns the unread count", async () => {
    mocks.rpc.mockResolvedValue({ data: 4, error: null });
    const r = await CALL(headers());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ unreadCount: 4 });
    expect(mocks.rpc).toHaveBeenCalledWith("get_unread_rental_message_count");
  });
  it("coerces bad data to 0 and lets landlords in", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "landlord", is_suspended: false }, error: null });
    mocks.rpc.mockResolvedValue({ data: -3, error: null });
    expect(await (await CALL(headers())).json()).toEqual({ unreadCount: 0 });
  });
  it("503 when the rpc fails", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    expect((await CALL(headers())).status).toBe(503);
  });
});
