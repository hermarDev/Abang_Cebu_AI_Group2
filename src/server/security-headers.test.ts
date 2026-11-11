import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("HTTP Security Headers Configuration", () => {
  it("defines security headers for all paths", async () => {
    expect(typeof nextConfig.headers).toBe("function");
    const headersConfig = await nextConfig.headers!();
    expect(headersConfig).toHaveLength(1);
    expect(headersConfig[0].source).toBe("/:path*");

    const headersMap = new Map(headersConfig[0].headers.map((h) => [h.key, h.value]));

    expect(headersMap.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headersMap.get("X-Frame-Options")).toBe("DENY");
    expect(headersMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headersMap.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=(self)");
    expect(headersMap.get("Strict-Transport-Security")).toContain("max-age=31536000");

    const csp = headersMap.get("Content-Security-Policy-Report-Only");
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("*.supabase.co");
    expect(csp).toContain("https://api.groq.com");
    expect(csp).toContain("https://photon.komoot.io");
  });
});
