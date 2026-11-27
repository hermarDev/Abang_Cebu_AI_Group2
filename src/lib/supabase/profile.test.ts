import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getClaims: vi.fn(),
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
  mocks.getClaims.mockReset();
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

  it("verifies JWT claims locally when getClaims is available and caches profile rows for 30s", async () => {
    vi.stubEnv("VITEST", "");
    mocks.createServerClient.mockImplementation(() => ({
      auth: { getClaims: mocks.getClaims, getUser: mocks.getUser },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
    }));
    mocks.getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: "user-claims-1",
          email: "renter@example.com",
          user_metadata: { full_name: "Renter" },
        },
      },
      error: null,
    });

    const first = await loadProfile();
    const second = await loadProfile();
    expect(first.user?.id).toBe("user-claims-1");
    expect(first.user?.email).toBe("renter@example.com");
    expect(second.profile?.role).toBe("renter");
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.profile).toHaveBeenCalledTimes(1);

    invalidateProfileCache("user-claims-1");
    await loadProfile();
    expect(mocks.profile).toHaveBeenCalledTimes(2);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls back to getUser when getClaims fails verification", async () => {
    mocks.createServerClient.mockImplementation(() => ({
      auth: { getClaims: mocks.getClaims, getUser: mocks.getUser },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
    }));
    mocks.getClaims.mockResolvedValue({ data: null, error: { message: "expired" } });

    const result = await loadProfile();
    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    expect(result.user?.id).toBe("user-1");
  });
});
