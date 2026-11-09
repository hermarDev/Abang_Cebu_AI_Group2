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

import { GET, POST } from "./route";

const path = `${uuid}/${uuid}/${uuid}/${"a".repeat(64)}.jpg`;
const thread = (over: Record<string, unknown> = {}) => ({
  id: uuid, listingPhotoPath: path,
  counterpart: { id: uuid2, fullName: "Ana", avatarUrl: `${uuid2}/a.png`, email: "leak@x.com", phone_number: "0917", phoneNumber: "0917" },
  ...over,
});
const get = (h: Record<string, string>, qs = "") => GET(new Request(`http://localhost/api/messages/threads${qs}`, { headers: h }));

describe("GET /api/messages/threads", () => {
  const CALL = get;
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

  it("signs thumbnails and avatars and leaks no contact details or raw paths", async () => {
    mocks.rpc.mockResolvedValue({ data: [thread(), thread({ id: uuid2, listingPhotoPath: "https://cdn.example/p.jpg" }), thread({ listingPhotoPath: "../etc/passwd" })], error: null });
    mocks.createSignedUrls.mockResolvedValue({ data: [{ path, signedUrl: "https://signed.example/t.jpg" }], error: null });
    mocks.signAvatar.mockResolvedValue("https://signed.example/a.png");
    const r = await get(headers(), "?archived=true");
    const { threads } = await r.json();
    expect(r.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("list_rental_conversations", { p_include_archived: true });
    expect(mocks.createSignedUrls).toHaveBeenCalledWith([path], 3600);
    expect(threads.map((t: { listingThumbnailUrl: string | null }) => t.listingThumbnailUrl)).toEqual(["https://signed.example/t.jpg", "https://cdn.example/p.jpg", null]);
    expect(threads.map((t: { listingPhotoUrl: string | null }) => t.listingPhotoUrl)).toEqual(["https://signed.example/t.jpg", "https://cdn.example/p.jpg", null]);
    expect(threads[0].counterpart).toEqual({ id: uuid2, fullName: "Ana", avatarUrl: "https://signed.example/a.png" });
    expect(threads[0]).not.toHaveProperty("listingPhotoPath");
    expect(JSON.stringify(threads)).not.toMatch(/leak@x\.com|0917/);
  });
  it("degrades to null thumbnail when signing throws", async () => {
    mocks.rpc.mockResolvedValue({ data: [thread()], error: null });
    mocks.createSignedUrls.mockRejectedValue(new Error("boom"));
    const { threads } = await (await get(headers())).json();
    expect(threads[0].listingThumbnailUrl).toBeNull();
  });
  it("defaults to non-archived and lets landlords list", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "landlord", is_suspended: false }, error: null });
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    expect((await get(headers())).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("list_rental_conversations", { p_include_archived: false });
  });
});

const post = (body: unknown, h = headers()) => POST(new Request("http://localhost/api/messages/threads", { method: "POST", headers: h, body: JSON.stringify(body) }));
const valid = { listingId: uuid, operationId: uuid2, body: "  Is it available?  " };

describe("POST /api/messages/threads", () => {
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

  it("403 when a landlord starts an inquiry", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "landlord", is_suspended: false }, error: null });
    const r = await post(valid);
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: "Only renter accounts can start a listing inquiry." });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([
    ["bad listing", { ...valid, listingId: "nope" }],
    ["bad operation", { ...valid, operationId: "nope" }],
    ["empty body", { ...valid, body: "   " }],
    ["long body", { ...valid, body: "x".repeat(2001) }],
    ["non-string body", { ...valid, body: 5 }],
  ])("400 on %s", async (_n, body) => {
    expect((await post(body)).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("201 with trimmed body, 200 when replayed", async () => {
    mocks.rpc.mockResolvedValue({ data: { conversationId: "c", messageId: "m", createdAt: "t" }, error: null });
    const r = await post(valid);
    expect(r.status).toBe(201);
    expect(await r.json()).toEqual({ conversationId: "c", messageId: "m", createdAt: "t", replayed: false });
    expect(mocks.rpc).toHaveBeenCalledWith("send_initial_rental_inquiry", { p_listing_id: uuid, p_operation_id: uuid2, p_body: "Is it available?" });
    mocks.rpc.mockResolvedValue({ data: { conversationId: "c", messageId: "m", createdAt: "t", replayed: true }, error: null });
    const again = await post(valid);
    expect(again.status).toBe(200);
    expect((await again.json()).replayed).toBe(true);
  });
  it.each([["23505", 409], ["42501", 403], ["22023", 404], ["XX000", 503]])("maps rpc %s to %i (blocked/unpublished -> 403)", async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } });
    expect((await post(valid)).status).toBe(status);
  });
  it.each([
    ["cannot message your own listing", 400, "You cannot message your own listing."],
    ["only active renters can send inquiries", 403, "Only active renters can send inquiries."],
    ["listing is not publicly available", 403, "This listing is not currently available for inquiries."],
    ["landlord account is unavailable", 403, "The landlord account is currently unavailable."],
    ["conversation is blocked", 403, "You cannot message this user."],
  ])("passes through descriptive error for '%s'", async (msg, status, expectedError) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: msg } });
    const r = await post(valid);
    expect(r.status).toBe(status);
    expect(await r.json()).toEqual({ error: expectedError });
  });
  it("429 with Retry-After after 10 inquiries", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "rate-limited-user" } }, error: null });
    mocks.rpc.mockResolvedValue({ data: { conversationId: "c", messageId: "m", createdAt: "t" }, error: null });
    const h = headers("rate-limited-user");
    for (let i = 0; i < 10; i++) expect((await post(valid, h)).status).toBe(201);
    const r = await post(valid, h);
    expect(r.status).toBe(429);
    expect(Number(r.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});
