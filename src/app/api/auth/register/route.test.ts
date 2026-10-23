import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const signUp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signUp } }) }));

function request(body: unknown) {
  return new Request("http://localhost/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

const goodPayload = { email: "Mika@Example.com", password: "Password1!", fullName: "Mika Santos", role: "renter" };

describe("registration route", () => {
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
    expect(await response.json()).toMatchObject({ success: true, data: { requiresEmailVerification: true, user: { role: "renter" } } });
  });
  it("returns a sanitized failure when Supabase rejects registration", async () => {
    signUp.mockReset().mockResolvedValue({ data: { user: null }, error: { message: "private upstream detail" } });
    const response = await POST(request(goodPayload));
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).not.toContain("private upstream detail");
  });

  it("maps user_already_exists error correctly", async () => {
    signUp.mockReset().mockResolvedValue({ data: { user: null }, error: { code: "user_already_exists", message: "User already registered" } });
    const response = await POST(request(goodPayload));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("EMAIL_ALREADY_REGISTERED");
  });
});
