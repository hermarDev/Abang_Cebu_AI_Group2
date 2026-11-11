import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "./turnstile";

const req = (headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/test", { headers });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("verifyTurnstileToken", () => {
  it("allows requests when TURNSTILE_SECRET_KEY is not configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const result = await verifyTurnstileToken(undefined, req());
    expect(result).toEqual({ valid: true });
  });

  it("rejects missing token when TURNSTILE_SECRET_KEY is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    const result = await verifyTurnstileToken(undefined, req());
    expect(result).toEqual({ valid: false, code: "MISSING_TURNSTILE_TOKEN" });

    const empty = await verifyTurnstileToken("   ", req());
    expect(empty).toEqual({ valid: false, code: "MISSING_TURNSTILE_TOKEN" });
  });

  it("successfully validates valid token with Cloudflare siteverify", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await verifyTurnstileToken("valid-token", req({ "x-real-ip": "203.0.113.10" }));
    expect(result).toEqual({ valid: true });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("returns rejected when Cloudflare returns success: false with error code", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await verifyTurnstileToken("invalid-token", req());
    expect(result).toEqual({ valid: false, code: "invalid-input-response" });
  });

  it("handles upstream network failure gracefully", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network timeout"));
    vi.stubGlobal("fetch", mockFetch);

    const result = await verifyTurnstileToken("any-token", req());
    expect(result).toEqual({ valid: false, code: "VERIFICATION_FAILED" });
  });

  it("handles non-200 HTTP response from Cloudflare", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await verifyTurnstileToken("any-token", req());
    expect(result).toEqual({ valid: false, code: "VERIFICATION_NETWORK_ERROR" });
  });
});
