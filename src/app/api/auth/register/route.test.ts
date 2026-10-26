import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const signUp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signUp } }) }));

function request(body: unknown) {
  return new Request("http://localhost/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

const goodPayload = { email: "Mika@Example.com", password: "Password1!", fullName: "Mika Santos", role: "renter" };

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("registration route", () => {
  it("rejects production requests without verification before contacting Supabase", async () => {
    vi.stubEnv("NODE_ENV", "production");
    signUp.mockReset();
    const response = await POST(request(goodPayload));
    expect(response.status).toBe(403);
    expect(signUp).not.toHaveBeenCalled();
  });

  it("rejects failed production verification without contacting Supabase", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "synthetic-test-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) }));
    signUp.mockReset();
    const response = await POST(request({ ...goodPayload, turnstileToken: "synthetic-test-token" }));
    expect(response.status).toBe(403);
    expect(signUp).not.toHaveBeenCalled();
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
  it.each(["renter", "landlord"])("returns %s email confirmation to the existing map route", async (role) => {
    signUp.mockReset().mockResolvedValue({ data: { user: { id: "u1", email: "mika@example.com", created_at: "2026-10-15T00:00:00Z", email_confirmed_at: null } }, error: null });
    await POST(request({ ...goodPayload, role }));
    const options = signUp.mock.calls[0][0].options;
    const destination = new URL(options.emailRedirectTo);
    expect(destination.pathname).toBe("/auth/callback");
    expect(destination.searchParams.get("next")).toBe("/");
    expect(options.data.role).toBe(role);
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
