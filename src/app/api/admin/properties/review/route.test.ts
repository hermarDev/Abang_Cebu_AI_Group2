import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(async (): Promise<{ data: { user: { id: string } | null }; error: unknown }> => ({ data: { user: { id: "admin-1" } }, error: null })),
  profile: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: { role: "admin", is_suspended: false }, error: null })),
  submissionFind: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: { field_verification_status: "verified" }, error: null })),
  rpc: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: { status: "approved" }, error: null })),
  revalidatePath: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) => {
      if (table !== "property_submissions") return { select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) };
      const step = { eq: () => step, is: () => step, maybeSingle: mocks.submissionFind };
      return { select: () => step };
    },
    rpc: mocks.rpc,
  }),
}));

function request(body: unknown, user = "admin-1") {
  return new Request("http://localhost/api/admin/properties/review", { method: "POST", headers: { "content-type": "application/json", "x-expected-user-id": user }, body: JSON.stringify(body) });
}
const approve = () => ({ propertyId: "11111111-1111-4111-8111-111111111111", operationId: "22222222-2222-4222-8222-222222222222", decision: "approved", submissionDraftId: "33333333-3333-4333-8333-333333333333", submissionExpectedRevision: 1 });
const chain = (data: unknown) => ({ data, error: null });

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
  it("rejects non-string rejection reasons without calling the review RPC", async () => {
    for (const note of [{ text: "invalid" }, 123, true]) {
      expect((await POST(request({ ...approve(), decision: "rejected", note }))).status).toBe(400);
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("approves a pending property", async () => {
    const response = await POST(request(approve()));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "approved" });
    expect(mocks.rpc).toHaveBeenCalledWith("review_property", expect.objectContaining({ p_submission_draft_id: "33333333-3333-4333-8333-333333333333", p_submission_expected_revision: 1 }));
    for (const path of ["/", "/landlord/dashboard", "/landlord/properties", "/landlord/map", "/admin/dashboard", "/admin/reviews", "/admin/audit"]) {
      expect(mocks.revalidatePath).toHaveBeenCalledWith(path);
    }
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
  it("maps PT409 field verification failures to an actionable conflict", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "PT409", message: "field verification required before admin approval" } });
    const response = await POST(request(approve()));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Field verification is required before admin approval can be granted.", code: "FIELD_VERIFICATION_REQUIRED" });
  });
  it("maps the gate message to 409 even when the provider drops the PT409 code", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "P0001", message: "field verification required before admin approval" },
    });
    const response = await POST(request(approve()));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Field verification is required before admin approval can be granted.",
      code: "FIELD_VERIFICATION_REQUIRED",
    });
  });
  it("returns 409 from the pre-check without invoking review_property when the submission is unverified", async () => {
    mocks.submissionFind.mockResolvedValueOnce(chain({ field_verification_status: "pending" }));
    const response = await POST(request(approve()));
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("FIELD_VERIFICATION_REQUIRED");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not mislabel unrelated PT409 failures as field verification errors", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "PT409", message: "another conflict" } });
    const response = await POST(request(approve()));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "The review could not be saved. Please retry." });
  });
  it("maps unverified approval trigger error (40001) with helpful message", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "40001", message: "field verification required before admin approval" },
    });
    const res = await POST(request(approve()));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("Field verification is required");
  });
});
