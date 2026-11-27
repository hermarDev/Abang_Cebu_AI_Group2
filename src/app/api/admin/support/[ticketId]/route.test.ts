import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mocks.profile,
        }),
      }),
    }),
  }),
}));

import { adminSupportLimiter } from "@/server/admin-access";
import { POST } from "./route";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const TICKET_ID = "22222222-2222-4222-8222-222222222222";
const OP_ID = "33333333-3333-4333-8333-333333333333";

const validBody = {
  operationId: OP_ID,
  status: "in_progress",
  priority: "normal",
  adminResponse: "  Investigating now.  ",
  reason: "  Triaged  ",
};

const callRoute = (
  body: unknown,
  headers: Record<string, string> = { "x-expected-user-id": ADMIN_ID },
  ticketId = TICKET_ID,
) =>
  POST(
    new Request(`http://localhost/api/admin/support/${ticketId}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ ticketId }) },
  );

beforeEach(() => {
  vi.resetAllMocks();
  adminSupportLimiter.reset();
  mocks.getUser.mockResolvedValue({ data: { user: { id: ADMIN_ID } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: false }, error: null });
  mocks.rpc.mockResolvedValue({ data: { ticketId: TICKET_ID }, error: null });
});

describe("POST /api/admin/support/[ticketId]", () => {
  it("enforces admin auth (401, 409, 403)", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect((await callRoute(validBody)).status).toBe(401);

    expect((await callRoute(validBody, { "x-expected-user-id": "other" })).status).toBe(409);

    mocks.profile.mockResolvedValueOnce({ data: { role: "renter", is_suspended: false }, error: null });
    expect((await callRoute(validBody)).status).toBe(403);

    mocks.profile.mockResolvedValueOnce({ data: { role: "admin", is_suspended: true }, error: null });
    expect((await callRoute(validBody)).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("validates ticketId and request body fields with 400", async () => {
    expect((await callRoute(validBody, { "x-expected-user-id": ADMIN_ID }, "bad-id")).status).toBe(400);
    expect((await callRoute("{not-json")).status).toBe(400);
    expect((await callRoute({ ...validBody, operationId: "bad" })).status).toBe(400);
    expect((await callRoute({ ...validBody, status: "unknown" })).status).toBe(400);
    expect((await callRoute({ ...validBody, priority: "critical" })).status).toBe(400);
    expect((await callRoute({ ...validBody, adminResponse: "a".repeat(2001) })).status).toBe(400);
    expect((await callRoute({ ...validBody, reason: "a".repeat(1001) })).status).toBe(400);
    expect((await callRoute({ ...validBody, expectedUpdatedAt: "not-a-date" })).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("sets p_clear_response based on adminResponse presence and content", async () => {
    const { adminResponse: _omitted, ...withoutResponse } = validBody;
    void _omitted;
    expect((await callRoute(withoutResponse)).status).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith("admin_update_support_ticket", expect.objectContaining({
      p_admin_response: null,
      p_clear_response: false,
    }));

    expect((await callRoute({ ...validBody, adminResponse: "   " })).status).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith("admin_update_support_ticket", expect.objectContaining({
      p_admin_response: null,
      p_clear_response: true,
    }));

    expect((await callRoute({ ...validBody, adminResponse: null })).status).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith("admin_update_support_ticket", expect.objectContaining({
      p_admin_response: null,
      p_clear_response: true,
    }));

    expect((await callRoute(validBody)).status).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith("admin_update_support_ticket", expect.objectContaining({
      p_admin_response: "Investigating now.",
      p_reason: "Triaged",
      p_clear_response: false,
    }));
  });

  it.each([
    ["42501", 403],
    ["23505", 409],
    ["40001", 409],
    ["22023", 400],
    ["P0001", 503],
  ])("maps RPC error code %s to HTTP %i", async (code, expectedStatus) => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code } });
    expect((await callRoute(validBody)).status).toBe(expectedStatus);
  });

  it.each(["escalated", "awaiting_landlord"])("accepts %s status update", async (status) => {
    expect((await callRoute({ ...validBody, status })).status).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith("admin_update_support_ticket", expect.objectContaining({ p_status: status }));
  });

  it("returns 429 when adminSupportLimiter is exceeded", async () => {
    for (let i = 0; i < 60; i++) {
      expect((await callRoute(validBody)).status).toBe(200);
    }
    const limited = await callRoute(validBody);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});
