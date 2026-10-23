import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClient, exchangeCodeForSession, cookieGetAll } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  cookieGetAll: vi.fn(() => []),
}));
vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: cookieGetAll }) }));

let GET: typeof import("./route").GET;

function request(query: string) {
  return new Request(`http://localhost/auth/reset-password/callback${query}`);
}

describe("password reset PKCE callback", () => {
  beforeEach(async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    vi.resetModules();
    exchangeCodeForSession.mockReset().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    createServerClient.mockReset().mockImplementation((_url, _key, options) => ({
      auth: {
        exchangeCodeForSession: async (...args: unknown[]) => {
          options.cookies.setAll([{ name: "sb-access-token", value: "session", options: { httpOnly: true, path: "/" } }]);
          return exchangeCodeForSession(...args);
        },
      },
    }));
    cookieGetAll.mockReset().mockReturnValue([]);
    ({ GET } = await import("./route"));
  });

  it("rejects malformed and non-recovery callback requests", async () => {
    const noCode = await GET(request("?type=recovery"));
    const otherType = await GET(request("?code=one-time-code&type=signup"));
    expect(noCode.headers.get("location")).toContain("invalid_recovery_link");
    expect(otherType.headers.get("location")).toContain("invalid_recovery_link");
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("rejects a callback without a canonical origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const response = await GET(request("?code=one-time-code&type=recovery&next=%2Freset-password"));
    expect(response.status).toBe(503);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("exchanges a recovery code, persists Supabase cookies, and sets short-lived HttpOnly marker", async () => {
    const response = await GET(request("?code=one-time-code&type=recovery&next=%2Freset-password"));
    expect(createServerClient).toHaveBeenCalledWith("https://project.supabase.co", "public-anon-key", expect.any(Object));
    expect(exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
    expect(response.headers.get("location")).toBe("http://localhost/reset-password");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    const cookies = response.headers.getSetCookie();
    expect(cookies.some((cookie) => cookie.includes("sb-access-token=session"))).toBe(true);
    expect(cookies.some((cookie) => cookie.includes("abangcebu-password-reset=1") && cookie.includes("HttpOnly"))).toBe(true);
  });

  it("rejects unsafe redirects before exchanging the code", async () => {
    const response = await GET(request("?code=one-time-code&type=recovery&next=%2F%2Fevil.example"));
    expect(response.headers.get("location")).toContain("invalid_recovery_link");
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("sends transient rejected PKCE exchanges to a safe error redirect", async () => {
    exchangeCodeForSession.mockRejectedValue(new Error("network unavailable"));
    const response = await GET(request("?code=transient&type=recovery&next=%2Freset-password"));
    expect(response.headers.get("location")).toContain("expired_recovery_link");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.getSetCookie().some((cookie) => cookie.includes("abangcebu-password-reset=1"))).toBe(false);
  });

  it("sends expired codes to sign-in without issuing a recovery marker", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { user: null }, error: { message: "expired" } });
    const response = await GET(request("?code=expired&type=recovery"));
    expect(response.headers.get("location")).toContain("expired_recovery_link");
    expect(response.headers.getSetCookie().some((cookie) => cookie.includes("abangcebu-password-reset=1"))).toBe(false);
  });
});
