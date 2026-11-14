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

import { GET } from "./route";

const H = { "x-expected-user-id": "supp-1" };
const get = (qs = "", headers: Record<string, string> = H) =>
  GET(new Request("http://localhost/api/support-desk/tickets" + qs, { headers }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireActiveSupportOrAdmin.mockResolvedValue({
    supabase: { rpc: vi.fn() },
    user: { id: "supp-1" },
    role: "customer_support",
  });
  mocks.supportDeskRpc.mockResolvedValue({
    data: [{ id: "t1", status: "open", subject: "Help needed" }],
    error: null,
  });
});

describe("GET /api/support-desk/tickets", () => {
  it("forwards auth failure from requireActiveSupportOrAdmin", async () => {
    mocks.requireActiveSupportOrAdmin.mockResolvedValue({
      response: Response.json({ error: "denied" }, { status: 403 }),
    });
    const res = await get();
    expect(res.status).toBe(403);
    expect(mocks.supportDeskRpc).not.toHaveBeenCalled();
  });

  it("rejects invalid page parameters with 400", async () => {
    const res = await get("?limit=999");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid ticket filter." });
  });

  it("rejects invalid status parameter with 400", async () => {
    const res = await get("?status=invalid_status");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid ticket filter." });
  });

  it("returns 200 with tickets on valid query", async () => {
    const res = await get("?status=open&search=noise&limit=10&offset=0");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ tickets: [{ id: "t1", status: "open", subject: "Help needed" }] });
    expect(mocks.supportDeskRpc).toHaveBeenCalledWith(
      expect.anything(),
      "support_desk_list_tickets",
      {
        p_status: "open",
        p_category: null,
        p_search: "noise",
        p_limit: 10,
        p_offset: 0,
        p_ticket_id: null,
      },
    );
  });

  it("maps 42501 error to 403 forbidden", async () => {
    mocks.supportDeskRpc.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "unauthorized" },
    });
    const res = await get();
    expect(res.status).toBe(403);
  });

  it("maps unexpected rpc error to 503", async () => {
    mocks.supportDeskRpc.mockResolvedValue({
      data: null,
      error: { code: "50000", message: "db crash" },
    });
    const res = await get();
    expect(res.status).toBe(503);
  });
});
