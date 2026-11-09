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
const overview = { pendingReviewCount: 2, approvedLiveCount: 3, changesRequestedCount: 1, archivedListingCount: 0, activeRenterCount: 5, activeLandlordCount: 2, suspendedAccountCount: 1, openReportCount: 0, recentAuditEntries: [] };

describe("GET /api/admin/overview", () => {
  guardCases((headers) => GET(new Request("http://localhost/api/admin/overview", { headers })));
  it("200 with overview", async () => {
    mocks.rpc.mockResolvedValue({ data: overview, error: null });
    const res = await GET(new Request("http://localhost/api/admin/overview", { headers: H }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ overview });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_dashboard_overview", undefined);
  });
  it.each([[() => Promise.resolve({ data: null, error: { message: "secret db detail" } })], [() => Promise.reject(new Error("secret db detail"))]])("503 without leaking details", async (impl) => {
    mocks.rpc.mockImplementation(impl);
    const res = await GET(new Request("http://localhost/api/admin/overview", { headers: H }));
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});
