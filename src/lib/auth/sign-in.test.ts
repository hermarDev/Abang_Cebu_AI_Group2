import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInWithEmail, getPostLoginRedirect } from "./sign-in";

const { signInWithPassword, signOut, maybeSingle, from } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  maybeSingle: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithPassword, signOut },
    from,
  }),
}));

beforeEach(() => {
  signInWithPassword.mockReset().mockResolvedValue({
    data: { user: { id: "user-1" }, session: {} },
    error: null,
  });
  signOut.mockReset().mockResolvedValue({ error: null });
  maybeSingle.mockReset().mockResolvedValue({
    data: { role: "renter", is_suspended: false },
    error: null,
  });
  from.mockReset().mockReturnValue({
    select: () => ({ eq: () => ({ maybeSingle }) }),
  });
});

describe("signInWithEmail", () => {
  it("passes only email and password to Supabase Auth", async () => {
    await signInWithEmail("renter@example.com", "Password1!");
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "renter@example.com", password: "Password1!",
    });
  });

  it("signs in with Supabase and accepts the canonical matching profile role", async () => {
    await expect(
      signInWithEmail(" renter@example.com ", "Password1!"),
    ).resolves.toEqual({ success: true, role: "renter" });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "renter@example.com",
      password: "Password1!",
    });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("uses the canonical profile role without a client-selected role", async () => {
    maybeSingle.mockResolvedValue({ data: { role: "landlord", is_suspended: false }, error: null });
    await expect(
      signInWithEmail("renter@example.com", "Password1!"),
    ).resolves.toEqual({ success: true, role: "landlord" });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("clears suspended users' local sessions", async () => {
    maybeSingle.mockResolvedValue({
      data: { role: "renter", is_suspended: true },
      error: null,
    });
    await expect(
      signInWithEmail("renter@example.com", "Password1!"),
    ).resolves.toMatchObject({
      success: false,
      message: "This account is suspended. Contact support for help.",
    });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("returns a sanitized authentication error without reading a profile", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "invalid_credentials", message: "private provider detail" },
    });
    const result = await signInWithEmail(
      "renter@example.com",
      "wrong",
    );
    expect(result).toMatchObject({
      success: false,
      message: "Invalid email or password.",
    });
    expect(JSON.stringify(result)).not.toContain("private provider detail");
    expect(from).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid grant (HTTP 400)", { code: "invalid_grant", status: 400 }, "Invalid email or password."],
    ["legacy status-only rejection (HTTP 400)", { status: 400 }, "Invalid email or password."],
    ["invalid credentials (HTTP 400)", { code: "invalid_credentials", status: 400 }, "Invalid email or password."],
    ["rate limit exceeded (HTTP 429 / over_request_rate_limit)", { code: "over_request_rate_limit", status: 429 }, "Too many login attempts. Please try again later."],
    ["rate limit exceeded (HTTP 429 status code)", { status: 429 }, "Too many login attempts. Please try again later."],
    ["email not confirmed (HTTP 400)", { code: "email_not_confirmed", status: 400 }, "Your email address is not yet verified."],
    ["email not confirmed (HTTP 403)", { code: "email_not_confirmed", status: 403 }, "Your email address is not yet verified."],
    ["server failure (HTTP 503)", { code: "unexpected_failure", status: 503 }, "Sign in is temporarily unavailable. Please try again."],
  ])("sanitizes returned login error: %s", async (_condition, providerError, message) => {
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { ...providerError, message: "private provider detail" },
    });
    const result = await signInWithEmail("renter@example.com", "wrong");
    expect(result).toEqual({ success: false, message });
    expect(JSON.stringify(result)).not.toContain("private provider detail");
    expect(from).not.toHaveBeenCalled();
  });

  it("sanitizes a thrown authentication failure", async () => {
    signInWithPassword.mockRejectedValue(new Error("private provider detail"));
    const result = await signInWithEmail("renter@example.com", "wrong");
    expect(result).toEqual({ success: false, message: "Sign in is temporarily unavailable. Please try again." });
    expect(JSON.stringify(result)).not.toContain("private provider detail");
  });

  it("returns an unavailable message when the provider returns no user or error", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null });
    await expect(signInWithEmail("renter@example.com", "wrong")).resolves.toEqual({
      success: false, message: "Sign in is temporarily unavailable. Please try again.",
    });
  });

  it("fails closed and clears the session if reading the canonical profile throws", async () => {
    maybeSingle.mockRejectedValue(new Error("connection failed"));
    await expect(
      signInWithEmail("renter@example.com", "Password1!"),
    ).resolves.toMatchObject({
      success: false,
      message: "We could not verify this account. Please try again.",
    });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});

describe("getPostLoginRedirect", () => {
  it("keeps landlords in the workspace for map destinations", () => {
    expect(getPostLoginRedirect("/", "landlord")).toBe("/landlord/dashboard");
    expect(getPostLoginRedirect("/map?view=all", "landlord")).toBe("/landlord/dashboard");
    expect(getPostLoginRedirect("/landlord/map", "landlord")).toBe("/landlord/map");
  });

  it("defaults landlords to their dashboard while honoring safe destinations", () => {
    expect(getPostLoginRedirect(null, "landlord")).toBe("/landlord/dashboard");
    expect(getPostLoginRedirect(null, "renter")).toBe("/");
    expect(getPostLoginRedirect("/favorites", "landlord")).toBe("/favorites");
    expect(getPostLoginRedirect("//attacker.example", "landlord")).toBe("/landlord/dashboard");
  });

  it("returns only a safe local destination", () => {
    expect(getPostLoginRedirect("/favorites?tab=saved")).toBe("/favorites?tab=saved");
    expect(getPostLoginRedirect("//attacker.example")).toBe("/");
    expect(getPostLoginRedirect("https://attacker.example")).toBe("/");
    expect(getPostLoginRedirect("/\\\\attacker.example")).toBe("/");
    expect(getPostLoginRedirect(null)).toBe("/");
  });
});
