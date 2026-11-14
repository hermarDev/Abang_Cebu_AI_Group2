import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  profile: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
  }),
}));

import { POST } from "./route";

const TICKET_ID = "77100000-0000-4000-8000-000000000001";
const OP_ID = "88100000-0000-4000-8000-000000000001";
const LANDLORD_ID = "bb100000-0000-4000-8000-000000000002";
const H = { "x-expected-user-id": LANDLORD_ID, "content-type": "application/json" };
const ctx = (id = TICKET_ID) => ({ params: Promise.resolve({ ticketId: id }) });

const post = (body: unknown, id = TICKET_ID, headers: Record<string, string> = H) =>
  POST(
    new Request(`http://localhost/api/support/tickets/${id}/respond`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
    ctx(id),
  );

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: LANDLORD_ID } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "landlord", is_suspended: false }, error: null });
  mocks.rpc.mockResolvedValue({ data: { ticketId: TICKET_ID, success: true }, error: null });
});

describe("POST /api/support/tickets/[ticketId]/respond", () => {
  it("rejects unauthenticated requests with 401", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await post({ operationId: OP_ID, response: "I talked to the tenant." });
    expect(res.status).toBe(401);
  });

  it("rejects non-landlord users with 403", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "renter", is_suspended: false }, error: null });
    const res = await post({ operationId: OP_ID, response: "I talked to the tenant." });
    expect(res.status).toBe(403);
  });

  it("rejects invalid ticketId or short response with 400", async () => {
    const res = await post({ operationId: OP_ID, response: "Hi" }, "invalid-id");
    expect(res.status).toBe(400);

    const res2 = await post({ operationId: OP_ID, response: "Hi" });
    expect(res2.status).toBe(400);
  });

  it("submits response successfully through landlord_respond_to_support_ticket RPC", async () => {
    const res = await post({ operationId: OP_ID, response: "I have reminded the occupants about quiet hours." });
    expect(res.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("landlord_respond_to_support_ticket", {
      p_ticket_id: TICKET_ID,
      p_operation_id: OP_ID,
      p_response: "I have reminded the occupants about quiet hours.",
    });
  });

  it("maps unauthorized error to 403", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "unauthorized" } });
    const res = await post({ operationId: OP_ID, response: "I have resolved this issue." });
    expect(res.status).toBe(403);
  });
});
