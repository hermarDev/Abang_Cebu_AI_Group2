import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireActiveSupportOrAdmin: vi.fn(),
  supportDeskRpc: vi.fn(),
}));

vi.mock("@/server/support-desk-access", async () => {
  const actual = await vi.importActual<typeof import("@/server/support-desk-access")>("@/server/support-desk-access");
  return {
    ...actual,
    requireActiveSupportOrAdmin: mocks.requireActiveSupportOrAdmin,
    supportDeskRpc: mocks.supportDeskRpc,
  };
});

import { GET, POST } from "./route";

const TICKET_ID = "77100000-0000-4000-8000-000000000001";
const OP_ID = "88100000-0000-4000-8000-000000000001";
const LANDLORD_ID = "bb100000-0000-4000-8000-000000000002";
const H = { "x-expected-user-id": "supp-1" };
const ctx = (id = TICKET_ID) => ({ params: Promise.resolve({ ticketId: id }) });

const get = (id = TICKET_ID, headers: Record<string, string> = H) =>
  GET(new Request(`http://localhost/api/support-desk/tickets/${id}`, { headers }), ctx(id));

const post = (body: unknown, id = TICKET_ID, headers: Record<string, string> = H) =>
  POST(
    new Request(`http://localhost/api/support-desk/tickets/${id}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
    ctx(id),
  );

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireActiveSupportOrAdmin.mockResolvedValue({
    supabase: { rpc: vi.fn() },
    user: { id: "supp-1" },
    role: "customer_support",
  });
  mocks.supportDeskRpc.mockResolvedValue({
    data: [{ id: TICKET_ID, subject: "Noise complaint", status: "open" }],
    error: null,
  });
});

describe("GET /api/support-desk/tickets/[ticketId]", () => {
  it("rejects invalid ticket UUID with 400", async () => {
    const res = await get("invalid-id");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid ticket request." });
  });

  it("returns 404 when ticket is not found", async () => {
    mocks.supportDeskRpc.mockResolvedValue({ data: [], error: null });
    const res = await get();
    expect(res.status).toBe(404);
  });

  it("returns 200 with ticket detail", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ticket: { id: TICKET_ID, subject: "Noise complaint", status: "open" },
    });
  });
});

describe("POST /api/support-desk/tickets/[ticketId]", () => {
  it("rejects invalid UUIDs or missing body with 400", async () => {
    const res = await post({}, "invalid-id");
    expect(res.status).toBe(400);

    const res2 = await post({ operationId: "bad-op", action: "resolve", note: "Valid note" });
    expect(res2.status).toBe(400);
  });

  it("rejects invalid action or short note with 400", async () => {
    const res = await post({ operationId: OP_ID, action: "unsupported", note: "Valid note" });
    expect(res.status).toBe(400);

    const res2 = await post({ operationId: OP_ID, action: "resolve", note: "Hi" });
    expect(res2.status).toBe(400);
  });

  it("executes request_landlord_response successfully", async () => {
    mocks.supportDeskRpc.mockResolvedValue({
      data: { ticketId: TICKET_ID, action: "request_landlord_response", success: true },
      error: null,
    });
    const res = await post({
      operationId: OP_ID,
      action: "request_landlord_response",
      note: "Please clarify quiet hours",
      reportedLandlordId: LANDLORD_ID,
    });
    expect(res.status).toBe(200);
    expect(mocks.supportDeskRpc).toHaveBeenCalledWith(
      expect.anything(),
      "support_desk_act_on_ticket",
      {
        p_ticket_id: TICKET_ID,
        p_operation_id: OP_ID,
        p_action: "request_landlord_response",
        p_note: "Please clarify quiet hours",
        p_reported_landlord_id: LANDLORD_ID,
        p_recommended_admin_action: null,
      },
    );
  });

  it("executes escalate_to_admin successfully", async () => {
    mocks.supportDeskRpc.mockResolvedValue({
      data: { ticketId: TICKET_ID, action: "escalate_to_admin", success: true },
      error: null,
    });
    const res = await post({
      operationId: OP_ID,
      action: "escalate_to_admin",
      note: "Severe fraud suspected",
      recommendedAdminAction: "suspend_account",
    });
    expect(res.status).toBe(200);
    expect(mocks.supportDeskRpc).toHaveBeenCalledWith(
      expect.anything(),
      "support_desk_act_on_ticket",
      {
        p_ticket_id: TICKET_ID,
        p_operation_id: OP_ID,
        p_action: "escalate_to_admin",
        p_note: "Severe fraud suspected",
        p_reported_landlord_id: null,
        p_recommended_admin_action: "suspend_account",
      },
    );
  });

  it("maps error codes appropriately", async () => {
    mocks.supportDeskRpc.mockResolvedValue({ data: null, error: { code: "P0002", message: "not found" } });
    expect((await post({ operationId: OP_ID, action: "resolve", note: "Valid note here" })).status).toBe(404);

    mocks.supportDeskRpc.mockResolvedValue({ data: null, error: { code: "22023", message: "invalid param" } });
    expect((await post({ operationId: OP_ID, action: "resolve", note: "Valid note here" })).status).toBe(400);

    mocks.supportDeskRpc.mockResolvedValue({ data: null, error: { code: "23505", message: "conflict" } });
    expect((await post({ operationId: OP_ID, action: "resolve", note: "Valid note here" })).status).toBe(409);

    mocks.supportDeskRpc.mockResolvedValue({ data: null, error: { code: "42501", message: "forbidden" } });
    expect((await post({ operationId: OP_ID, action: "resolve", note: "Valid note here" })).status).toBe(403);
  });
});
