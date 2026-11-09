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

beforeEach(setup);
const get = (qs = "", headers: Record<string, string> | undefined = H) => GET(new Request("http://localhost/api/admin/audit" + qs, { headers }));

describe("GET /api/admin/audit", () => {
  guardCases((headers) => get("", headers));
  it("400 on invalid targetType / limit", async () => {
    expect((await get("?targetType=nope")).status).toBe(400);
    expect((await get("?limit=0")).status).toBe(400);
    expect((await get("?limit=101")).status).toBe(400);
    expect((await get("?offset=-1")).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("200 with entries and defaults", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: 1 }], error: null });
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ entries: [{ id: 1 }] });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_list_audit_logs", { p_target_type: null, p_limit: 50, p_offset: 0 });
  });
  it("passes filters", async () => {
    await get("?targetType=account&limit=10&offset=20");
    expect(mocks.rpc).toHaveBeenCalledWith("admin_list_audit_logs", { p_target_type: "account", p_limit: 10, p_offset: 20 });
  });
  it("503 on rpc error", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    expect((await get()).status).toBe(503);
  });
});
