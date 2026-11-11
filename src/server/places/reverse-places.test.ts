import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
let reverseGeocode: typeof import("./reverse-places").reverseGeocode;
const fetchMock = vi.fn<typeof fetch>();
beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-08T00:00:00Z"));
  fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
  delete process.env.GOOGLE_MAPS_API_KEY;
  ({ reverseGeocode } = await import("./reverse-places"));
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
});