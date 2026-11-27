import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn() }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
  }),
}));
import { updateSession } from "./middleware";
import { middleware } from "../../../middleware";

beforeEach(() => {
  mocks.getUser.mockReset().mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
  mocks.profile.mockReset().mockResolvedValue({ data: { role: "renter", is_suspended: false }, error: null });
});

describe("workspace routing", () => {
  it.each(["/", "/map", "/login", "/register"])("prevents shared caching of guest %s", async (path) => {
    const response = await middleware(new NextRequest(`https://example.test${path}`));
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it.each([
    ["admin", "/admin/dashboard"],
    ["verification_officer", "/verification/dashboard"],
    ["customer_support", "/support-desk/dashboard"],
    ["landlord", "/landlord/dashboard"],
  ])("redirects %s from public entry routes", async (role, destination) => {
    mocks.profile.mockResolvedValue({ data: { role, is_suspended: false }, error: null });
    for (const path of ["/", "/map", "/login", "/register"]) {
      const response = await updateSession(new NextRequest(`https://example.test${path}`));
      expect(response.headers.get("location")).toBe(`https://example.test${destination}`);
      expect(response.headers.get("cache-control")).toContain("no-store");
    }
  });

  it.each(["expired_recovery_link", "invalid_recovery_link"])(
    "allows signed-in staff through /login?error=%s so recovery alert renders",
    async (errorCode) => {
      mocks.profile.mockResolvedValue({ data: { role: "customer_support", is_suspended: false }, error: null });
      const response = await updateSession(new NextRequest(`https://example.test/login?error=${errorCode}`));
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("cache-control")).toContain("no-store");
    },
  );

  it("does not redirect renter or suspended workspace users from /", async () => {
    const renterResponse = await updateSession(new NextRequest("https://example.test/"));
    expect(renterResponse.headers.get("location")).toBeNull();
    expect(renterResponse.headers.get("cache-control")).toContain("no-store");

    mocks.profile.mockResolvedValue({ data: { role: "customer_support", is_suspended: true }, error: null });
    const suspendedResponse = await updateSession(new NextRequest("https://example.test/"));
    expect(suspendedResponse.headers.get("location")).toBeNull();
    expect(suspendedResponse.headers.get("cache-control")).toContain("no-store");
  });

  it("preserves permitted /login?next= targets while preventing self-login loops", async () => {
    mocks.profile.mockResolvedValue({ data: { role: "admin", is_suspended: false }, error: null });
    const account = await updateSession(new NextRequest("https://example.test/login?next=%2Faccount"));
    expect(account.headers.get("location")).toBe("https://example.test/account");

    const selfLogin = await updateSession(new NextRequest("https://example.test/login?next=%2Flogin"));
    expect(selfLogin.headers.get("location")).toBe("https://example.test/admin/dashboard");

    mocks.profile.mockResolvedValue({ data: { role: "customer_support", is_suspended: false }, error: null });
    const crossRole = await updateSession(new NextRequest("https://example.test/login?next=%2Fadmin%2Freviews"));
    expect(crossRole.headers.get("location")).toBe("https://example.test/support-desk/dashboard");
  });

  it("does not query profiles for workspace requests", async () => {
    await updateSession(new NextRequest("https://example.test/support-desk/dashboard"));
    expect(mocks.profile).not.toHaveBeenCalled();
  });
});

describe("RSC navigation", () => {
  function rscRequest(path: string) {
    return new NextRequest(`https://example.test${path}`, {
      headers: { cookie: "sb-access-token=test" },
    });
  }

  it("skips the session refresh on RSC navigations", async () => {
    const response = await middleware(rscRequest("/landlord/dashboard?_rsc=abc"));
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBeNull();
  });

  it("still refreshes the session on full document navigations", async () => {
    await middleware(rscRequest("/landlord/dashboard"));
    expect(mocks.getUser).toHaveBeenCalledOnce();
  });

  it("keeps no-store on RSC requests to public entry routes", async () => {
    const response = await middleware(rscRequest("/?_rsc=abc"));
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
});
