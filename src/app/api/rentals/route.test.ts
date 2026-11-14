import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { createClient, query, createSignedUrls } = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
  return { createClient: vi.fn(), query, createSignedUrls: vi.fn() };
});
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ storage: { from: (bucket: string) => { expect(bucket).toBe("property-draft-media"); return { createSignedUrls }; } } }) }));

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

  it("filters out invalid listings safely instead of crashing the feed", async () => {
    query.limit.mockResolvedValue({
      data: [
        { id: "invalid-1", title: "", price: 1000, status: "published", is_available: true, currency: "PHP", rental_period: "monthly" },
        { id: "valid-1", title: "Valid Room", description: "   ", city: "Cebu City", longitude: 123.9, latitude: 10.3, price: 3000, currency: "PHP", rental_period: "monthly", property_type: "bedspace", status: "published", is_available: true },
      ],
      error: null,
    });
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.rentals).toHaveLength(1);
    expect(body.rentals[0].id).toBe("valid-1");
    expect(body.rentals[0].description).toBe("No description provided.");
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

  describe("submitted properties", () => {
    const owner = "aaaaaaaa-0000-4000-8000-000000000001";
    const photo = `${owner}/bbbbbbbb-0000-4000-8000-000000000001/cccccccc-0000-4000-8000-000000000001/${"a".repeat(64)}.jpg`;
    const permit = `${owner}/bbbbbbbb-0000-4000-8000-000000000001/cccccccc-0000-4000-8000-000000000002/${"b".repeat(64)}.pdf`;
    const row = (id: string, status: string, photo_paths: string[]) => ({ id, title: `Home ${id}`, description: "Nice", price: 5000, property_type: "condominium",
      rental_type: "private_room", latitude: 10.3, longitude: 123.9, address: "Street 1", barangay: "Mabolo", city: "Cebu City", max_occupants: 2,
      floor_area_sqm: 12, bathroom_type: "private", tenant_policy: "female_only", amenities: ["wifi", "cooking"], photo_paths, moderation_status: status,
      created_at: "2026-11-08T00:00:00Z" });
    const rpc = vi.fn();
    beforeEach(() => {
      createClient.mockResolvedValue({ from: vi.fn(() => query), rpc });
      createSignedUrls.mockResolvedValue({ data: [{ path: photo, signedUrl: "https://signed.test/photo", error: null }], error: null });
    });

    it("maps approved (property_verified) rows with batch-signed photos and excludes pending", async () => {
      rpc.mockResolvedValue({ data: [row("p1", "pending", [photo]), row("p2", "approved", [photo])], error: null });
      const body = await (await GET()).json();
      expect(rpc).toHaveBeenCalledWith("get_public_submitted_rentals");
      expect(createSignedUrls).toHaveBeenCalledTimes(1);
      expect(createSignedUrls).toHaveBeenCalledWith([photo], 3600);
      expect(body.rentals.map((r: { id: string; verificationStatus: string }) => [r.id, r.verificationStatus])).toEqual([["p2", "property_verified"]]);
      expect(body.rentals[0]).toMatchObject({ type: "condo", imageUrls: ["https://signed.test/photo"], tenantPolicy: "female_only", wifiAvailable: true,
        cookingAllowed: true, amenities: ["Wi-Fi", "Cooking allowed"], directLandlord: true, area: 12 });
    });

    it("does not sign photos for rejected or draft rows", async () => {
      rpc.mockResolvedValue({ data: [row("p1", "rejected", [photo])], error: null });
      expect((await (await GET()).json()).rentals).toEqual([]);
      expect(createSignedUrls).not.toHaveBeenCalled();
    });

    it("never signs or exposes invalid/permit paths or private fields", async () => {
      rpc.mockResolvedValue({ data: [{ ...row("p1", "approved", [permit, "../x.jpg", photo]), landlord_id: "private-landlord", moderation_note: "private-note", owner_id: "private-owner" }], error: null });
      const text = await (await GET()).text();
      expect(createSignedUrls).toHaveBeenCalledWith([photo], 3600);
      for (const secret of ["private-landlord", "private-note", "private-owner", permit, "../x.jpg"]) expect(text).not.toContain(secret);
    });

    it("degrades to listings when rpc or signing fails", async () => {
      rpc.mockResolvedValue({ data: null, error: { message: "secret" } });
      expect(await (await GET()).json()).toEqual({ rentals: [] });
      rpc.mockResolvedValue({ data: [row("p1", "approved", [photo])], error: null });
      createSignedUrls.mockRejectedValue(new Error("secret"));
      const body = await (await GET()).json();
      expect(body.rentals[0].imageUrls).toEqual([]);
    });

    it("degrades to submitted properties when listings query has an error", async () => {
      query.limit.mockResolvedValue({ data: null, error: { message: "Listings unavailable" } });
      rpc.mockResolvedValue({ data: [row("p1", "approved", [photo])], error: null });
      const response = await GET();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.rentals).toHaveLength(1);
      expect(body.rentals[0].id).toBe("p1");
    });
  });
});
