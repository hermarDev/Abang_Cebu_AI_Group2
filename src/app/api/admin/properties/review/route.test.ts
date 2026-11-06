import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(async (): Promise<{ data: { user: { id: string } | null }; error: unknown }> => ({ data: { user: { id: "admin-1" } }, error: null })),
  profile: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: { role: "admin", is_suspended: false }, error: null })),
  rpc: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: { status: "approved" }, error: null })),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }), rpc: mocks.rpc }) }));

function request(body: unknown, user = "admin-1") {
  return new Request("http://localhost/api/admin/properties/review", { method: "POST", headers: { "content-type": "application/json", "x-expected-user-id": user }, body: JSON.stringify(body) });
}
const approve = () => ({ propertyId: "11111111-1111-4111-8111-111111111111", operationId: "22222222-2222-4222-8222-222222222222", decision: "approved", submissionDraftId: "33333333-3333-4333-8333-333333333333", submissionExpectedRevision: 1 });

beforeEach(() => vi.clearAllMocks());

describe("admin property review", () => {
  it("rejects guests, non-admins, and account mismatch", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect((await POST(request(approve()))).status).toBe(401);
    mocks.profile.mockResolvedValueOnce({ data: { role: "landlord", is_suspended: false }, error: null });
    expect((await POST(request(approve()))).status).toBe(403);
    expect((await POST(request(approve(), "other"))).status).toBe(409);
  });
  it("requires a rejection reason", async () => {
    expect((await POST(request({ ...approve(), decision: "rejected" }))).status).toBe(400);
  });
  it("approves a pending property", async () => {
    const response = await POST(request(approve()));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "approved" });
    expect(mocks.rpc).toHaveBeenCalledWith("review_property", expect.objectContaining({ p_submission_draft_id: "33333333-3333-4333-8333-333333333333", p_submission_expected_revision: 1 }));
  });
  it("requires the exact submission revision", async () => {
    const partial = await POST(request({ propertyId: approve().propertyId, operationId: approve().operationId, decision: "approved", submissionDraftId: "33333333-3333-4333-8333-333333333333" }));
    expect(partial.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
    const missing = await POST(request({ propertyId: approve().propertyId, operationId: approve().operationId, decision: "approved" }));
    expect(missing.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects with a note", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { status: "rejected" }, error: null });
    const response = await POST(request({ ...approve(), decision: "rejected", note: "Permit unreadable" }));
    expect(await response.json()).toEqual({ status: "rejected" });
  });
  it("reports an uncertain result when the review response is lost", async () => {
    mocks.rpc.mockRejectedValueOnce(new Error("connection lost"));
    const response = await POST(request(approve()));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "The review outcome could not be confirmed. Reload its status before retrying." });
  });
  it("maps stale decisions to 409", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "40001" } });
    expect((await POST(request(approve()))).status).toBe(409);
  });
});
