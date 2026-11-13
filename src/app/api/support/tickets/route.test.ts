import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  select: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrl: vi.fn(),
  verifyTurnstile: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        upload: mocks.upload,
        remove: mocks.remove,
        createSignedUrl: mocks.createSignedUrl,
      }),
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: (table: string) => ({
      select: () => {
        type Builder = {
          eq: () => Builder;
          order: () => Builder;
          limit: (n: number) => unknown;
          maybeSingle: () => unknown;
        };
        const builder: Builder = {
          eq: () => builder,
          order: () => builder,
          limit: (n: number) => mocks.select(table, "limit", n),
          maybeSingle: () => mocks.select(table, "maybeSingle"),
        };
        return builder;
      },
    }),
  }),
}));

vi.mock("@/server/turnstile", () => ({
  verifyTurnstileToken: (...args: unknown[]) => mocks.verifyTurnstile(...args),
}));

import { GET, POST } from "./route";
import { GET as GET_ATTACHMENT } from "./[ticketId]/attachments/route";
import { supportTicketsLimiter } from "@/server/api-limiters";

let ipCounter = 0;
const nextIp = () => `192.168.1.${++ipCounter}`;

const validPayload = {
  operationId: "12345678-1234-4234-8234-123456789abc",
  requesterName: "Maria Santos",
  requesterEmail: "maria@example.com",
  category: "account_access",
  subject: "Cannot access my account",
  description: "I am unable to receive password reset emails on my account.",
  turnstileToken: "valid-turnstile-token",
};

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

beforeEach(() => {
  vi.resetAllMocks();
  supportTicketsLimiter.reset();
  process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.co";

  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  mocks.verifyTurnstile.mockResolvedValue({ valid: true });
  mocks.upload.mockResolvedValue({ data: { path: "mock-path" }, error: null });
  mocks.remove.mockResolvedValue({ data: [], error: null });
  mocks.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://mock.storage/file.png" }, error: null });
  mocks.rpc.mockResolvedValue({
    data: {
      id: "92345678-1234-4234-8234-123456789abc",
      ticketNumber: "SUP-01001",
      status: "open",
      createdAt: "2026-11-13T00:00:00Z",
      replayed: false,
    },
    error: null,
  });
});

describe("POST /api/support/tickets", () => {
  it("allows guest ticket submission", async () => {
    const ip = nextIp();
    const req = new Request("http://localhost/api/support/tickets", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ticket).toBeDefined();
    expect(json.ticket.ticketNumber).toBe("SUP-01001");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "submit_support_ticket",
      expect.objectContaining({
        p_requester_name: "Maria Santos",
        p_requester_email: "maria@example.com",
        p_category: "account_access",
      }),
    );
  });

  it("allows authenticated user submission with x-expected-user-id header", async () => {
    const userId = "82345678-1234-4234-8234-123456789abc";
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });

    const req = new Request("http://localhost/api/support/tickets", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": nextIp(),
        "x-expected-user-id": userId,
      },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("returns 409 when x-expected-user-id mismatches authenticated user", async () => {
    const userId = "82345678-1234-4234-8234-123456789abc";
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });

    const req = new Request("http://localhost/api/support/tickets", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": nextIp(),
        "x-expected-user-id": "wrong-user-id",
      },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns 200 when submission is an idempotent replay", async () => {
    mocks.rpc.mockResolvedValue({
      data: {
        id: "92345678-1234-4234-8234-123456789abc",
        ticketNumber: "SUP-01001",
        status: "open",
        createdAt: "2026-11-13T00:00:00Z",
        replayed: true,
      },
      error: null,
    });

    const req = new Request("http://localhost/api/support/tickets", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": nextIp(),
      },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ticket.replayed).toBe(true);
  });

  it("blocks honeypot population with 400", async () => {
    const req = new Request("http://localhost/api/support/tickets", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": nextIp(),
      },
      body: JSON.stringify({ ...validPayload, website: "https://spam.example.com" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns 403 on turnstile verification failure", async () => {
    mocks.verifyTurnstile.mockResolvedValue({ valid: false, code: "INVALID_TOKEN" });

    const req = new Request("http://localhost/api/support/tickets", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": nextIp(),
      },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After header when rate limit is exceeded", async () => {
    const ip = nextIp();
    const send = () =>
      POST(
        new Request("http://localhost/api/support/tickets", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": ip,
          },
          body: JSON.stringify(validPayload),
        }),
      );

    // Limit is 5 per IP
    for (let i = 0; i < 5; i++) {
      const res = await send();
      expect(res.status).toBe(201);
    }

    const blockedRes = await send();
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.headers.get("Retry-After")).toBeTruthy();
    expect(mocks.rpc).toHaveBeenCalledTimes(5);
  });

  it("accepts multipart/form-data with attachments and uploads to storage", async () => {
    const formData = new FormData();
    formData.set("operationId", "12345678-1234-4234-8234-123456789abc");
    formData.set("requesterName", "Maria Santos");
    formData.set("requesterEmail", "maria@example.com");
    formData.set("category", "account_access");
    formData.set("subject", "Cannot access my account");
    formData.set("description", "I am unable to receive password reset emails on my account.");
    formData.set("turnstileToken", "valid-turnstile-token");

    const validFile = new File([pngBytes], "screenshot.png", { type: "image/png" });
    formData.append("attachments", validFile);

    const req = new Request("http://localhost/api/support/tickets", {
      method: "POST",
      headers: {
        "x-forwarded-for": nextIp(),
      },
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it("rejects attachments with invalid magic bytes (400)", async () => {
    const formData = new FormData();
    formData.set("operationId", "12345678-1234-4234-8234-123456789abc");
    formData.set("requesterName", "Maria Santos");
    formData.set("requesterEmail", "maria@example.com");
    formData.set("category", "account_access");
    formData.set("subject", "Cannot access my account");
    formData.set("description", "I am unable to receive password reset emails on my account.");
    formData.set("turnstileToken", "valid-turnstile-token");

    const fakeBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    const corruptFile = new File([fakeBytes], "fake.png", { type: "image/png" });
    formData.append("attachments", corruptFile);

    const req = new Request("http://localhost/api/support/tickets", {
      method: "POST",
      headers: {
        "x-forwarded-for": nextIp(),
      },
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

describe("GET /api/support/tickets", () => {
  const userId = "82345678-1234-4234-8234-123456789abc";

  it("returns 401 for unauthenticated requests", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const req = new Request("http://localhost/api/support/tickets");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 409 when x-expected-user-id mismatches", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });

    const req = new Request("http://localhost/api/support/tickets", {
      headers: { "x-expected-user-id": "different-user-id" },
    });
    const res = await GET(req);
    expect(res.status).toBe(409);
  });

  it("returns user tickets on authenticated match", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    mocks.select.mockResolvedValue({
      data: [
        {
          id: "ticket-1",
          ticket_number: "SUP-01001",
          user_id: userId,
          requester_name: "Maria",
          requester_email: "maria@example.com",
          category: "account_access",
          subject: "Sign in problem",
          description: "Cannot sign in to my account despite correct credentials.",
          status: "open",
          priority: "normal",
          created_at: "2026-11-13T00:00:00Z",
          updated_at: "2026-11-13T00:00:00Z",
        },
      ],
      error: null,
    });

    const req = new Request("http://localhost/api/support/tickets", {
      headers: { "x-expected-user-id": userId },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tickets).toHaveLength(1);
    expect(json.tickets[0].ticketNumber).toBe("SUP-01001");
  });
});

describe("GET /api/support/tickets/[ticketId]/attachments", () => {
  const userId = "82345678-1234-4234-8234-123456789abc";
  const ticketId = "92345678-1234-4234-8234-123456789abc";
  const validPath = `${ticketId}/photo.png`;

  const ctx = { params: Promise.resolve({ ticketId }) };

  it("returns 401 when unauthenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = new Request(`http://localhost/api/support/tickets/${ticketId}/attachments?path=${validPath}`);
    const res = await GET_ATTACHMENT(req, ctx);
    expect(res.status).toBe(401);
  });

  it("returns 400 for path traversal or bad ticketId", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    const badReq = new Request(`http://localhost/api/support/tickets/${ticketId}/attachments?path=../secret.txt`);
    const res = await GET_ATTACHMENT(badReq, ctx);
    expect(res.status).toBe(400);

    const badIdCtx = { params: Promise.resolve({ ticketId: "not-a-uuid" }) };
    const badIdReq = new Request(`http://localhost/api/support/tickets/not-a-uuid/attachments?path=${validPath}`);
    const badIdRes = await GET_ATTACHMENT(badIdReq, badIdCtx);
    expect(badIdRes.status).toBe(400);
  });

  it("returns 403 when user is neither ticket owner nor admin", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "stranger-user" } }, error: null });
    mocks.select
      .mockResolvedValueOnce({
        data: { id: ticketId, user_id: userId, attachments: [{ storagePath: validPath, fileName: "p.png", mimeType: "image/png" }] },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { role: "renter", is_suspended: false },
        error: null,
      });

    const req = new Request(`http://localhost/api/support/tickets/${ticketId}/attachments?path=${validPath}`);
    const res = await GET_ATTACHMENT(req, ctx);
    expect(res.status).toBe(403);
  });

  it("returns 200 with signedUrl for ticket owner", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    mocks.select.mockResolvedValueOnce({
      data: { id: ticketId, user_id: userId, attachments: [{ storagePath: validPath, fileName: "p.png", mimeType: "image/png" }] },
      error: null,
    });

    const req = new Request(`http://localhost/api/support/tickets/${ticketId}/attachments?path=${validPath}`);
    const res = await GET_ATTACHMENT(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://mock.storage/file.png");
    expect(json.fileName).toBe("p.png");
    expect(json.mimeType).toBe("image/png");
  });
});
