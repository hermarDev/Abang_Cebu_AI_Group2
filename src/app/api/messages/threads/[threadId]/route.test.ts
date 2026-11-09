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

let uid = "account-b"; // fresh actor per test so the in-memory rate limiter only trips in the 429 tests
let actorCounter = 0;
const uuid = "12345678-1234-4234-8234-123456789abc";
const uuid2 = "22345678-1234-4234-8234-123456789abc";
let ipCounter = 0; // unique IP per request so the in-memory rate limiter only trips in the 429 tests
const headers = (...args: [expected?: string]): Record<string, string> => ({
  "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ipCounter}`,
  ...(args.length === 0 ? { "x-expected-user-id": uid } : args[0] === undefined ? {} : { "x-expected-user-id": args[0] }),
});

beforeEach(() => {
  vi.resetAllMocks();
  uid = `account-b-${++actorCounter}`;
  mocks.getUser.mockResolvedValue({ data: { user: { id: uid } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "renter", is_suspended: false }, error: null });
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  mocks.createSignedUrls.mockResolvedValue({ data: [], error: null });
  mocks.signAvatar.mockResolvedValue(null);
});

import { GET, PATCH, POST } from "./route";

const ctx = (threadId = uuid) => ({ params: Promise.resolve({ threadId }) });
const url = (qs = "") => `http://localhost/api/messages/threads/${uuid}${qs}`;
const get = (h: Record<string, string>, qs = "", id = uuid) => GET(new Request(url(qs), { headers: h }), ctx(id));
const post = (body: unknown, h = headers(), id = uuid) => POST(new Request(url(), { method: "POST", headers: h, body: JSON.stringify(body) }), ctx(id));
const patch = (body: unknown, h = headers(), id = uuid) => PATCH(new Request(url(), { method: "PATCH", headers: h, body: JSON.stringify(body) }), ctx(id));
const path = `${uuid}/${uuid}/${uuid}/${"b".repeat(64)}.webp`;
const detail = { thread: { id: uuid, listingPhotoPath: path, counterpart: { id: uuid2, avatarUrl: `${uuid2}/a.png`, email: "leak@x.com", phone_number: "0917" } }, messages: [{ id: "m1" }], hasMore: true };

describe("GET /api/messages/threads/[threadId]", () => {
  const CALL = (h: Record<string, string>) => get(h);
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

  it("400 on invalid id, limit or cursor", async () => {
    expect((await get(headers(), "", "nope")).status).toBe(400);
    expect((await get(headers(), "?limit=0")).status).toBe(400);
    expect((await get(headers(), "?limit=101")).status).toBe(400);
    expect((await get(headers(), "?before=garbage")).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("returns an enriched thread, marks read, and leaks nothing", async () => {
    mocks.rpc.mockImplementation(async (fn: string) => (fn === "get_rental_conversation_detail" ? { data: detail, error: null } : { data: {}, error: null }));
    mocks.createSignedUrls.mockResolvedValue({ data: [{ path, signedUrl: "https://signed.example/t.webp" }], error: null });
    mocks.signAvatar.mockResolvedValue("https://signed.example/a.png");
    const r = await get(headers());
    const body = await r.json();
    expect(r.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("get_rental_conversation_detail", { p_conversation_id: uuid, p_before: null, p_limit: 50 });
    expect(mocks.rpc).toHaveBeenCalledWith("mark_rental_conversation_read", { p_conversation_id: uuid });
    expect(body).toMatchObject({ messages: [{ id: "m1" }], hasMore: true, thread: { listingThumbnailUrl: "https://signed.example/t.webp", listingPhotoUrl: "https://signed.example/t.webp", counterpart: { avatarUrl: "https://signed.example/a.png" } } });
    expect(JSON.stringify(body)).not.toMatch(/leak@x\.com|0917|listingPhotoPath/);
  });
  it("does not mark read when paging and ignores mark_read failure", async () => {
    mocks.rpc.mockResolvedValue({ data: detail, error: null });
    await get(headers(), "?before=2026-01-01T00:00:00Z&limit=10");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("get_rental_conversation_detail", { p_conversation_id: uuid, p_before: "2026-01-01T00:00:00Z", p_limit: 10 });
    mocks.rpc.mockImplementation(async (fn: string) => { if (fn === "mark_rental_conversation_read") throw new Error("down"); return { data: detail, error: null }; });
    expect((await get(headers())).status).toBe(200);
  });
  it.each([["42501", 403], ["22023", 404], ["XX000", 503]])("maps rpc %s to %i", async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } });
    expect((await get(headers())).status).toBe(status);
  });
});

describe("POST /api/messages/threads/[threadId]", () => {
  const valid = { operationId: uuid2, body: " hi " };
  const CALL = (h: Record<string, string>) => post(valid, h);
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

  it.each([
    ["bad operation", { ...valid, operationId: "x" }],
    ["empty", { ...valid, body: "" }],
    ["too long", { ...valid, body: "y".repeat(2001) }],
  ])("400 on %s", async (_n, body) => {
    expect((await post(body)).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("400 on invalid thread id", async () => {
    expect((await post(valid, headers(), "nope")).status).toBe(400);
  });
  it("201 / 200 replay and passes trimmed body", async () => {
    mocks.rpc.mockResolvedValue({ data: { id: "m1" }, error: null });
    const r = await post(valid);
    expect(r.status).toBe(201);
    expect(await r.json()).toEqual({ message: { id: "m1" } });
    expect(mocks.rpc).toHaveBeenCalledWith("send_rental_message", {
      p_conversation_id: uuid,
      p_operation_id: uuid2,
      p_body: "hi",
      p_reply_to_message_id: null,
      p_attachments: [],
    });
    mocks.rpc.mockResolvedValue({ data: { id: "m1", replayed: true }, error: null });
    expect((await post(valid)).status).toBe(200);
  });
  it.each([["23505", 409], ["42501", 403], ["22023", 400], ["XX000", 503]])("maps rpc %s to %i (blocked -> 403)", async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } });
    expect((await post(valid)).status).toBe(status);
  });
  it("429 with Retry-After after 30 messages", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "chatty-user" } }, error: null });
    mocks.rpc.mockResolvedValue({ data: { id: "m1" }, error: null });
    const h = headers("chatty-user");
    for (let i = 0; i < 30; i++) expect((await post(valid, h)).status).toBe(201);
    const r = await post(valid, h);
    expect(r.status).toBe(429);
    expect(Number(r.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});

describe("PATCH /api/messages/threads/[threadId]", () => {
  const CALL = (h: Record<string, string>) => patch({ action: "mark_read" }, h);
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

  it("400 on bad action or thread id", async () => {
    expect((await patch({ action: "delete" })).status).toBe(400);
    expect((await patch({ action: "archive" }, headers(), "nope")).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([
    ["mark_read", "mark_rental_conversation_read", { p_conversation_id: uuid }],
    ["archive", "set_rental_conversation_archived", { p_conversation_id: uuid, p_archived: true }],
    ["unarchive", "set_rental_conversation_archived", { p_conversation_id: uuid, p_archived: false }],
  ])("%s calls %s", async (action, fn, args) => {
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
    const r = await patch({ action });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith(fn, args);
  });
  it.each([["42501", 403], ["22023", 400], ["XX000", 503]])("maps rpc %s to %i", async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } });
    expect((await patch({ action: "archive" })).status).toBe(status);
  });
});
