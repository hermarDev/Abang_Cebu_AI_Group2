import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  createServerClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));

import { invalidateProfileCache, loadProfile, resetProfileCache } from "./profile";

beforeEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  resetProfileCache();
  mocks.getUser.mockReset().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  mocks.profile.mockReset().mockResolvedValue({
    data: {
      id: "user-1",
      role: "renter",
      full_name: "Test User",
      phone_number: null,
      avatar_url: null,
      is_suspended: false,
    },
    error: null,
  });
  mocks.createServerClient.mockReset().mockImplementation(() => ({
    auth: { getUser: mocks.getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
  }));
});

describe("loadProfile", () => {
  it("returns the signed-in user and profile", async () => {
    const result = await loadProfile();
    expect(result.user?.id).toBe("user-1");
    expect(result.profile?.role).toBe("renter");
    expect(result.profileError).toBeNull();
  });

  it("uses one auth lookup and one profile lookup per call", async () => {
    await loadProfile();
    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    expect(mocks.profile).toHaveBeenCalledTimes(1);
  });

  it("does not query profiles for guests", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await loadProfile();
    expect(result.user).toBeNull();
    expect(result.profile).toBeNull();
    expect(mocks.profile).not.toHaveBeenCalled();
  });

  it("always verifies the session via getUser and caches profile rows for 30s", async () => {
    vi.stubEnv("VITEST", "");

    const first = await loadProfile();
    const second = await loadProfile();
    expect(first.user?.id).toBe("user-1");
    expect(second.profile?.role).toBe("renter");
    expect(mocks.getUser).toHaveBeenCalledTimes(2);
    expect(mocks.profile).toHaveBeenCalledTimes(1);

    invalidateProfileCache("user-1");
    await loadProfile();
    expect(mocks.getUser).toHaveBeenCalledTimes(3);
    expect(mocks.profile).toHaveBeenCalledTimes(2);
  });

  it("rejects globally revoked sessions when getUser returns an error or null user", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: "Session from session_id claim in JWT does not exist" } });

    const result = await loadProfile();
    expect(result.user).toBeNull();
    expect(result.profile).toBeNull();
    expect(result.authError).toBeTruthy();
    expect(mocks.profile).not.toHaveBeenCalled();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });
});
