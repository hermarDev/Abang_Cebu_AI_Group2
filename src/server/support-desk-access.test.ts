import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
  }),
}));

import {
  noStoreHeaders,
  pageParams,
  readJsonObject,
  requireActiveSupportOrAdmin,
  supportDeskRpc,
  validReason,
  validUuid,
} from "./support-desk-access";

const req = (id?: string) =>
  new Request("http://localhost/api/support-desk/x", {
    headers: id ? { "x-expected-user-id": id } : {},
  });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "supp-1" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "customer_support", is_suspended: false }, error: null });
});

describe("requireActiveSupportOrAdmin", () => {
  it("exports no-store headers", () =>
    expect(noStoreHeaders).toEqual({ "Cache-Control": "no-store" }));

  it("401 when unauthenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const r = await requireActiveSupportOrAdmin(req("supp-1"));
    expect(r.response?.status).toBe(401);
    expect(r.response?.headers.get("Cache-Control")).toBe("no-store");
  });

  it.each([["mismatch", "other"], ["absent", undefined]])(
    "409 on %s expected user",
    async (_n, id) => {
      const r = await requireActiveSupportOrAdmin(req(id));
      expect(r.response?.status).toBe(409);
      expect(mocks.profile).not.toHaveBeenCalled();
    },
  );

  it("503 when profile lookup fails", async () => {
    mocks.profile.mockResolvedValue({ data: null, error: { message: "db error" } });
    const r = await requireActiveSupportOrAdmin(req("supp-1"));
    expect(r.response?.status).toBe(503);
  });

  it.each([
    [{ role: "renter", is_suspended: false }],
    [{ role: "landlord", is_suspended: false }],
    [{ role: "verification_officer", is_suspended: false }],
    [{ role: "customer_support", is_suspended: true }],
    [{ role: "admin", is_suspended: true }],
    [null],
  ])("403 for unauthorized profile %j", async (profile) => {
    mocks.profile.mockResolvedValue({ data: profile, error: null });
    const r = await requireActiveSupportOrAdmin(req("supp-1"));
    expect(r.response?.status).toBe(403);
  });

  it("returns session for active customer_support", async () => {
    const r = await requireActiveSupportOrAdmin(req("supp-1"));
    expect(r.user?.id).toBe("supp-1");
    expect(r.role).toBe("customer_support");
  });

  it("returns session for active admin", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: false }, error: null });
    const r = await requireActiveSupportOrAdmin(req("admin-1"));
    expect(r.user?.id).toBe("admin-1");
    expect(r.role).toBe("admin");
  });
});

describe("support-desk-access helpers", () => {
  it("validUuid validates correctly", () => {
    expect(validUuid("12345678-1234-4234-8234-123456789abc")).toBe(true);
    expect(validUuid("invalid-uuid")).toBe(false);
    expect(validUuid(null)).toBe(false);
  });

  it("validReason validates length correctly", () => {
    expect(validReason("Hello")).toBe(true);
    expect(validReason("Hi")).toBe(false);
    expect(validReason("   ")).toBe(false);
    expect(validReason(null)).toBe(false);
  });

  it("pageParams extracts limit and offset with bounds", () => {
    expect(pageParams(new URLSearchParams("limit=20&offset=10"))).toEqual({ limit: 20, offset: 10 });
    expect(pageParams(new URLSearchParams(""))).toEqual({ limit: 50, offset: 0 });
    expect(pageParams(new URLSearchParams("limit=999"))).toBeNull();
    expect(pageParams(new URLSearchParams("offset=-1"))).toBeNull();
  });

  it("readJsonObject parses valid JSON object", async () => {
    const valid = new Request("http://localhost", { method: "POST", body: JSON.stringify({ a: 1 }) });
    expect(await readJsonObject(valid)).toEqual({ a: 1 });
    const array = new Request("http://localhost", { method: "POST", body: JSON.stringify([1, 2]) });
    expect(await readJsonObject(array)).toBeNull();
    const bad = new Request("http://localhost", { method: "POST", body: "invalid" });
    expect(await readJsonObject(bad)).toBeNull();
  });

  it("supportDeskRpc handles valid and invalid client instances", async () => {
    expect(await supportDeskRpc(null, "support_desk_list_tickets")).toEqual({
      data: null,
      error: { message: "Invalid RPC client instance" },
    });
    const mockClient = { rpc: vi.fn().mockResolvedValue({ data: [{ id: "1" }], error: null }) };
    const res = await supportDeskRpc(mockClient, "support_desk_list_tickets", { p_status: "open" });
    expect(res).toEqual({ data: [{ id: "1" }], error: null });
    expect(mockClient.rpc).toHaveBeenCalledWith("support_desk_list_tickets", { p_status: "open" });
  });
});
