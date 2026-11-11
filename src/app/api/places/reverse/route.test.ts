import { afterEach, describe, expect, it, vi } from "vitest";
import { reverseGeocode } from "@/server/places/reverse-places";
import { GET } from "./route";

vi.mock("@/server/places/reverse-places", () => ({ reverseGeocode: vi.fn() }));
afterEach(() => vi.resetAllMocks());

describe("GET /api/places/reverse", () => {
  it.each(["", "?lat=&lon=123.9", "?lat=NaN&lon=123.9", "?lat=14.5995&lon=120.9842"])("rejects invalid or outside coordinates: %s", async (query) => {
    expect((await GET(new Request(`http://localhost/api/places/reverse${query}`))).status).toBe(400);
    expect(reverseGeocode).not.toHaveBeenCalled();
  });
  it("returns provider data for a valid pin", async () => {
    vi.mocked(reverseGeocode).mockResolvedValueOnce({ address: "Main Street", barangay: "Mabolo", city: "Cebu City" });
    const response = await GET(new Request("http://localhost/api/places/reverse?lat=10.3157&lon=123.8854"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ place: { address: "Main Street", barangay: "Mabolo", city: "Cebu City" } });
    expect(reverseGeocode).toHaveBeenCalledWith([123.8854, 10.3157]);
  });
  it("reports provider failure without exposing internal details", async () => {
    vi.mocked(reverseGeocode).mockRejectedValueOnce(new Error("private provider error"));
    const response = await GET(new Request("http://localhost/api/places/reverse?lat=10.3157&lon=123.8854"));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("private provider error");
  });
});
