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
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
  }),
}));

import {
  isUuid,
  isValidNotes,
  isValidVerificationMethod,
  isValidVerificationStatus,
  pageParams,
  rateLimited,
  requireActiveVerifier,
  verificationLimiter,
  verifierRpc,
} from "./verification-access";

describe("verification-access", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    verificationLimiter.reset();
  });

  describe("requireActiveVerifier", () => {
    it("returns 401 when unauthenticated", async () => {
      mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
      const req = new Request("http://localhost/api/verification/queue", {
        headers: { "x-expected-user-id": "user-1" },
      });
      const result = await requireActiveVerifier(req);
      expect("response" in result && result.response?.status).toBe(401);
    });

    it("returns 409 when user id mismatches header", async () => {
      mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      const req = new Request("http://localhost/api/verification/queue", {
        headers: { "x-expected-user-id": "user-2" },
      });
      const result = await requireActiveVerifier(req);
      expect("response" in result && result.response?.status).toBe(409);
    });

    it("returns 503 when profile lookup fails", async () => {
      mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mocks.profile.mockResolvedValue({ data: null, error: { message: "db error" } });
      const req = new Request("http://localhost/api/verification/queue", {
        headers: { "x-expected-user-id": "user-1" },
      });
      const result = await requireActiveVerifier(req);
      expect("response" in result && result.response?.status).toBe(503);
    });

    it.each(["renter", "landlord", "customer_support"])("returns 403 for unauthorized role: %s", async (role) => {
      mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mocks.profile.mockResolvedValue({ data: { role, is_suspended: false }, error: null });
      const req = new Request("http://localhost/api/verification/queue", {
        headers: { "x-expected-user-id": "user-1" },
      });
      const result = await requireActiveVerifier(req);
      expect("response" in result && result.response?.status).toBe(403);
    });

    it("returns 403 when officer is suspended", async () => {
      mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mocks.profile.mockResolvedValue({ data: { role: "verification_officer", is_suspended: true }, error: null });
      const req = new Request("http://localhost/api/verification/queue", {
        headers: { "x-expected-user-id": "user-1" },
      });
      const result = await requireActiveVerifier(req);
      expect("response" in result && result.response?.status).toBe(403);
    });

    it("returns 403 when admin is suspended", async () => {
      mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: true }, error: null });
      const req = new Request("http://localhost/api/verification/queue", {
        headers: { "x-expected-user-id": "user-1" },
      });
      const result = await requireActiveVerifier(req);
      expect("response" in result && result.response?.status).toBe(403);
    });

    it("authorizes active verification_officer", async () => {
      mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mocks.profile.mockResolvedValue({ data: { role: "verification_officer", is_suspended: false }, error: null });
      const req = new Request("http://localhost/api/verification/queue", {
        headers: { "x-expected-user-id": "user-1" },
      });
      const result = await requireActiveVerifier(req);
      expect("user" in result && result.user?.id).toBe("user-1");
    });

    it("authorizes active admin", async () => {
      mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
      mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: false }, error: null });
      const req = new Request("http://localhost/api/verification/queue", {
        headers: { "x-expected-user-id": "user-1" },
      });
      const result = await requireActiveVerifier(req);
      expect("user" in result && result.user?.id).toBe("user-1");
    });
  });

  describe("verifierRpc", () => {
    it("safely handles null/invalid client", async () => {
      const res = await verifierRpc(null, "verifier_list_queue");
      expect(res.error?.message).toBe("Invalid RPC client instance");
    });

    it("executes rpc function", async () => {
      mocks.rpc.mockResolvedValue({ data: [{ id: "prop-1" }], error: null });
      const fakeClient = { rpc: mocks.rpc };
      const res = await verifierRpc(fakeClient, "verifier_list_queue", { p_status: "pending" });
      expect(mocks.rpc).toHaveBeenCalledWith("verifier_list_queue", { p_status: "pending" });
      expect(res.data).toEqual([{ id: "prop-1" }]);
    });
  });

  describe("validators", () => {
    it("validates uuid", () => {
      expect(isUuid("12345678-1234-4234-8234-123456789abc")).toBe(true);
      expect(isUuid("invalid-uuid")).toBe(false);
      expect(isUuid(null)).toBe(false);
    });

    it("validates methods", () => {
      expect(isValidVerificationMethod("site_visit")).toBe(true);
      expect(isValidVerificationMethod("video_call")).toBe(true);
      expect(isValidVerificationMethod("proxy_meeting")).toBe(true);
      expect(isValidVerificationMethod("other")).toBe(false);
    });

    it("validates statuses", () => {
      expect(isValidVerificationStatus("verified")).toBe(true);
      expect(isValidVerificationStatus("flagged")).toBe(true);
      expect(isValidVerificationStatus("pending")).toBe(false);
    });

    it("validates notes length (5-2000 chars)", () => {
      expect(isValidNotes("Short")).toBe(true); // 5 chars
      expect(isValidNotes("1234")).toBe(false);
      expect(isValidNotes("   1234   ")).toBe(false);
      expect(isValidNotes("a".repeat(2000))).toBe(true);
      expect(isValidNotes("a".repeat(2001))).toBe(false);
    });

    it("parses page params", () => {
      const params = new URLSearchParams("limit=20&offset=40");
      expect(pageParams(params)).toEqual({ limit: 20, offset: 40 });
      const invalid = new URLSearchParams("limit=0");
      expect(pageParams(invalid)).toBeNull();
    });

    it("rate limits correctly", () => {
      const req = new Request("http://localhost");
      for (let i = 0; i < 60; i++) {
        expect(rateLimited(verificationLimiter, req, "actor-1")).toBeNull();
      }
      const limited = rateLimited(verificationLimiter, req, "actor-1");
      expect(limited?.status).toBe(429);
    });
  });
});
