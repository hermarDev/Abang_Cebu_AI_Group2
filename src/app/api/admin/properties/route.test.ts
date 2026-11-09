import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), rpc: vi.fn(), createSignedUrls: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ storage: { from: () => ({ createSignedUrls: mocks.createSignedUrls }) } }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
}) }));
import { GET } from "./route";

function setup() {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: false }, error: null });
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  mocks.createSignedUrls.mockResolvedValue({ data: [], error: null });
}
const guardCases = (call: (headers?: Record<string, string>) => Promise<Response>) => {
  it("401 unauthenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await call({ "x-expected-user-id": "admin-1" })).status).toBe(401);
  });
  it("409 on user mismatch", async () => expect((await call({ "x-expected-user-id": "other" })).status).toBe(409));
  it.each(["renter", "landlord"])("403 for %s", async (role) => {
    mocks.profile.mockResolvedValue({ data: { role, is_suspended: false }, error: null });
    expect((await call({ "x-expected-user-id": "admin-1" })).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("403 for suspended admin", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: true }, error: null });
    expect((await call({ "x-expected-user-id": "admin-1" })).status).toBe(403);
  });
};
const H = { "x-expected-user-id": "admin-1" };
const A = "12345678-1234-4234-8234-123456789abc";
const B = "22345678-1234-4234-8234-123456789abc";

beforeEach(setup);
const get = (qs = "", headers: Record<string, string> | undefined = H) => GET(new Request("http://localhost/api/admin/properties" + qs, { headers }));
const p = (ext: string, n = 1) => `${A}/${B}/${A}/${String(n).repeat(64)}.${ext}`;

describe("GET /api/admin/properties", () => {
  guardCases((headers) => get("", headers));
  it("400 on invalid status", async () => {
    expect((await get("?status=bogus")).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("passes filters to the rpc", async () => {
    await get("?status=all&search=%20abc%20&limit=10&offset=5");
    expect(mocks.rpc).toHaveBeenCalledWith("admin_list_properties", { p_status: null, p_search: "abc", p_limit: 10, p_offset: 5 });
    await get("?status=pending");
    expect(mocks.rpc).toHaveBeenLastCalledWith("admin_list_properties", { p_status: "pending", p_search: null, p_limit: 50, p_offset: 0 });
  });
  it("signs photo and permit paths once and attaches urls", async () => {
    const photo = p("jpg"), permit = p("pdf", 2);
    mocks.rpc.mockResolvedValue({ data: [{ id: "x", photoPaths: [photo, "bad/path.jpg", p("pdf", 3)], permitPaths: [permit, photo] }], error: null });
    mocks.createSignedUrls.mockResolvedValue({ data: [{ path: photo, signedUrl: "https://s/photo" }, { path: permit, signedUrl: "https://s/permit" }], error: null });
    const res = await get();
    expect(res.status).toBe(200);
    expect(mocks.createSignedUrls).toHaveBeenCalledTimes(1);
    expect(mocks.createSignedUrls.mock.calls[0][1]).toBe(900);
    expect(mocks.createSignedUrls.mock.calls[0][0].sort()).toEqual([photo, permit].sort());
    const { properties } = await res.json();
    expect(properties[0].photoUrls).toEqual(["https://s/photo"]);
    expect(properties[0].permitUrls).toEqual(["https://s/permit", "https://s/photo"]);
  });
  it("degrades to empty urls when signing throws", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: "x", photoPaths: [p("jpg")], permitPaths: [] }], error: null });
    mocks.createSignedUrls.mockRejectedValue(new Error("boom"));
    const res = await get();
    expect(res.status).toBe(200);
    expect((await res.json()).properties[0]).toMatchObject({ photoUrls: [], permitUrls: [] });
  });
  it("503 on rpc error", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    expect((await get()).status).toBe(503);
  });
});
