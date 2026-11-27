import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { supportTicketLookupLimiter } from "@/server/api-limiters";
import { hashGuestSupportToken } from "@/server/support-api";
import { GET } from "./route";

const TICKET_ID = "11111111-1111-4111-8111-111111111111";
const VALID_TOKEN = "guest-secret-token";
const ctx = (ticketId = TICKET_ID) => ({ params: Promise.resolve({ ticketId }) });

function makeRequest(headers: Record<string, string> = {}) {
  return new Request(`http://localhost/api/support/tickets/${TICKET_ID}`, {
    headers: {
      "x-support-token": VALID_TOKEN,
      "x-real-ip": "198.51.100.77",
      ...headers,
    },
  });
}

describe("GET /api/support/tickets/[ticketId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supportTicketLookupLimiter.reset();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    mocks.createAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: mocks.maybeSingle,
          }),
        }),
      }),
    });
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: TICKET_ID,
        ticket_number: "SUP-001",
        user_id: null,
        requester_name: "Guest",
        requester_email: "guest@example.com",
        requester_role: "guest",
        category: "other",
        subject: "Help",
        description: "Details",
        related_listing_id: null,
        attachments: [],
        status: "open",
        priority: "normal",
        support_resolution_note: null,
        admin_response: null,
        resolved_at: null,
        created_at: "2026-11-01T00:00:00Z",
        updated_at: "2026-11-01T00:00:00Z",
        guest_access_token_hash: hashGuestSupportToken(VALID_TOKEN),
      },
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    supportTicketLookupLimiter.reset();
  });

  it("returns 400 on invalid ticket UUID", async () => {
    const res = await GET(makeRequest(), ctx("not-a-uuid"));
    expect(res.status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("returns 401 when x-support-token is missing", async () => {
    const res = await GET(new Request(`http://localhost/api/support/tickets/${TICKET_ID}`), ctx());
    expect(res.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After before touching admin client when rate limit is exceeded", async () => {
    for (let i = 0; i < 20; i++) {
      const ok = await GET(makeRequest(), ctx());
      expect(ok.status).toBe(200);
    }

    mocks.createAdminClient.mockClear();
    const limited = await GET(makeRequest(), ctx());
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("returns uniform 403 for both missing ticket and invalid token", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const missingRes = await GET(makeRequest(), ctx());
    expect(missingRes.status).toBe(403);
    const missingBody = await missingRes.json();

    const wrongTokenRes = await GET(makeRequest({ "x-support-token": "wrong-token" }), ctx());
    expect(wrongTokenRes.status).toBe(403);
    const wrongTokenBody = await wrongTokenRes.json();

    expect(missingBody).toEqual({ error: "Invalid or expired ticket access link." });
    expect(wrongTokenBody).toEqual(missingBody);
  });

  it("returns 200 with mapped ticket when token matches", async () => {
    const res = await GET(makeRequest(), ctx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ticket).toMatchObject({
      id: TICKET_ID,
      ticketNumber: "SUP-001",
      subject: "Help",
      status: "open",
    });
  });
});
