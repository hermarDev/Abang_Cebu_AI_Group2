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
  it("signs in with Supabase and accepts the canonical matching profile role", async () => {
    await expect(
      signInWithEmail(" renter@example.com ", "Password1!", "renter"),
    ).resolves.toEqual({ success: true });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "renter@example.com",
      password: "Password1!",
    });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("clears the new local session when the selected role differs from the profile", async () => {
    await expect(
      signInWithEmail("renter@example.com", "Password1!", "landlord"),
    ).resolves.toMatchObject({
      success: false,
      message: "This account does not have the selected role.",
    });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("clears suspended users' local sessions", async () => {
    maybeSingle.mockResolvedValue({
      data: { role: "renter", is_suspended: true },
      error: null,
    });
    await expect(
      signInWithEmail("renter@example.com", "Password1!", "renter"),
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
      "renter",
    );
    expect(result).toMatchObject({
      success: false,
      message: "Invalid email or password.",
    });
    expect(JSON.stringify(result)).not.toContain("private provider detail");
    expect(from).not.toHaveBeenCalled();
  });

  it("fails closed and clears the session if reading the canonical profile throws", async () => {
    maybeSingle.mockRejectedValue(new Error("connection failed"));
    await expect(
      signInWithEmail("renter@example.com", "Password1!", "renter"),
    ).resolves.toMatchObject({
      success: false,
      message: "We could not verify this account. Please try again.",
    });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});

describe("getPostLoginRedirect", () => {
  it("returns only a safe local destination", () => {
    expect(getPostLoginRedirect("/favorites?tab=saved")).toBe("/favorites?tab=saved");
    expect(getPostLoginRedirect("//attacker.example")).toBe("/");
    expect(getPostLoginRedirect("https://attacker.example")).toBe("/");
    expect(getPostLoginRedirect("/\\\\attacker.example")).toBe("/");
    expect(getPostLoginRedirect(null)).toBe("/");
  });
});
