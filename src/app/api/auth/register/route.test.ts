import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let POST: typeof import("./route").POST;

const signUp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signUp } }) }));

function request(body: unknown, ip: string | null = "198.51.100.1") {
  const headers = new Headers({ "content-type": "application/json" });
  if (ip !== null) headers.set("cf-connecting-ip", ip);
  return new Request("http://localhost/api/auth/register", { method: "POST", headers, body: JSON.stringify(body) });
}

const goodPayload = { email: "Mika@Example.com", password: "Password1!", fullName: "Mika Santos", role: "renter" };

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("registration route", () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ POST } = await import("./route"));
  });

  it("limits normalized email across IPs before contacting Supabase and resets after the window", async () => {
    vi.useFakeTimers();
    try {
      signUp.mockReset().mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
      for (let i = 0; i < 3; i++) {
        const response = await POST(request({ ...goodPayload, email: i % 2 ? " mika@example.com " : "MIKA@example.com" }, `198.51.100.${i + 1}`));
        expect(response.status).toBe(201);
      }
      vi.advanceTimersByTime(15 * 60 * 1000 - 1);
      const limited = await POST(request(goodPayload, "198.51.100.4"));
      expect(limited.status).toBe(429);
      expect(limited.headers.get("retry-after")).toBe("900");
      expect(signUp).toHaveBeenCalledTimes(3);
      vi.advanceTimersByTime(1);
      expect((await POST(request(goodPayload, "198.51.100.5"))).status).toBe(201);
      expect(signUp).toHaveBeenCalledTimes(4);
    } finally { vi.useRealTimers(); }
  });

  it("limits one IP across different emails before contacting Supabase", async () => {
    signUp.mockReset().mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    for (let i = 0; i < 5; i++) {
      expect((await POST(request({ ...goodPayload, email: `person${i}@example.com` }))).status).toBe(201);
    }
    expect((await POST(request({ ...goodPayload, email: "other@example.com" }))).status).toBe(429);
    expect(signUp).toHaveBeenCalledTimes(5);
  });

  it("fails closed in production without a trusted proxy IP", async () => {
    vi.stubEnv("NODE_ENV", "production");
    signUp.mockClear();
    const response = await POST(request(goodPayload, null));
    expect(response.status).toBe(429);
    expect(signUp).not.toHaveBeenCalled();
  });
  it("forwards the Turnstile token unchanged to Supabase Auth", async () => {
    signUp.mockReset().mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const response = await POST(request({ ...goodPayload, turnstileToken: " provider-owned-token " }));
    expect(response.status).toBe(201);
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({ captchaToken: "provider-owned-token" }),
    }));
  });

  it("maps a hosted Supabase CAPTCHA rejection without exposing provider detail", async () => {
    signUp.mockReset().mockResolvedValue({ data: { user: null }, error: { code: "captcha_failed", message: "private provider detail" } });
    const response = await POST(request({ ...goodPayload, turnstileToken: "invalid-token" }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("CAPTCHA_VERIFICATION_FAILED");
    expect(body.error.message).not.toContain("private provider detail");
  });
  it("rejects admin role before contacting Supabase", async () => {
    signUp.mockClear();
    const response = await POST(request({ ...goodPayload, role: "admin" }));
    expect(response.status).toBe(422);
    expect(signUp).not.toHaveBeenCalled();
  });
  it("creates an allow-listed registration and returns a verification response", async () => {
    signUp.mockReset().mockResolvedValue({ data: { user: { id: "u1", email: "mika@example.com", created_at: "2026-10-15T00:00:00Z", email_confirmed_at: null } }, error: null });
    const response = await POST(request({ ...goodPayload, is_admin: true }));
    expect(response.status).toBe(201);
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ email: "mika@example.com", options: expect.objectContaining({ data: { role: "renter", full_name: "Mika Santos" }, emailRedirectTo: expect.stringContaining("/auth/callback") }) }));
    expect(await response.json()).toEqual({ success: true, message: "If registration can proceed, check your email for the next steps." });
  });
  it.each([
    ["renter", "/"],
    ["landlord", "/"],
  ])("returns %s email confirmation to its destination route", async (role, expectedNext) => {
    signUp.mockReset().mockResolvedValue({ data: { user: { id: "u1", email: "mika@example.com", created_at: "2026-10-15T00:00:00Z", email_confirmed_at: null } }, error: null });
    await POST(request({ ...goodPayload, role }));
    const options = signUp.mock.calls[0][0].options;
    const destination = new URL(options.emailRedirectTo);
    expect(destination.pathname).toBe("/auth/callback");
    expect(destination.searchParams.get("next")).toBe(expectedNext);
    expect(options.data.role).toBe(role);
  });

  it("shows actionable feedback when confirmation email is rate limited", async () => {
    signUp.mockReset().mockResolvedValue({ data: { user: null }, error: { code: "over_email_send_rate_limit", message: "private provider detail" } });
    const response = await POST(request(goodPayload));
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error.message).toBe("Too many confirmation emails requested. Please try again later.");
    expect(JSON.stringify(body)).not.toContain("private provider detail");
  });

  it("returns a sanitized failure when Supabase rejects registration", async () => {
    signUp.mockReset().mockResolvedValue({ data: { user: null }, error: { message: "private upstream detail" } });
    const response = await POST(request(goodPayload));
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).not.toContain("private upstream detail");
  });

  it.each([
    { code: "user_already_exists", message: "User already registered" },
    { message: "User already exists" },
  ])("keeps duplicate registration indistinguishable from new registration: %j", async (error) => {
    signUp.mockReset().mockResolvedValue({ data: { user: { id: "synthetic-user" } }, error: null });
    const created = await POST(request(goodPayload));
    const createdBody = await created.json();
    signUp.mockResolvedValue({ data: { user: null }, error });
    const duplicate = await POST(request(goodPayload));
    expect(duplicate.status).toBe(created.status);
    expect(await duplicate.json()).toEqual(createdBody);
    expect(createdBody).toEqual({ success: true, message: "If registration can proceed, check your email for the next steps." });
  });
});
