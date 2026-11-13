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

import { GET } from "./route";
import { POST } from "./[ticketId]/route";
import { adminSupportLimiter } from "@/server/admin-access";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const TICKET_ID = "22222222-2222-4222-8222-222222222222";
const OP_ID = "33333333-3333-4333-8333-333333333333";

const defaultHeaders = { "x-expected-user-id": ADMIN_ID };

const getTickets = (qs = "", headers: Record<string, string> = defaultHeaders) =>
  GET(new Request(`http://localhost/api/admin/support${qs}`, { headers }));

const ctx = (ticketId = TICKET_ID) => ({ params: Promise.resolve({ ticketId }) });

const validUpdateBody = {
  operationId: OP_ID,
  status: "resolved",
  priority: "high",
  adminResponse: "We have resolved the login issue for you.",
  reason: "User confirmed account access restored.",
};

const postTicket = (
  body: unknown,
  headers: Record<string, string> = defaultHeaders,
  ticketId = TICKET_ID,
) =>
  POST(
    new Request(`http://localhost/api/admin/support/${ticketId}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
    ctx(ticketId),
  );

beforeEach(() => {
  vi.resetAllMocks();
  adminSupportLimiter.reset();

  mocks.getUser.mockResolvedValue({ data: { user: { id: ADMIN_ID } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: false }, error: null });
  mocks.rpc.mockResolvedValue({ data: [], error: null });
});

describe("GET /api/admin/support", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await getTickets();
    expect(res.status).toBe(401);
  });

  it("returns 409 on x-expected-user-id mismatch", async () => {
    const res = await getTickets("", { "x-expected-user-id": "wrong-id" });
    expect(res.status).toBe(409);
  });

  it.each(["renter", "landlord"])("returns 403 for role %s", async (role) => {
    mocks.profile.mockResolvedValue({ data: { role, is_suspended: false }, error: null });
    const res = await getTickets();
    expect(res.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns 403 for suspended admin", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: true }, error: null });
    const res = await getTickets();
    expect(res.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each(["?status=bogus", "?category=bogus", "?limit=0", "?offset=-1"])(
    "returns 400 for invalid filter %s",
    async (qs) => {
      const res = await getTickets(qs);
      expect(res.status).toBe(400);
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );

  it("returns 200 with tickets and passes filters to RPC", async () => {
    const mockTickets = [
      {
        id: TICKET_ID,
        ticketNumber: "SUP-01001",
        status: "open",
        category: "bug_report",
      },
    ];
    mocks.rpc.mockResolvedValue({ data: mockTickets, error: null });

    const res = await getTickets("?status=open&category=bug_report&search=login&limit=10&offset=5");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tickets).toEqual(mockTickets);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_list_support_tickets", {
      p_status: "open",
      p_category: "bug_report",
      p_search: "login",
      p_limit: 10,
      p_offset: 5,
    });
  });

  it("maps RPC 42501 to 403 and other errors to 503", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    expect((await getTickets()).status).toBe(403);

    mocks.rpc.mockResolvedValue({ data: null, error: { message: "DB failure" } });
    expect((await getTickets()).status).toBe(503);
  });
});

describe("POST /api/admin/support/[ticketId]", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await postTicket(validUpdateBody);
    expect(res.status).toBe(401);
  });

  it("returns 409 on x-expected-user-id mismatch", async () => {
    const res = await postTicket(validUpdateBody, { "x-expected-user-id": "wrong-id" });
    expect(res.status).toBe(409);
  });

  it("returns 403 for non-admin", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "renter", is_suspended: false }, error: null });
    const res = await postTicket(validUpdateBody);
    expect(res.status).toBe(403);
  });

  it.each([
    ["bad ticket UUID", "bad-uuid", validUpdateBody],
    ["bad operationId", TICKET_ID, { ...validUpdateBody, operationId: "bad-op" }],
    ["invalid status", TICKET_ID, { ...validUpdateBody, status: "pending" }],
    ["invalid priority", TICKET_ID, { ...validUpdateBody, priority: "extreme" }],
    ["response over 2000 chars", TICKET_ID, { ...validUpdateBody, adminResponse: "x".repeat(2001) }],
    ["reason over 1000 chars", TICKET_ID, { ...validUpdateBody, reason: "x".repeat(1001) }],
  ])("returns 400 on %s", async (_label, ticketId, body) => {
    const res = await postTicket(body, defaultHeaders, ticketId);
    expect(res.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns 200 on successful update", async () => {
    const updatedTicket = {
      ticketId: TICKET_ID,
      ticketNumber: "SUP-01001",
      status: "resolved",
      priority: "high",
      adminResponse: "We have resolved the login issue for you.",
      resolvedAt: "2026-11-13T00:00:00Z",
    };
    mocks.rpc.mockResolvedValue({ data: updatedTicket, error: null });

    const res = await postTicket(validUpdateBody);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ticket).toEqual(updatedTicket);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_update_support_ticket", {
      p_ticket_id: TICKET_ID,
      p_operation_id: OP_ID,
      p_status: "resolved",
      p_priority: "high",
      p_admin_response: "We have resolved the login issue for you.",
      p_reason: "User confirmed account access restored.",
    });
  });

  it.each([
    ["42501", 403],
    ["23505", 409],
    ["40001", 409],
    ["22023", 400],
    ["XX000", 503],
  ])("maps RPC error code %s to HTTP %i", async (code, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } });
    const res = await postTicket(validUpdateBody);
    expect(res.status).toBe(status);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mocks.rpc.mockResolvedValue({ data: { ticketId: TICKET_ID }, error: null });

    for (let i = 0; i < 60; i++) {
      const res = await postTicket(validUpdateBody);
      expect(res.status).toBe(200);
    }

    const limitedRes = await postTicket(validUpdateBody);
    expect(limitedRes.status).toBe(429);
    expect(limitedRes.headers.get("Retry-After")).toBeTruthy();
  });
});
