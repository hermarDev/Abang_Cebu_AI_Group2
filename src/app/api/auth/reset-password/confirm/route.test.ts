import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { getUser, getSession, getClaims, updateUser, signOut, cookieGet, cookieDelete } = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  getClaims: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  cookieGet: vi.fn(),
  cookieDelete: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser, getSession, getClaims, updateUser, signOut } }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieGet, delete: cookieDelete }) }));

function request(body: unknown) {
  return new Request("http://localhost/api/auth/reset-password/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const valid = { newPassword: "NewStrong1!", confirmPassword: "NewStrong1!" };

describe("password reset confirmation route", () => {
  beforeEach(() => {
    cookieGet.mockReset().mockReturnValue({ value: "1" });
    cookieDelete.mockReset();
    getUser.mockReset().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    getSession.mockReset().mockResolvedValue({ data: { session: { access_token: "access" } }, error: null });
    getClaims.mockReset().mockResolvedValue({ data: { claims: { amr: [{ method: "recovery" }] } }, error: null });
    updateUser.mockReset().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    signOut.mockReset().mockResolvedValue({ error: null });
  });

  it("requires valid matching password input", async () => {
    const weak = await POST(request({ newPassword: "weak", confirmPassword: "weak" }));
    const mismatch = await POST(request({ newPassword: valid.newPassword, confirmPassword: "OtherStrong1!" }));
    expect(weak.status).toBe(422);
    expect(mismatch.status).toBe(400);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("requires the recovery marker and an authenticated user", async () => {
    cookieGet.mockReturnValue(undefined);
    const response = await POST(request(valid));
    expect(response.status).toBe(401);
    expect(getUser).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("rejects expired or absent recovery users before mutating auth", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "expired" } });
    const response = await POST(request(valid));
    expect(response.status).toBe(401);
    expect(updateUser).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("requires a valid Supabase session before password mutation", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    const response = await POST(request(valid));
    expect(response.status).toBe(401);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("requires cryptographically verified recovery claims", async () => {
    getClaims.mockResolvedValue({ data: { claims: { amr: [{ method: "password" }] } }, error: null });
    const response = await POST(request(valid));
    expect(response.status).toBe(401);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("updates password then revokes all sessions", async () => {
    const response = await POST(request(valid));
    expect(response.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith({ password: valid.newPassword });
    expect(signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(updateUser.mock.invocationCallOrder[0]).toBeLessThan(signOut.mock.invocationCallOrder[0]);
    expect(cookieDelete).toHaveBeenCalledWith("abangcebu-password-reset");
    expect(await response.json()).toMatchObject({ success: true, data: { redirectUrl: "/login?message=password_reset_success" } });
  });

  it("does not revoke sessions if the password update fails", async () => {
    updateUser.mockResolvedValue({ error: { message: "private provider detail" } });
    const response = await POST(request(valid));
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("private provider detail");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("reports failed global revocation instead of claiming success", async () => {
    signOut.mockResolvedValue({ error: { message: "provider detail" } });
    const response = await POST(request(valid));
    expect(response.status).toBe(502);
    const body = await response.text();
    expect(body).toContain("revocation failed");
    expect(body).not.toContain("provider detail");
  });
});
