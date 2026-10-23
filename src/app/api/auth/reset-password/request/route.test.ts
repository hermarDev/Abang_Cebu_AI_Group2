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

  it("rejects requests when no trusted proxy IP is present", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 })));
    const response = await POST(request({ email: "person@example.com", turnstileToken: "test-token" }, "", false));
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

  it("fails closed when Turnstile is unavailable or rejects the token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(request({ email: "turnstile@example.com", turnstileToken: "bad-token" }));
    expect(response.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("fails closed when Turnstile is not configured in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const response = await POST(request({ email: "person@example.com" }));
    expect(response.status).toBe(403);
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });
});
