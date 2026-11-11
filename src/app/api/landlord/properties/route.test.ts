import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(async (): Promise<{ data: { user: { id: string } | null }; error: unknown }> => ({ data: { user: { id: "landlord-1" } }, error: null })),
  profile: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: { role: "landlord", is_suspended: false }, error: null })),
  rpc: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: { property_id: "prop-1" }, error: null })),
  submission: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: { property_id: "prop-1", status: "pending", draft_id: "22222222-2222-4222-8222-222222222222", expected_revision: 1 }, error: null })),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, from: (table: string) => table === "profiles" ? { select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) } : { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.submission }) }) }) }, rpc: mocks.rpc }) }));

function request(body: unknown, user = "landlord-1") {
  return new Request("http://localhost/api/landlord/properties", { method: "POST", headers: { "content-type": "application/json", "x-expected-user-id": user }, body: JSON.stringify(body) });
}
const valid = () => ({ operationId: "11111111-1111-4111-8111-111111111111", draftId: "22222222-2222-4222-8222-222222222222", expectedRevision: 1 });

beforeEach(() => vi.clearAllMocks());

describe("landlord property submission", () => {
  it("submits property draft to RPC and returns propertyId with pending status", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { property_id: "prop-new-123" }, error: null });
    const response = await POST(request(valid()));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ propertyId: "prop-new-123", status: "pending" });
    expect(mocks.rpc).toHaveBeenCalledWith("submit_property_from_draft", {
      p_operation_id: "11111111-1111-4111-8111-111111111111",
      p_draft_id: "22222222-2222-4222-8222-222222222222",
      p_expected_revision: 1,
    });
  });
  it("rejects non-landlord or suspended users", async () => {
    mocks.profile.mockResolvedValueOnce({ data: { role: "renter", is_suspended: false }, error: null });
    expect((await POST(request(valid()))).status).toBe(403);
    mocks.profile.mockResolvedValueOnce({ data: { role: "landlord", is_suspended: true }, error: null });
    expect((await POST(request(valid()))).status).toBe(403);
  });
  it("rejects account mismatch and malformed requests without submitting", async () => {
    expect((await POST(request(valid(), "other"))).status).toBe(409);
    expect((await POST(request({ ...valid(), expectedRevision: 0 }))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("maps stale and conflicting operations to 409", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "40001" } });
    expect((await POST(request(valid()))).status).toBe(409);
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "23505" } });
    expect((await POST(request(valid()))).status).toBe(409);
  });
});
