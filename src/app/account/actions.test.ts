import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  profile: { full_name: "Test User", phone_number: null as string | null, avatar_url: null as string | null },
  update: vi.fn(),
  updateUser: vi.fn(async () => ({ error: null })),
  signIn: vi.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })),
  user: { id: "user-1", email: "test@example.invalid", identities: [{ provider: "email" }] } as { id: string; email: string; identities?: { provider: string }[] } | null,
  upload: vi.fn(async () => ({ error: null })),
  remove: vi.fn(async () => ({ error: null })),
  signProfileAvatar: vi.fn(async () => "https://example.test/signed.png"),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { signInWithPassword: fixture.signIn } }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        upload: fixture.upload,
        remove: fixture.remove,
      }),
    },
  }),
}));
vi.mock("@/lib/profile-avatar", () => ({
  PROFILE_AVATAR_BUCKET: "avatars",
  signProfileAvatar: fixture.signProfileAvatar,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: fixture.user }, error: null }), updateUser: fixture.updateUser },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { ...fixture.profile }, error: null }) }) }),
      update: (value: typeof fixture.profile) => {
        fixture.update(value);
        return { eq: () => ({ select: () => ({ maybeSingle: async () => {
          fixture.profile = value;
          return { data: { id: "user-1" }, error: null };
        } }) }) };
      },
    }),
  }),
}));

import { revalidatePath } from "next/cache";
import { removeAccountAvatar, updateAccountAvatar, updateAccountPassword, updateAccountProfile } from "./actions";

describe("account password safety gate", () => {
  it("rejects invalid new passwords before contacting the provider", async () => {
    fixture.updateUser.mockClear();
    const data = new FormData();
    data.set("currentPassword", "Synthetic2!");
    data.set("password", "weak");
    data.set("confirmPassword", "weak");
    const result = await updateAccountPassword(data);
    expect(result.success).toBe(false);
    expect(result.message).toContain("8–72");
    expect(fixture.updateUser).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords before contacting the provider", async () => {
    const data = new FormData();
    data.set("currentPassword", "Synthetic2!");
    data.set("password", "Synthetic1!");
    data.set("confirmPassword", "Different1!");
    const result = await updateAccountPassword(data);
    expect(result.success).toBe(false);
    expect(result.message).toContain("match");
  });
  it("verifies the current password before updating without a feature flag", async () => {
    vi.stubEnv("ACCOUNT_PASSWORD_UPDATE_VERIFIED", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    fixture.signIn.mockClear();
    fixture.updateUser.mockClear();
    const data = new FormData();
    data.set("password", "Synthetic1!");
    data.set("confirmPassword", "Synthetic1!");
    data.set("currentPassword", "Synthetic2!");
    const result = await updateAccountPassword(data);
    expect(result.success).toBe(true);
    expect(fixture.signIn).toHaveBeenCalledWith({ email: "test@example.invalid", password: "Synthetic2!" });
    expect(fixture.updateUser).toHaveBeenCalledWith({ password: "Synthetic1!", current_password: "Synthetic2!" });
    vi.unstubAllEnvs();
  });
  it("never updates if verification returns a different account", async () => {
    vi.stubEnv("ACCOUNT_PASSWORD_UPDATE_VERIFIED", "true");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    fixture.updateUser.mockClear();
    fixture.signIn.mockResolvedValueOnce({ data: { user: { id: "another-user" } }, error: null });
    const data = new FormData();
    data.set("password", "Synthetic1!"); data.set("confirmPassword", "Synthetic1!"); data.set("currentPassword", "Synthetic2!");
    const result = await updateAccountPassword(data);
    expect(result.success).toBe(false);
    expect(result.field).toBeUndefined();
    expect(fixture.updateUser).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
  it("identifies invalid credentials without updating the password", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    fixture.updateUser.mockClear();
    fixture.signIn.mockResolvedValueOnce({ data: { user: null }, error: { code: "invalid_credentials" } } as never);
    const data = new FormData();
    data.set("password", "Synthetic1!"); data.set("confirmPassword", "Synthetic1!"); data.set("currentPassword", "Synthetic2!");
    expect(await updateAccountPassword(data)).toMatchObject({ success: false, field: "currentPassword" });
    expect(fixture.updateUser).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
  it("returns generic failure when the password update promise rejects", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    fixture.updateUser.mockRejectedValueOnce(new Error("mock response lost"));
    const data = new FormData();
    data.set("password", "Synthetic1!"); data.set("confirmPassword", "Synthetic1!"); data.set("currentPassword", "Synthetic2!");
    try {
      const result = await updateAccountPassword(data);
      expect(result).toEqual({ success: false, message: "We couldn’t update your password. Please try again." });
      expect(fixture.updateUser).toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("never updates if current-password verification fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    fixture.updateUser.mockClear();
    fixture.signIn.mockResolvedValueOnce({ data: { user: null }, error: { code: "service_unavailable" } } as never);
    const data = new FormData();
    data.set("password", "Synthetic1!");
    data.set("confirmPassword", "Synthetic1!");
    data.set("currentPassword", "Synthetic2!");
    const result = await updateAccountPassword(data);
    expect(result.success).toBe(false);
    expect(result.field).toBeUndefined();
    expect(result.message).toBe("Password verification is temporarily unavailable. Please try again later.");
    expect(fixture.updateUser).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});

function form(phone: string) {
  const data = new FormData();
  data.set("fullName", "Test User");
  data.set("phoneNumber", phone);
  return data;
}

describe("account Philippine mobile number", () => {
  beforeEach(() => { fixture.profile = { full_name: "Test User", phone_number: null, avatar_url: null }; fixture.update.mockClear(); });

  it.each(["09123456789", "9123456789", "+639123456789", "912 345 6789"])("saves %s in E.164", async (number) => {
    const result = await updateAccountProfile(form(number));
    expect(result.success).toBe(true);
    expect(fixture.profile.phone_number).toBe("+639123456789");
  });

  it("preserves an unchanged international number when updating the name", async () => {
    fixture.profile.phone_number = "+14155552671";
    const data = form("+14155552671");
    data.set("fullName", "Updated User");
    const result = await updateAccountProfile(data);
    expect(result.success).toBe(true);
    expect(fixture.profile).toEqual({ full_name: "Updated User", phone_number: "+14155552671" });
  });

  it("edits and clears the saved number", async () => {
    await updateAccountProfile(form("09123456789"));
    await updateAccountProfile(form("09171234567"));
    expect(fixture.profile.phone_number).toBe("+639171234567");
    await updateAccountProfile(form(""));
    expect(fixture.profile.phone_number).toBeNull();
  });

  it.each(["+141****2671", "0212345678", "12345", "91234567890", "912abc3456789"])("rejects %s without writing", async (number) => {
    const result = await updateAccountProfile(form(number));
    expect(result.success).toBe(false);
    expect(fixture.update).not.toHaveBeenCalled();
  });
});

describe("account avatar actions", () => {
  beforeEach(() => {
    fixture.profile = { full_name: "Test User", phone_number: null, avatar_url: "user-1/old.png" };
    fixture.upload.mockClear();
    fixture.remove.mockClear();
    fixture.signProfileAvatar.mockClear();
    vi.mocked(revalidatePath).mockClear();
  });

  it("updates avatar and revalidates account, home, landlord, and all admin routes", async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], "avatar.png", { type: "image/png" });
    const data = new FormData();
    data.set("avatar", file);

    const result = await updateAccountAvatar(data);
    expect(result.success).toBe(true);
    expect(result.avatarUrl).toBe("https://example.test/signed.png");
    expect(revalidatePath).toHaveBeenCalledWith("/account");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    for (const path of ["/landlord/dashboard", "/landlord/properties", "/landlord/messages", "/admin/dashboard", "/admin/reviews", "/admin/accounts", "/admin/reports", "/admin/audit"]) {
      expect(revalidatePath).toHaveBeenCalledWith(path);
    }
  });

  it("removes avatar and revalidates account, home, landlord, and all admin routes", async () => {
    const result = await removeAccountAvatar();
    expect(result.success).toBe(true);
    expect(result.avatarUrl).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/account");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    for (const path of ["/landlord/dashboard", "/landlord/properties", "/landlord/messages", "/admin/dashboard", "/admin/reviews", "/admin/accounts", "/admin/reports", "/admin/audit"]) {
      expect(revalidatePath).toHaveBeenCalledWith(path);
    }
  });
});
