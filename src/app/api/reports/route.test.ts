import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/profile-avatar", () => ({ signProfileAvatar: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
}) }));
import { POST } from "./route";

let uid = "u";
let n = 0;
let ip = 0;
const A = "12345678-1234-4234-8234-123456789abc";
const B = "22345678-1234-4234-8234-123456789abc";
const C = "32345678-1234-4234-8234-123456789abc";
const headers = (...args: [expected?: string]): Record<string, string> => ({
  "content-type": "application/json", "x-forwarded-for": `10.1.0.${++ip}`,
  ...(args.length === 0 ? { "x-expected-user-id": uid } : args[0] === undefined ? {} : { "x-expected-user-id": args[0] }),
});
const valid = { operationId: A, targetType: "message", conversationId: B, messageId: C, category: "harassment", details: "  Threatening messages about the deposit  ", blockUser: true };
const post = (body: unknown, h = headers()) => POST(new Request("http://localhost/api/reports", { method: "POST", headers: h, body: JSON.stringify(body) }));

beforeEach(() => {
  vi.resetAllMocks();
  uid = `reporter-${++n}`;
  mocks.getUser.mockResolvedValue({ data: { user: { id: uid } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "renter", is_suspended: false }, error: null });
  mocks.rpc.mockResolvedValue({ data: { reportId: "r1", status: "open", blocked: true, replayed: false }, error: null });
});

describe("POST /api/reports", () => {
  it("401 when signed out", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await post(valid)).status).toBe(401);
  });
  it.each([["mismatched", "other"], ["missing", undefined]])("409 on %s expected user", async (_n, expected) => {
    expect((await post(valid, headers(expected))).status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([[{ role: "renter", is_suspended: true }], [{ role: "admin", is_suspended: false }], [null]])("403 for suspended, admin or missing profile %#", async (profile) => {
    mocks.profile.mockResolvedValue({ data: profile, error: null });
    expect((await post(valid)).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([
    ["bad operation id", { ...valid, operationId: "x" }],
    ["bad target type", { ...valid, targetType: "user" }],
    ["bad category", { ...valid, category: "rude" }],
    ["short details", { ...valid, details: "too short" }],
    ["long details", { ...valid, details: "x".repeat(1001) }],
    ["non-string details", { ...valid, details: 12 }],
    ["bad conversation id", { ...valid, conversationId: "x" }],
    ["bad message id", { ...valid, messageId: "x" }],
    ["bad listing id", { ...valid, listingId: "x" }],
  ])("400 on %s", async (_n, body) => {
    expect((await post(body)).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("201 with trimmed details and block flag; accepts blockCounterpart alias", async () => {
    const r = await post(valid);
    expect(r.status).toBe(201);
    expect(await r.json()).toEqual({ reportId: "r1", status: "open", blocked: true, replayed: false });
    expect(mocks.rpc).toHaveBeenCalledWith("submit_abuse_report", {
      p_operation_id: A, p_target_type: "message", p_conversation_id: B, p_message_id: C, p_listing_id: null,
      p_category: "harassment", p_details: "Threatening messages about the deposit", p_block_counterpart: true,
    });
    await post({ ...valid, blockUser: undefined, blockCounterpart: true });
    expect(mocks.rpc.mock.calls[1][1].p_block_counterpart).toBe(true);
    await post({ ...valid, blockUser: undefined });
    expect(mocks.rpc.mock.calls[2][1].p_block_counterpart).toBe(false);
  });
  it("200 when replayed", async () => {
    mocks.rpc.mockResolvedValue({ data: { reportId: "r1", status: "open", blocked: false, replayed: true }, error: null });
    const r = await post(valid);
    expect(r.status).toBe(200);
    expect((await r.json()).replayed).toBe(true);
  });
  it.each([["23505", 409], ["42501", 403], ["22023", 400], ["XX000", 503]])("maps rpc %s to %i", async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } });
    expect((await post(valid)).status).toBe(status);
  });
  it("429 with Retry-After after 10 reports", async () => {
    uid = "rate-limited";
    mocks.getUser.mockResolvedValue({ data: { user: { id: uid } }, error: null });
    for (let i = 0; i < 10; i++) expect((await post(valid, headers(uid))).status).toBe(201);
    const r = await post(valid, headers(uid));
    expect(r.status).toBe(429);
    expect(Number(r.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});
