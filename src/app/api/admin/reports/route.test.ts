import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
}) }));
import { GET } from "./route";

const H = { "x-expected-user-id": "admin-1" };
const get = (qs = "", headers: Record<string, string> = H) => GET(new Request("http://localhost/api/admin/reports" + qs, { headers }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: false }, error: null });
  mocks.rpc.mockResolvedValue({ data: [], error: null });
});

describe("GET /api/admin/reports", () => {
  it("401 unauthenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await get()).status).toBe(401);
  });
  it("409 on user mismatch", async () => expect((await get("", { "x-expected-user-id": "x" })).status).toBe(409));
  it.each(["renter", "landlord"])("403 for %s", async (role) => {
    mocks.profile.mockResolvedValue({ data: { role, is_suspended: false }, error: null });
    expect((await get()).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(["?status=bogus", "?limit=0", "?offset=-1"])("400 for %s", async (qs) => {
    expect((await get(qs)).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("200 with reports and mapped filters", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: "r1" }], error: null });
    expect(await (await get("?status=resolved&limit=5&offset=2")).json()).toEqual({ reports: [{ id: "r1" }] });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_list_abuse_reports", { p_status: "resolved", p_limit: 5, p_offset: 2 });
    await get();
    expect(mocks.rpc).toHaveBeenLastCalledWith("admin_list_abuse_reports", { p_status: null, p_limit: 50, p_offset: 0 });
  });
  it("403 for rpc 42501 and 503 for other errors", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    expect((await get()).status).toBe(403);
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    expect((await get()).status).toBe(503);
  });
});
