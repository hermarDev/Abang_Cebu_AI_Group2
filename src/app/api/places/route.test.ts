import { afterEach, describe, expect, it, vi } from "vitest";
import { searchPlaces } from "@/server/places/search-places";
import { GET } from "./route";

vi.mock("@/server/places/search-places", () => ({
  searchPlaces: vi.fn(),
}));

const mockSearchPlaces = vi.mocked(searchPlaces);

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/places", () => {
  it("rejects short and excessively long queries without contacting the provider", async () => {
    const short = await GET(new Request("http://localhost/api/places?q=IT"));
    const long = await GET(new Request(`http://localhost/api/places?q=${"a".repeat(121)}`));

    expect(short.status).toBe(400);
    expect(long.status).toBe(400);
    expect(mockSearchPlaces).not.toHaveBeenCalled();
  });

  it("trims a valid query and returns Metro Cebu place results", async () => {
    const places = [{
      id: "osm-node-1",
      name: "Cebu IT Park",
      detail: "Apas, Cebu City",
      coordinates: [123.9, 10.3] as [number, number],
      category: "Landmark",
    }];
    mockSearchPlaces.mockResolvedValue(places);

    const response = await GET(new Request("http://localhost/api/places?q=%20Cebu%20IT%20Park%20"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ places });
    expect(mockSearchPlaces).toHaveBeenCalledWith("Cebu IT Park");
  });

  it("returns a generic unavailable response when the provider fails", async () => {
    mockSearchPlaces.mockRejectedValue(new Error("provider internal details"));

    const response = await GET(new Request("http://localhost/api/places?q=Cebu%20IT%20Park"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Place search is temporarily unavailable. Please retry in a moment or choose a preset area." });
  });
});
