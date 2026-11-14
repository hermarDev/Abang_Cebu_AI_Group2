import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  rpc: vi.fn(),
  createSignedUrls: vi.fn(),
  createUser: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: { from: () => ({ createSignedUrls: mocks.createSignedUrls }) },
    auth: { admin: { createUser: mocks.createUser } },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
}) }));
import { GET, POST } from "./route";
import { adminAccountsLimiter } from "@/server/admin-access";

function setup() {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: false }, error: null });
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  mocks.createSignedUrls.mockResolvedValue({ data: [], error: null });
  mocks.createUser.mockResolvedValue({ data: { user: { id: "new-user-1" } }, error: null });
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

beforeEach(() => { setup(); adminAccountsLimiter.reset(); });
const get = (qs = "", headers: Record<string, string> | undefined = H) => GET(new Request("http://localhost/api/admin/accounts" + qs, { headers }));
const valid = { targetUserId: A, operationId: B, suspend: true, reason: " Abusive behaviour ", unpublishListings: true };
const post = (body: unknown, headers: Record<string, string> | undefined = H) => POST(new Request("http://localhost/api/admin/accounts", { method: "POST", headers, body: JSON.stringify(body) }));

describe("GET /api/admin/accounts", () => {
  guardCases((headers) => get("", headers));
  it.each(["?role=owner", "?status=banned", "?limit=0"])("400 for %s", async (qs) => {
    expect((await get(qs)).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("200 with accounts and mapped filters", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ id: A }], error: null });
    const res = await get("?role=landlord&status=suspended&search=%20ann%20&limit=5&offset=2");
    expect(await res.json()).toEqual({ accounts: [{ id: A }] });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_list_accounts", { p_role: "landlord", p_suspended: true, p_search: "ann", p_limit: 5, p_offset: 2 });
    await get("?status=active");
    expect(mocks.rpc).toHaveBeenLastCalledWith("admin_list_accounts", { p_role: null, p_suspended: false, p_search: null, p_limit: 50, p_offset: 0 });
  });
  it("503 on rpc error", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    expect((await get()).status).toBe(503);
  });
});

describe("POST /api/admin/accounts", () => {
  guardCases((headers) => post(valid, headers));
  it.each([[{ ...valid, targetUserId: "x" }], [{ ...valid, operationId: "x" }], [{ ...valid, suspend: "yes" }]])("400 invalid %j", async (body) => {
    expect((await post(body)).status).toBe(400);
  });
  it.each([[undefined], ["  "], ["abcd"], ["x".repeat(1001)]])("400 for bad reason %j", async (reason) => {
    const res = await post({ ...valid, reason });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Provide a reason of at least 5 characters.");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("200 and passes trimmed reason; unpublishListings defaults true", async () => {
    mocks.rpc.mockResolvedValue({ data: { id: A, isSuspended: true }, error: null });
    const res = await post({ ...valid, unpublishListings: undefined });
    expect(await res.json()).toEqual({ account: { id: A, isSuspended: true } });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_set_account_suspension", { p_target_user_id: A, p_operation_id: B, p_suspend: true, p_reason: "Abusive behaviour", p_unpublish_listings: true });
    await post({ ...valid, unpublishListings: false });
    expect(mocks.rpc.mock.calls[1][1].p_unpublish_listings).toBe(false);
  });
  it.each([["42501", 403], ["23505", 409], ["40001", 409], ["22023", 400], ["XX000", 503]])("maps rpc %s to %i", async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } });
    expect((await post(valid)).status).toBe(status);
  });
  it("429 after 60 actions", async () => {
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
    for (let i = 0; i < 60; i++) expect((await post(valid)).status).toBe(200);
    const res = await post(valid);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  describe("staff creation (action = create_staff)", () => {
    const validStaff = {
      action: "create_staff",
      operationId: B,
      role: "verification_officer",
      fullName: "Officer Jane Doe",
      email: "jane.doe@example.com",
      password: "StrongPassword123!",
    };

    it("returns 400 for missing or invalid staff fields", async () => {
      const res = await post({ ...validStaff, email: "not-an-email" });
      expect(res.status).toBe(400);
      expect(mocks.createUser).not.toHaveBeenCalled();
    });

    it("returns 400 for password less than 8 chars", async () => {
      const res = await post({ ...validStaff, password: "short" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid role", async () => {
      const res = await post({ ...validStaff, role: "admin" });
      expect(res.status).toBe(400);
    });

    it("creates staff user and assigns role via RPC", async () => {
      mocks.rpc.mockResolvedValue({ data: { success: true }, error: null });
      const res = await post(validStaff);
      expect(res.status).toBe(200);
      expect(mocks.createUser).toHaveBeenCalledWith({
        email: "jane.doe@example.com",
        password: "StrongPassword123!",
        email_confirm: true,
        user_metadata: { full_name: "Officer Jane Doe", role: "verification_officer" },
      });
      expect(mocks.rpc).toHaveBeenCalledWith("admin_assign_staff_role", {
        p_target_user_id: "new-user-1",
        p_operation_id: B,
        p_role: "verification_officer",
        p_full_name: "Officer Jane Doe",
      });
    });

    it("returns 400 when auth.admin.createUser fails", async () => {
      mocks.createUser.mockResolvedValue({
        data: null,
        error: { message: "A user with this email address already exists" },
      });
      const res = await post(validStaff);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("A user with this email address already exists");
    });
  });
});
