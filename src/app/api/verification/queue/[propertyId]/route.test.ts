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

import { GET, POST } from "./route";
import { verificationLimiter } from "@/server/verification-access";

const propId = "11111111-1111-4111-8111-111111111111";
const draftId = "22222222-2222-4222-8222-222222222222";
const opId = "33333333-3333-4333-8333-333333333333";
const H = { "x-expected-user-id": "officer-1" };

function setup() {
  vi.resetAllMocks();
  verificationLimiter.reset();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "officer-1" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "verification_officer", is_suspended: false }, error: null });
  mocks.rpc.mockResolvedValue({ data: { propertyId: propId, status: "verified" }, error: null });
  mocks.createSignedUrls.mockResolvedValue({ data: [], error: null });
}

const validProofPath = "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg";

const validBody = {
  operationId: opId,
  submissionDraftId: draftId,
  submissionExpectedRevision: 1,
  status: "verified",
  method: "site_visit",
  notes: "Inspected the apartment in person.",
  proof: [{ kind: "photo", object_path: validProofPath }],
};

const post = (body: unknown, id = propId, headers: Record<string, string> = H) =>
  POST(
    new Request(`http://localhost/api/verification/queue/${id}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ propertyId: id }) }
  );

const get = (id = propId, headers: Record<string, string> = H) =>
  GET(new Request(`http://localhost/api/verification/queue/${id}`, { headers }), {
    params: Promise.resolve({ propertyId: id }),
  });

describe("/api/verification/queue/[propertyId]", () => {
  beforeEach(() => {
    setup();
  });

  describe("GET", () => {
    it("returns 400 for invalid propertyId", async () => {
      const res = await get("not-a-uuid");
      expect(res.status).toBe(400);
    });

    it("returns 404 when property is not in queue", async () => {
      mocks.rpc.mockResolvedValue({ data: [], error: null });
      const res = await get();
      expect(res.status).toBe(404);
    });

    it("returns 200 with property details when found", async () => {
      mocks.rpc.mockResolvedValue({
        data: [{ id: propId, title: "Found Property", fieldVerificationProof: [] }],
        error: null,
      });
      const res = await get();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.property.id).toBe(propId);
    });
  });

  describe("POST", () => {
    it("returns 400 for invalid propertyId", async () => {
      const res = await post(validBody, "not-a-uuid");
      expect(res.status).toBe(400);
    });

    it.each([
      [{ ...validBody, operationId: "invalid" }],
      [{ ...validBody, submissionDraftId: "invalid" }],
      [{ ...validBody, submissionExpectedRevision: 0 }],
      [{ ...validBody, status: "unknown" }],
      [{ ...validBody, method: "unknown" }],
      [{ ...validBody, notes: "tiny" }], // < 5 chars
      [{ ...validBody, status: "verified", proof: [] }], // verified requires >=1 proof
      [{ ...validBody, method: "proxy_meeting", proxyName: "" }], // proxy requires name
      [{ ...validBody, method: "proxy_meeting", proxyName: "John", proxyRelationship: "" }], // proxy requires relationship
    ])("returns 400 for invalid input %j", async (body) => {
      const res = await post(body);
      expect(res.status).toBe(400);
      expect(mocks.rpc).not.toHaveBeenCalled();
    });

    it("submits verification successfully", async () => {
      const res = await post(validBody);
      expect(res.status).toBe(200);
      expect(mocks.rpc).toHaveBeenCalledWith("verifier_submit_verification", {
        p_property_id: propId,
        p_operation_id: opId,
        p_submission_draft_id: draftId,
        p_submission_expected_revision: 1,
        p_status: "verified",
        p_method: "site_visit",
        p_notes: "Inspected the apartment in person.",
        p_proof: [{ kind: "photo", object_path: validProofPath }],
        p_proxy_name: null,
        p_proxy_relationship: null,
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
      const res = await post(validBody);
      expect(res.status).toBe(status);
    });
  });
});
