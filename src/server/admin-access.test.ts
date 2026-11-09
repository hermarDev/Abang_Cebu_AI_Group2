import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
}) }));
import { noStoreHeaders, requireActiveAdmin } from "./admin-access";

const req = (id?: string) => new Request("http://localhost/api/admin/x", { headers: id ? { "x-expected-user-id": id } : {} });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: false }, error: null });
});

describe("requireActiveAdmin", () => {
  it("exports no-store headers", () => expect(noStoreHeaders).toEqual({ "Cache-Control": "no-store" }));
  it("401 when unauthenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const r = await requireActiveAdmin(req("admin-1"));
    expect(r.response?.status).toBe(401);
    expect(r.response?.headers.get("Cache-Control")).toBe("no-store");
  });
  it.each([["mismatch", "other"], ["absent", undefined]])("409 on %s expected user", async (_n, id) => {
    const r = await requireActiveAdmin(req(id));
    expect(r.response?.status).toBe(409);
    expect(mocks.profile).not.toHaveBeenCalled();
  });
  it("503 when profile lookup fails", async () => {
    mocks.profile.mockResolvedValue({ data: null, error: { message: "x" } });
    const r = await requireActiveAdmin(req("admin-1"));
    expect(r.response?.status).toBe(503);
  });
  it.each([[{ role: "renter", is_suspended: false }], [{ role: "landlord", is_suspended: false }], [{ role: "admin", is_suspended: true }], [null]])("403 for %j", async (profile) => {
    mocks.profile.mockResolvedValue({ data: profile, error: null });
    const r = await requireActiveAdmin(req("admin-1"));
    expect(r.response?.status).toBe(403);
  });
  it("returns session for an active admin", async () => {
    const r = await requireActiveAdmin(req("admin-1"));
    expect(r.user?.id).toBe("admin-1");
  });
});
