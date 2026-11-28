import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
let reverseGeocode: typeof import("./reverse-places").reverseGeocode;
let resetReverseGeocodeCache: typeof import("./reverse-places").resetReverseGeocodeCache;
const fetchMock = vi.fn<typeof fetch>();
beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-08T00:00:00Z"));
  fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
  delete process.env.GOOGLE_MAPS_API_KEY;
  ({ reverseGeocode, resetReverseGeocodeCache } = await import("./reverse-places"));
  resetReverseGeocodeCache();
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("reverse geocoding", () => {
  it("maps address details from Photon and sends fixed-host coordinates", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ features: [{ properties: { housenumber: "12", street: "Main St", district: "Mabolo", city: "Cebu City" } }] })));
    await expect(reverseGeocode([123.9, 10.3])).resolves.toEqual({ address: "12 Main St", barangay: "Mabolo", city: "Cebu City" });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin).toBe("https://photon.komoot.io");
    expect(url.searchParams.get("lat")).toBe("10.3");
    expect(url.searchParams.get("lon")).toBe("123.9");
  });

  it("uses Google Maps Geocoding API when GOOGLE_MAPS_API_KEY is present", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "test-key";
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      results: [{
        formatted_address: "123 Gorordo Ave, Kamputhaw, Cebu City, 6000 Cebu, Philippines",
        address_components: [
          { long_name: "123", types: ["street_number"] },
          { long_name: "Gorordo Avenue", types: ["route"] },
          { long_name: "Kamputhaw", types: ["sublocality_level_1", "sublocality", "political"] },
          { long_name: "Cebu City", types: ["locality", "political"] },
        ],
      }],
    })));
    const result = await reverseGeocode([123.896, 10.317]);
    expect(result).toEqual({ address: "123 Gorordo Avenue", barangay: "Kamputhaw", city: "Cebu City" });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin).toBe("https://maps.googleapis.com");
    expect(url.searchParams.get("key")).toBe("test-key");
  });

  it("falls back to Nominatim when Photon returns no results", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ features: [] }))); // Photon empty
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      display_name: "Banilad, Mandaue City, Cebu, Philippines",
      address: { road: "A.S. Fortuna St", suburb: "Banilad", city: "Mandaue City" },
    }))); // Nominatim
    const result = await reverseGeocode([123.921, 10.341]);
    expect(result).toEqual({ address: "A.S. Fortuna St", barangay: "Banilad", city: "Mandaue City" });
    const url = new URL(String(fetchMock.mock.calls[1][0]));
    expect(url.origin).toBe("https://nominatim.openstreetmap.org");
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({ "User-Agent": "AbangCebu-App/1.0" });
  });

  it("generates geographical Cebu coordinates when all external providers fail", async () => {
    fetchMock.mockRejectedValue(new Error("network offline"));
    const result = await reverseGeocode([123.8854, 10.3157]);
    expect(result).not.toBeNull();
    expect(result?.city).toMatch(/Cebu/);
    expect(result?.address).toContain("10.3157°N");
    expect(result?.address).toContain("123.8854°E");
  });

  it("returns null for coordinates outside the Cebu bounding box", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ features: [] })));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ address: {} })));
    const result = await reverseGeocode([120.9842, 14.5995]); // Manila coordinates
    expect(result).toBeNull();
  });

  it("caches reverse geocode results for 1h by rounded coordinates and deduplicates in-flight calls", async () => {
    let resolveFetch!: (res: Response) => void;
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((resolve) => { resolveFetch = resolve; }),
    );

    const p1 = reverseGeocode([123.90001, 10.30001]);
    const p2 = reverseGeocode([123.90004, 10.30004]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(new Response(JSON.stringify({
      features: [{ properties: { street: "Salinas Dr", district: "Lahug", city: "Cebu City" } }],
    })));

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({ address: "Salinas Dr", barangay: "Lahug", city: "Cebu City" });
    expect(r2).toEqual(r1);

    // Subsequent call within 1h uses cache without hitting fetch
    const r3 = await reverseGeocode([123.90002, 10.30002]);
    expect(r3).toEqual(r1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // After 1h TTL expires, fetches again
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      features: [{ properties: { street: "Salinas Dr", district: "Lahug", city: "Cebu City" } }],
    })));
    await reverseGeocode([123.90002, 10.30002]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throttles public Nominatim calls to at most once per 1000ms and falls back safely", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ features: [] }))); // Photon 1
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      address: { road: "A.S. Fortuna St", suburb: "Banilad", city: "Mandaue City" },
    }))); // Nominatim 1

    const first = await reverseGeocode([123.921, 10.341]);
    expect(first?.city).toBe("Mandaue City");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // 500ms later, different coordinates: Photon empty, Nominatim throttled -> deterministic fallback
    vi.advanceTimersByTime(500);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ features: [] }))); // Photon 2
    const second = await reverseGeocode([123.925, 10.345]);
    expect(second?.address).toContain("Pinned location");
    expect(fetchMock).toHaveBeenCalledTimes(3); // Nominatim NOT called

    // After another 600ms (>1000ms total), Nominatim can be called again
    vi.advanceTimersByTime(600);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ features: [] }))); // Photon 3
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      address: { road: "Hernan Cortes St", suburb: "Tipolo", city: "Mandaue City" },
    }))); // Nominatim 2
    const third = await reverseGeocode([123.926, 10.346]);
    expect(third).toEqual({ address: "Hernan Cortes St", barangay: "Tipolo", city: "Mandaue City" });
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});