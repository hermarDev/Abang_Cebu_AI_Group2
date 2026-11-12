import { beforeEach, describe, expect, it, vi } from "vitest";

const { resetPasswordForEmail, createClient } = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

let requestIp = 1;
let POST: typeof import("./route").POST;

function request(body: unknown, ip = `198.51.100.${requestIp}`, includeTrustedProxy = true) {
  const headers = new Headers({ "content-type": "application/json", "x-forwarded-for": ip });
  if (includeTrustedProxy) headers.set("cf-connecting-ip", ip);
  return new Request("http://localhost/api/auth/reset-password/request", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const genericSuccess = {
  success: true,
  message: "If an account is associated with this email, a password recovery link has been dispatched.",
};

describe("password reset request route", () => {
  beforeEach(async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    vi.resetModules();
    requestIp += 1;
    createClient.mockReset().mockResolvedValue({ auth: { resetPasswordForEmail } });
    resetPasswordForEmail.mockReset().mockResolvedValue({ data: {}, error: null });
    ({ POST } = await import("./route"));
  });

  it("returns a constant generic response and sends a PKCE recovery redirect", async () => {
    const response = await POST(request({ email: " Person@Example.com " }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(genericSuccess);
    expect(resetPasswordForEmail).toHaveBeenCalledWith("person@example.com", {
      redirectTo: "http://localhost/auth/reset-password/callback?type=recovery&next=%2Freset-password",
    });
  });

  it("returns the same generic response for known and unknown account requests", async () => {
    const known = await POST(request({ email: "person@example.com" }));
    const unknown = await POST(request({ email: "unknown@example.com" }));
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
  });

  it("keeps account/provider result indistinguishable", async (result) => {
    resetPasswordForEmail.mockResolvedValue(result);
    const response = await POST(request({ email: "person@example.com" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(genericSuccess);
  });

  it("keeps provider error responses generic", async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: { message: "private provider detail" } });
    const response = await POST(request({ email: "provider-error@example.com" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(genericSuccess);
  });

  it("keeps provider exceptions generic", async () => {
    resetPasswordForEmail.mockRejectedValue(new Error("private provider detail"));
    const response = await POST(request({ email: "person@example.com" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(genericSuccess);
  });

  it("rejects malformed JSON and email before calling Supabase", async () => {
    const malformed = await POST(new Request("http://localhost/api/auth/reset-password/request", { method: "POST", body: "{" }));
    const invalid = await POST(request({ email: "not-an-email" }));
    expect(malformed.status).toBe(400);
    expect(invalid.status).toBe(422);
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("keeps the anti-enumeration jitter within the 200–400ms window", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const startedAt = Date.now();
    const response = await POST(request({ email: "timing-check@example.com" }));
    expect(response.status).toBe(200);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(200);
    expect(Date.now() - startedAt).toBeLessThan(600);
    vi.restoreAllMocks();
  });

  it("requires a canonical site URL before sending a recovery email", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const response = await POST(request({ email: "missing-origin@example.com" }));
    expect(response.status).toBe(503);
    expect(createClient).not.toHaveBeenCalled();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it.each([
    ["malformed", "not a URL"],
    ["insecure production URL", "http://recovery.example"],
    ["origin with path", "https://recovery.example/path"],
    ["origin with query", "https://recovery.example/?query=1"],
    ["origin with credentials", "https://user:pass@recovery.example"],
    ["origin with fragment", "https://recovery.example/#fragment"],
  ])("fails safely for %s", async (_label, siteUrl) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", siteUrl);
    const response = await POST(request({ email: "safe@example.com" }));
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body).toEqual({ success: false, error: {
      code: "AUTH_PASSWORD_RESET_UNAVAILABLE",
      message: "Password recovery is temporarily unavailable.",
    } });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(createClient).not.toHaveBeenCalled();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain(siteUrl);
  });

  it("rejects requests when no trusted proxy IP is present", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await POST(request({ email: "person@example.com" }, "", false));
    expect(response.status).toBe(429);
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("enforces both IP and per-email rolling caps", async () => {
    const ipResponses = await Promise.all(Array.from({ length: 6 }, (_, index) => POST(request({ email: `ip-cap-${index}@example.com` }))));
    expect(ipResponses.map((response) => response.status)).toEqual([200, 200, 200, 200, 200, 429]);

    const emailResponses = await Promise.all(Array.from({ length: 4 }, (_, index) => POST(request({ email: "email-cap@example.com" }, `198.51.100.${requestIp + 1 + index}`))));
    expect(emailResponses.map((response) => response.status)).toEqual([200, 200, 200, 429]);
    for (const response of [...ipResponses, ...emailResponses].filter((item) => item.status === 429)) {
      expect(response.headers.get("retry-after")).toBe("900");
    }
  });

  it("ignores an attacker-controlled request Host and uses the configured canonical origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://recovery.example");
    const requestWithAttackerHost = new Request("https://attacker.example/api/auth/reset-password/request", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": `198.51.100.${requestIp}` },
      body: JSON.stringify({ email: "safe@example.com" }),
    });
    const response = await POST(requestWithAttackerHost);
    expect(response.status).toBe(200);
    const redirectTo = new URL(resetPasswordForEmail.mock.calls[0][1].redirectTo);
    expect(redirectTo.origin).toBe("https://recovery.example");
    expect(redirectTo.origin).not.toBe("https://attacker.example");
  });

  it("accepts production recovery without verification", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://recovery.example");
    const response = await POST(request({ email: " Person@Example.com " }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(genericSuccess);
    expect(resetPasswordForEmail).toHaveBeenCalledOnce();
    expect(resetPasswordForEmail).toHaveBeenCalledWith("person@example.com", expect.anything());
  });

  it("rejects password reset request without Turnstile token when TURNSTILE_SECRET_KEY is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret-key");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://recovery.example");
    const response = await POST(request({ email: "safe@example.com" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(genericSuccess);
    expect(resetPasswordForEmail).toHaveBeenCalledOnce();
    const callArgs = resetPasswordForEmail.mock.calls[0][1];
    expect(callArgs.redirectTo).toContain("/auth/reset-password/callback");
    expect(callArgs.captchaToken).toBeUndefined();
  });

  it("forwards captchaToken to Supabase when turnstileToken is provided", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret-key");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://recovery.example");
    const response = await POST(request({ email: "safe@example.com", turnstileToken: "valid-token" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(genericSuccess);
    expect(resetPasswordForEmail).toHaveBeenCalledOnce();
    expect(resetPasswordForEmail).toHaveBeenCalledWith("safe@example.com", expect.objectContaining({
      redirectTo: expect.stringContaining("/auth/reset-password/callback"),
      captchaToken: "valid-token",
    }));
  });

  it("does not call verifyTurnstileToken locally when TURNSTILE_SECRET_KEY is set", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret-key");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://recovery.example");
    const response = await POST(request({ email: "safe@example.com", turnstileToken: "valid-token" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(genericSuccess);
    // verifyTurnstileToken is no longer imported or called
  });
});
