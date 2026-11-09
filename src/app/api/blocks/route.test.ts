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
const uuid2 = "22345678-1234-4234-8234-123456789abc";
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

import { DELETE, POST } from "./route";

const call = (method: "POST" | "DELETE", body?: unknown, h = headers(), qs = "") =>
  (method === "POST" ? POST : DELETE)(new Request(`http://localhost/api/blocks${qs}`, { method, headers: h, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }));

describe.each(["POST", "DELETE"] as const)("%s /api/blocks", (method) => {
  const CALL = (h: Record<string, string>) => call(method, { targetUserId: uuid2 }, h);
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

  it("400 on invalid target or over-long reason", async () => {
    expect((await call(method, { targetUserId: "nope" })).status).toBe(400);
    expect((await call(method, { targetUserId: uuid2, reason: "r".repeat(501) })).status).toBe(400);
    expect((await call(method)).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("calls set_user_block with the right flag", async () => {
    mocks.rpc.mockResolvedValue({ data: { targetUserId: uuid2, blocked: method === "POST" }, error: null });
    const r = await call(method, { targetUserId: uuid2, reason: " spam " });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ targetUserId: uuid2, blocked: method === "POST" });
    expect(mocks.rpc).toHaveBeenCalledWith("set_user_block", { p_target_user_id: uuid2, p_blocked: method === "POST", p_reason: "spam" });
  });
  it.each([["42501", 403], ["22023", 400], ["XX000", 503]])("maps rpc %s to %i", async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } });
    expect((await call(method, { targetUserId: uuid2 })).status).toBe(status);
  });
});

describe("DELETE /api/blocks query param", () => {
  it("accepts ?targetUserId= without a body", async () => {
    mocks.rpc.mockResolvedValue({ data: { blocked: false }, error: null });
    const r = await call("DELETE", undefined, headers(), `?targetUserId=${uuid2}`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ targetUserId: uuid2, blocked: false });
    expect(mocks.rpc).toHaveBeenCalledWith("set_user_block", { p_target_user_id: uuid2, p_blocked: false, p_reason: null });
  });

  it("falls back to ?targetUserId= when the body has a non-string targetUserId", async () => {
    mocks.rpc.mockResolvedValue({ data: { blocked: false }, error: null });
    const r = await call("DELETE", { targetUserId: 123 }, headers(), `?targetUserId=${uuid2}`);
    expect(r.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("set_user_block", { p_target_user_id: uuid2, p_blocked: false, p_reason: null });
  });
});
