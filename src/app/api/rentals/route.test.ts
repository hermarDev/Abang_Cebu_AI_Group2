import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { createClient, query } = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
  return { createClient: vi.fn(), query };
});
vi.mock("@/lib/supabase/server", () => ({ createClient }));

beforeEach(() => {
  vi.resetAllMocks();
  createClient.mockResolvedValue({ from: vi.fn((table) => { expect(table).toBe("listings"); return query; }) });
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockResolvedValue({ data: [], error: null });
});

describe("GET /api/rentals", () => {
  it("returns a real empty result with a bounded published/available public projection", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ rentals: [] });
    expect(response.headers.get("cache-control")).toBe("no-store");
    const projection = query.select.mock.calls[0][0].split(",");
    expect(projection).toContain("title");
    expect(projection).not.toContain("*");
    expect(projection).not.toContain("owner_id");
    expect(query.eq).toHaveBeenCalledWith("status", "published");
    expect(query.eq).toHaveBeenCalledWith("is_available", true);
    expect(query.limit).toHaveBeenCalledWith(200);
  });

  it("maps returned records through the real validation boundary", async () => {
    query.limit.mockResolvedValue({ data: [{ id: "public-id", title: "Rental", description: null,
      city: "Cebu City", longitude: 123.9, latitude: 10.3, price: 3000, currency: "PHP",
      rental_period: "monthly", property_type: "bedspace", status: "published", is_available: true,
      owner_id: "private-owner" }], error: null });
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.rentals).toHaveLength(1);
    expect(body.rentals[0]).toMatchObject({ id: "public-id", basis: "bed", coordinates: [123.9, 10.3] });
    expect(JSON.stringify(body)).not.toContain("private-owner");
  });

  it.each([
    { data: null, error: { message: "secret token internal SQL owner@email.test" } },
    { data: null, error: null },
    { data: [{ status: "draft" }], error: null },
    { data: {}, error: null },
  ])("returns generic 503 for data failures without a synthetic fallback", async (result) => {
    query.limit.mockResolvedValue(result);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Rental listings are temporarily unavailable. Please try again later." });
  });

  it("contains unexpected client initialization failures", async () => {
    createClient.mockRejectedValue(new Error("secret configuration"));
    expect((await GET()).status).toBe(503);
  });

  it("contains transport failures", async () => {
    query.limit.mockRejectedValue(new Error("secret transport"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
  });
});
