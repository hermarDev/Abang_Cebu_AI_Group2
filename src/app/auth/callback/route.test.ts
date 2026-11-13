import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { exchangeCodeForSession } = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { exchangeCodeForSession } }) }));

function request(query: string) {
  return new Request(`http://localhost/auth/callback${query}`);
}

describe("auth callback route", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost");
    exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("uses NEXT_PUBLIC_SITE_URL canonical origin when configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://abangcebu.tech");
    const response = await GET(request("?code=test-code&next=%2F"));
    expect(response.headers.get("location")).toBe("https://abangcebu.tech/");
  });

  it.each(["", "invalid", "http://example.com", "https://user:pass@example.com", "https://example.com/path", "https://example.com/?x=1", "https://example.com/#x"])("rejects invalid production canonical origin without exchanging code", async (siteUrl) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", siteUrl);
    const response = await GET(new Request("https://attacker.example/auth/callback?code=one-time-code"));
    expect(response.status).toBe(503);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("requires a PKCE code", async () => {
    const response = await GET(request("?type=recovery"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?error=invalid_auth_link");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("exchanges recovery PKCE code and redirects to the reset form", async () => {
    const response = await GET(request("?code=test-code&type=recovery&next=%2Freset-password"));
    expect(exchangeCodeForSession).toHaveBeenCalledWith("test-code");
    expect(response.headers.get("location")).toBe("http://localhost/reset-password");
  });

  it("blocks unsafe recovery redirects", async () => {
    const response = await GET(request("?code=test-code&type=recovery&next=%2F%2Fevil.example"));
    expect(response.headers.get("location")).toContain("/login?error=invalid_recovery_link");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("returns the expired-link path when PKCE exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: "expired" } });
    const response = await GET(request("?code=expired&type=recovery"));
    expect(response.headers.get("location")).toContain("/login?error=expired_recovery_link");
  });
});
