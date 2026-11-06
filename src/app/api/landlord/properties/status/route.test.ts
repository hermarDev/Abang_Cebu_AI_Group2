import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(async (): Promise<{ data: { user: { id: string } | null }; error: unknown }> => ({ data: { user: { id: "landlord-1" } }, error: null })),
  profile: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: { role: "landlord", is_suspended: false }, error: null })),
  rpc: vi.fn(async (): Promise<{ data: unknown; error: unknown }> => ({ data: { propertyId: "p1", status: "rejected", moderationNote: "Fix permit" }, error: null })),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }), rpc: mocks.rpc }) }));

const req = (qs = "", user = "landlord-1") => new Request(`http://localhost/api/landlord/properties/status${qs}`, { headers: { "x-expected-user-id": user } });

beforeEach(() => vi.clearAllMocks());

describe("landlord property status", () => {
  it("returns the latest review-bound status", async () => {
    const r = await GET(req("?operationId=11111111-1111-4111-8111-111111111111"));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ status: "rejected", moderationNote: "Fix permit" });
    expect(mocks.rpc).toHaveBeenCalledWith("landlord_property_status", { p_operation_id: "11111111-1111-4111-8111-111111111111" });
  });
  it.each([6, 7, 8])("accepts a version %i operation id", async (version) => {
    const id = `11111111-1111-${version}111-8111-111111111111`;
    expect((await GET(req(`?operationId=${id}`))).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("landlord_property_status", { p_operation_id: id });
  });
  it("rejects account mismatch before any query", async () => {
    const r = await GET(req("", "someone-else"));
    expect(r.status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects non-landlord", async () => {
    mocks.profile.mockResolvedValueOnce({ data: { role: "renter", is_suspended: false }, error: null });
    expect((await GET(req())).status).toBe(403);
  });
  it("rejects a malformed operation id", async () => {
    expect((await GET(req("?operationId=nope"))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
