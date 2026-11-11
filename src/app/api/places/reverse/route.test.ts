import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reverseGeocode } from "@/server/places/reverse-places";
import { GET } from "./route";

vi.mock("@/server/places/reverse-places", () => ({ reverseGeocode: vi.fn() }));

let mockUser: { id: string } | null = { id: "landlord-1" };
let mockProfile: { role: string; is_suspended: boolean } | null = { role: "landlord", is_suspended: false };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockUser }, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: mockProfile, error: null })),
        })),
      })),
    })),
  })),
}));

beforeEach(() => {
  mockUser = { id: "landlord-1" };
  mockProfile = { role: "landlord", is_suspended: false };
});

afterEach(() => vi.clearAllMocks());

describe("GET /api/places/reverse", () => {
  it("rejects unauthenticated requests with 401", async () => {
    mockUser = null;
    const response = await GET(new Request("http://localhost/api/places/reverse?lat=10.3157&lon=123.8854"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Sign in required." });
  });

  it("rejects non-landlord accounts with 403", async () => {
    mockProfile = { role: "renter", is_suspended: false };
    const response = await GET(new Request("http://localhost/api/places/reverse?lat=10.3157&lon=123.8854"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Landlord account required." });
  });

  it("rejects suspended landlords with 403", async () => {
    mockProfile = { role: "landlord", is_suspended: true };
    const response = await GET(new Request("http://localhost/api/places/reverse?lat=10.3157&lon=123.8854"));
    expect(response.status).toBe(403);
  });

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
