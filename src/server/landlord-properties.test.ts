vi.mock("server-only", () => ({}));
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchLandlordMapData,
  fetchLandlordPortfolio,
  invalidateLandlordPortfolioCache,
  signPropertyDraftMediaUrls,
} from "./landlord-properties";

const mocks = vi.hoisted(() => ({ createSignedUrls: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ storage: { from: () => ({ createSignedUrls: mocks.createSignedUrls }) } }),
}));

type TableResults = Record<string, { data: unknown; error: unknown }>;

function createMockSupabase(results: TableResults, rpcResult = { data: [], error: null }) {
  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      range: () => chain,
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve(results[table] ?? { data: [], error: null }).then(resolve, reject),
    };
    return chain;
  });
  return {
    from,
    rpc: vi.fn().mockResolvedValue(rpcResult),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  invalidateLandlordPortfolioCache();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("landlord-properties caching", () => {
  it("caches landlord portfolio per user for 30s and invalidates cleanly", async () => {
    vi.stubEnv("VITEST", "");
    const supabase = createMockSupabase({
      listings: { data: [{ id: "l1", title: "Studio", price: 8000, property_type: "studio", address: "IT Park", city: "Cebu", is_available: true, status: "published" }], error: null },
      properties: { data: [], error: null },
      property_submissions: { data: [], error: null },
      property_drafts: { data: [], error: null },
    });

    const first = await fetchLandlordPortfolio(supabase as never, "landlord-1");
    const second = await fetchLandlordPortfolio(supabase as never, "landlord-1");
    expect(first.items).toHaveLength(1);
    expect(second.items).toHaveLength(1);
    expect(supabase.from).toHaveBeenCalledTimes(4);

    invalidateLandlordPortfolioCache("landlord-1");
    await fetchLandlordPortfolio(supabase as never, "landlord-1");
    expect(supabase.from).toHaveBeenCalledTimes(8);
  });

  it("deduplicates concurrent in-flight portfolio requests", async () => {
    vi.stubEnv("VITEST", "");
    let resolveRpc!: (value: { data: unknown; error: unknown }) => void;
    const supabase = createMockSupabase({
      listings: { data: [], error: null },
      properties: { data: [], error: null },
      property_submissions: { data: [], error: null },
      property_drafts: { data: [], error: null },
    });
    supabase.rpc = vi.fn(() => new Promise((resolve) => { resolveRpc = resolve; }));

    const p1 = fetchLandlordPortfolio(supabase as never, "landlord-2");
    const p2 = fetchLandlordPortfolio(supabase as never, "landlord-2");
    resolveRpc({ data: [], error: null });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(r2);
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it("does not cache portfolio responses when a table query fails", async () => {
    vi.stubEnv("VITEST", "");
    const supabase = createMockSupabase({
      listings: { data: null, error: { message: "db error" } },
      properties: { data: [], error: null },
      property_submissions: { data: [], error: null },
      property_drafts: { data: [], error: null },
    });

    const first = await fetchLandlordPortfolio(supabase as never, "landlord-err");
    expect(first.errors.listings).toBe(true);

    await fetchLandlordPortfolio(supabase as never, "landlord-err");
    expect(supabase.from).toHaveBeenCalledTimes(8);
  });

  it("caches signed draft media URLs for 1h across calls", async () => {
    vi.stubEnv("VITEST", "");
    const path = `owner/draft/op/${"a".repeat(64)}.jpg`;
    mocks.createSignedUrls.mockResolvedValue({
      data: [{ path, signedUrl: "https://signed.test/a.jpg" }],
      error: null,
    });

    const first = await signPropertyDraftMediaUrls([path]);
    const second = await signPropertyDraftMediaUrls([path]);
    expect(first.signed.get(path)).toBe("https://signed.test/a.jpg");
    expect(second.signed.get(path)).toBe("https://signed.test/a.jpg");
    expect(mocks.createSignedUrls).toHaveBeenCalledTimes(1);
  });

  it("caches landlord map data for 30s and clears on invalidation", async () => {
    vi.stubEnv("VITEST", "");
    const supabase = createMockSupabase({
      listings: { data: [{ id: "l1", title: "Room", price: 5000, property_type: "room", address: "Lahug", city: "Cebu", latitude: 10.3, longitude: 123.9, is_available: true, status: "published" }], error: null },
      properties: { data: [], error: null },
      property_submissions: { data: [], error: null },
    });

    await fetchLandlordMapData(supabase as never, "landlord-map");
    await fetchLandlordMapData(supabase as never, "landlord-map");
    expect(supabase.from).toHaveBeenCalledTimes(3);

    invalidateLandlordPortfolioCache("landlord-map");
    await fetchLandlordMapData(supabase as never, "landlord-map");
    expect(supabase.from).toHaveBeenCalledTimes(6);
  });
});
