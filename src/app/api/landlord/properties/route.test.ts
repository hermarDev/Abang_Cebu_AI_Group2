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
  it("keeps submission unavailable while the workflow is preview-only", async () => {
    const response = await POST(request(valid()));
    if (!response) throw new Error("missing response");
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Listing submission is unavailable in preview." });
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
