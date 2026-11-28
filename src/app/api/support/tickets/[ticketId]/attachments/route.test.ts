import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  userTicketSelect: vi.fn(),
  profileSelect: vi.fn(),
  adminTicketSelect: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      expect(table).toBe("support_tickets");
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: mocks.adminTicketSelect,
          }),
        }),
      };
    },
    storage: {
      from: (bucket: string) => {
        expect(bucket).toBe("support-attachments");
        return {
          createSignedUrl: mocks.createSignedUrl,
        };
      },
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: table === "profiles" ? mocks.profileSelect : mocks.userTicketSelect,
        }),
      }),
    }),
  }),
}));

import { hashGuestSupportToken } from "@/server/support-api";
import { GET } from "./route";

const TICKET_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "22222222-2222-4222-8222-222222222222";
const VALID_PATH = `${TICKET_ID}/proof.png`;
const GUEST_TOKEN = "guest-secret-token-123456";

function makeContext(ticketId = TICKET_ID) {
  return { params: Promise.resolve({ ticketId }) };
}

function makeRequest(pathQuery: string | null, headers?: Record<string, string>, ticketId = TICKET_ID) {
  const url = new URL(`http://localhost/api/support/tickets/${ticketId}/attachments`);
  if (pathQuery !== null) url.searchParams.set("path", pathQuery);
  return new Request(url.toString(), { headers });
}

beforeEach(() => {
  vi.resetAllMocks();
  process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";

  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  mocks.profileSelect.mockResolvedValue({ data: { role: "renter", is_suspended: false }, error: null });
  mocks.createSignedUrl.mockResolvedValue({
    data: { signedUrl: "https://mock.storage/signed-proof.png" },
    error: null,
  });
});

describe("GET /api/support/tickets/[ticketId]/attachments", () => {
  it("returns 400 for invalid UUID or path traversal", async () => {
    const badIdRes = await GET(makeRequest(VALID_PATH, undefined, "not-a-uuid"), makeContext("not-a-uuid"));
    expect(badIdRes.status).toBe(400);

    const traversalRes = await GET(makeRequest("../secret.png"), makeContext());
    expect(traversalRes.status).toBe(400);

    const absolutePathRes = await GET(makeRequest("/etc/passwd"), makeContext());
    expect(absolutePathRes.status).toBe(400);

    const missingPathRes = await GET(makeRequest(null), makeContext());
    expect(missingPathRes.status).toBe(400);
  });

  it("returns 403 when guest token mismatches and 200 when guest token matches", async () => {
    mocks.adminTicketSelect.mockResolvedValue({
      data: {
        id: TICKET_ID,
        user_id: null,
        guest_access_token_hash: hashGuestSupportToken(GUEST_TOKEN),
        attachments: [{ storagePath: VALID_PATH, fileName: "proof.png", mimeType: "image/png" }],
      },
      error: null,
    });

    const badRes = await GET(makeRequest(VALID_PATH, { "x-support-token": "wrong-token" }), makeContext());
    expect(badRes.status).toBe(403);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();

    const okRes = await GET(makeRequest(VALID_PATH, { "x-support-token": GUEST_TOKEN }), makeContext());
    expect(okRes.status).toBe(200);
    expect(await okRes.json()).toEqual({
      url: "https://mock.storage/signed-proof.png",
      fileName: "proof.png",
      mimeType: "image/png",
    });
  });

  it("returns 401 when unauthenticated without a guest token", async () => {
    const res = await GET(makeRequest(VALID_PATH), makeContext());
    expect(res.status).toBe(401);
  });

  it("returns 403 for suspended staff or unrelated non-staff users", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "staff-1" } }, error: null });
    mocks.userTicketSelect.mockResolvedValue({
      data: {
        id: TICKET_ID,
        user_id: OWNER_ID,
        attachments: [{ storagePath: VALID_PATH, fileName: "proof.png", mimeType: "image/png" }],
      },
      error: null,
    });
    mocks.profileSelect.mockResolvedValueOnce({ data: { role: "customer_support", is_suspended: true }, error: null });

    const suspendedSupport = await GET(makeRequest(VALID_PATH), makeContext());
    expect(suspendedSupport.status).toBe(403);

    mocks.profileSelect.mockResolvedValueOnce({ data: { role: "admin", is_suspended: true }, error: null });
    const suspendedAdmin = await GET(makeRequest(VALID_PATH), makeContext());
    expect(suspendedAdmin.status).toBe(403);

    mocks.profileSelect.mockResolvedValueOnce({ data: { role: "renter", is_suspended: false }, error: null });
    const stranger = await GET(makeRequest(VALID_PATH), makeContext());
    expect(stranger.status).toBe(403);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("returns 404 when attachment path does not match the ticket attachments", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: OWNER_ID } }, error: null });
    mocks.userTicketSelect.mockResolvedValue({
      data: {
        id: TICKET_ID,
        user_id: OWNER_ID,
        attachments: [{ storagePath: VALID_PATH, fileName: "proof.png", mimeType: "image/png" }],
      },
      error: null,
    });

    const res = await GET(makeRequest(`${TICKET_ID}/other.png`), makeContext());
    expect(res.status).toBe(404);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it("returns 200 with signed URL for ticket owner, active support, and active admin", async () => {
    mocks.userTicketSelect.mockResolvedValue({
      data: {
        id: TICKET_ID,
        user_id: OWNER_ID,
        attachments: [{ storagePath: VALID_PATH, fileName: "proof.png", mimeType: "image/png" }],
      },
      error: null,
    });

    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: OWNER_ID } }, error: null });
    const ownerRes = await GET(makeRequest(VALID_PATH), makeContext());
    expect(ownerRes.status).toBe(200);

    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: "cs-1" } }, error: null });
    mocks.profileSelect.mockResolvedValueOnce({ data: { role: "customer_support", is_suspended: false }, error: null });
    const csRes = await GET(makeRequest(VALID_PATH), makeContext());
    expect(csRes.status).toBe(200);

    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: "admin-1" } }, error: null });
    mocks.profileSelect.mockResolvedValueOnce({ data: { role: "admin", is_suspended: false }, error: null });
    const adminRes = await GET(makeRequest(VALID_PATH), makeContext());
    expect(adminRes.status).toBe(200);
    expect(mocks.createSignedUrl).toHaveBeenCalledTimes(3);
  });
});
