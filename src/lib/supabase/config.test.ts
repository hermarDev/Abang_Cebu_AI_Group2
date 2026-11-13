import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { browser, server } = vi.hoisted(() => ({ browser: vi.fn(), server: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createBrowserClient: browser, createServerClient: server }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }));

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PHASE", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key");
  browser.mockReset();
  server.mockReset().mockReturnValue({ auth: { getUser: async () => ({}) } });
});
afterEach(() => vi.unstubAllEnvs());

describe("Supabase configuration", () => {
  it.each([
    ["", "public-key"],
    ["https://placeholder.supabase.co", "public-key"],
    ["https://project.supabase.co", ""],
    ["https://project.supabase.co", "placeholder-anon-key"],
  ])("rejects invalid production config before client creation", async (url, key) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", key);
    const client = await import("./client");
    const serverClient = await import("./server");
    const middleware = await import("./middleware");
    expect(() => client.createClient()).toThrow("configuration is missing");
    await expect(serverClient.createClient()).rejects.toThrow("configuration is missing");
    await expect(middleware.updateSession(new NextRequest("https://example.com"))).rejects.toThrow("configuration is missing");
    expect(browser).not.toHaveBeenCalled();
    expect(server).not.toHaveBeenCalled();
  });

  it("accepts valid production config", async () => {
    const client = await import("./client");
    const serverClient = await import("./server");
    const middleware = await import("./middleware");
    client.createClient();
    await serverClient.createClient();
    await middleware.updateSession(new NextRequest("https://example.com"));
    expect(browser).toHaveBeenCalledWith("https://project.supabase.co", "public-key", expect.any(Object));
    expect(server).toHaveBeenCalledTimes(2);
  });

  it("permits local development configuration", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    const client = await import("./client");
    client.createClient();
    expect(browser).toHaveBeenCalledWith("http://127.0.0.1:54321", "public-key", expect.any(Object));
  });
});
