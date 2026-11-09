import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), rpc: vi.fn(), createSignedUrls: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ storage: { from: () => ({ createSignedUrls: mocks.createSignedUrls }) } }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
}) }));
import { POST } from "./route";
import { adminLifecycleLimiter } from "@/server/admin-access";

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

beforeEach(() => { setup(); adminLifecycleLimiter.reset(); });
const valid = { propertyId: A, operationId: B, action: "unpublish", reason: "  Policy violation  " };
const post = (body: unknown, headers: Record<string, string> | undefined = H) => POST(new Request("http://localhost/api/admin/properties/lifecycle", { method: "POST", headers, body: JSON.stringify(body) }));

describe("POST /api/admin/properties/lifecycle", () => {
  guardCases((headers) => post(valid, headers));
  it.each([[{ ...valid, propertyId: "x" }], [{ ...valid, operationId: "x" }], [{ ...valid, action: "delete" }]])("400 invalid request %j", async (body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid property lifecycle request.");
  });
  it.each([[undefined], ["   "], ["abcd"], ["x".repeat(1001)], [5]])("400 for bad reason %j", async (reason) => {
    const res = await post({ ...valid, reason });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Provide a reason of at least 5 characters.");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("200 and trims reason", async () => {
    mocks.rpc.mockResolvedValue({ data: { propertyId: A, status: "archived", extra: 1 }, error: null });
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ propertyId: A, status: "archived" });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_set_property_lifecycle", { p_property_id: A, p_operation_id: B, p_action: "unpublish", p_reason: "Policy violation" });
  });
  it.each([["23505", 409], ["40001", 409], ["42501", 403], ["22023", 400], ["XX000", 503]])("maps rpc %s to %i", async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } });
    expect((await post(valid)).status).toBe(status);
  });
  it("429 after 60 actions", async () => {
    mocks.rpc.mockResolvedValue({ data: { propertyId: A, status: "archived" }, error: null });
    for (let i = 0; i < 60; i++) expect((await post(valid)).status).toBe(200);
    const res = await post(valid);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect((await res.json()).retryAfterSeconds).toBeGreaterThan(0);
  });
});
