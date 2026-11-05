import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), list: vi.fn(), ownerFilter: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mocks.getUser },
  from: (table: string) => table === "profiles"
    ? { select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }
    : { select: () => ({ eq: mocks.ownerFilter }) },
  rpc: mocks.rpc,
}) }));
import { GET, POST, PATCH } from "./route";

const operationId = "12345678-1234-4234-8234-123456789abc";
const draftId = "87654321-1234-4234-8234-123456789abc";
const payload = { property: { title: "Example" }, unit: {} };
function request(method: string, owner?: string, body?: unknown) {
  return new Request("http://localhost/api/property-drafts", { method, headers: { "content-type": "application/json", ...(owner ? { "x-expected-user-id": owner } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-b" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "landlord", is_suspended: false }, error: null });
  mocks.ownerFilter.mockReturnValue({ order: mocks.list });
  mocks.list.mockResolvedValue({ data: [], error: null });
  mocks.rpc.mockResolvedValue({ data: draftId, error: null });
});
describe("property draft account binding", () => {
  it.each([["GET", GET], ["POST", POST], ["PATCH", PATCH]] as const)("rejects stale or absent owner for %s before any draft operation", async (method, handler) => {
    for (const owner of ["owner-a", undefined]) {
      const response = await handler(request(method, owner));
      expect(response.status).toBe(409);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(mocks.profile).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("lists only after checking the active landlord", async () => {
    const response = await GET(request("GET", "owner-b"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ drafts: [] });
    expect(mocks.ownerFilter).toHaveBeenCalledWith("owner_id", "owner-b");
  });
  it("creates with the exact stable operation id and payload", async () => {
    const response = await POST(request("POST", "owner-b", { operationId, payload }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("save_property_draft", { p_operation_id: operationId, p_payload: payload });
    expect(await response.json()).toEqual({ id: draftId });
  });
  it("updates with the exact revision and operation", async () => {
    mocks.rpc.mockResolvedValue({ data: 2, error: null });
    const response = await PATCH(request("PATCH", "owner-b", { draftId, operationId, revision: 1, payload }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("update_property_draft", { p_draft_id: draftId, p_operation_id: operationId, p_expected_revision: 1, p_payload: payload });
    expect(await response.json()).toEqual({ revision: 2 });
  });
  it("rejects suspended landlords before invoking RPC", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "landlord", is_suspended: true }, error: null });
    expect((await POST(request("POST", "owner-b", { operationId, payload }))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("returns conflict without changing the request after a stale revision", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "40001" } });
    const response = await PATCH(request("PATCH", "owner-b", { draftId, operationId, revision: 1, payload }));
    expect(response.status).toBe(409);
  });
  it("reports database payload validation errors without calling them outages", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "22023" } });
    expect((await POST(request("POST", "owner-b", { operationId, payload }))).status).toBe(400);
    expect((await PATCH(request("PATCH", "owner-b", { draftId, operationId, revision: 1, payload }))).status).toBe(400);
  });
  it("rejects invalid identifiers before invoking RPC", async () => {
    expect((await POST(request("POST", "owner-b", { operationId: "invalid", payload }))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
