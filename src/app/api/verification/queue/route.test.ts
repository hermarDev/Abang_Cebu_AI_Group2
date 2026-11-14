import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  rpc: vi.fn(),
  createSignedUrls: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        createSignedUrls: mocks.createSignedUrls,
      }),
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
  }),
}));

import { GET } from "./route";

function setup() {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "officer-1" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "verification_officer", is_suspended: false }, error: null });
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  mocks.createSignedUrls.mockResolvedValue({ data: [], error: null });
}

const H = { "x-expected-user-id": "officer-1" };
const get = (qs = "", headers: Record<string, string> | undefined = H) =>
  GET(new Request("http://localhost/api/verification/queue" + qs, { headers }));

describe("GET /api/verification/queue", () => {
  beforeEach(() => {
    setup();
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await get("", { "x-expected-user-id": "officer-1" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for unauthorized role (renter)", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "renter", is_suspended: false }, error: null });
    const res = await get();
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid query parameters", async () => {
    const res = await get("?status=invalid_status");
    expect(res.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns 200 with queue items and maps query params", async () => {
    const mockItem = {
      id: "prop-1",
      title: "Apartment in Lahug",
      fieldVerificationStatus: "pending_verification",
      fieldVerificationProof: [
        { kind: "photo", object_path: "u1/p1/op1/hash1.jpg" },
      ],
    };
    mocks.rpc.mockResolvedValue({ data: [mockItem], error: null });
    mocks.createSignedUrls.mockResolvedValue({
      data: [{ path: "u1/p1/op1/hash1.jpg", signedUrl: "https://storage.local/signed/hash1.jpg" }],
      error: null,
    });

    const res = await get("?status=pending_verification&search=lahug&limit=10&offset=5");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(mocks.rpc).toHaveBeenCalledWith("verifier_list_queue", {
      p_status: "pending_verification",
      p_search: "lahug",
      p_limit: 10,
      p_offset: 5,
    });
    expect(body.queue).toHaveLength(1);
    expect(body.queue[0].id).toBe("prop-1");
  });

  it("returns 503 on rpc failure", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "db unavailable" } });
    const res = await get();
    expect(res.status).toBe(503);
  });
});
