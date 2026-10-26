import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let searchPlaces: typeof import("./search-places").searchPlaces;
const fetchMock = vi.fn<typeof fetch>();
const response = () => new Response(JSON.stringify({ features: [] }));

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-26T00:00:00Z"));
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  ({ searchPlaces } = await import("./search-places"));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("place request sharing", () => {
  it("shares normalized pending requests even after the throttle interval", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>(done => { resolve = done; }));
    const first = searchPlaces("Mandaue");
    const second = searchPlaces(" mandaue ");
    vi.setSystemTime(Date.now() + 1100);
    const third = searchPlaces("MANDAUE");
    const results = Promise.all([first, second, third]);
    resolve(response());
    await expect(results).resolves.toEqual([[], [], []]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(searchPlaces("mandaue")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps distinct-query throttling and the provider timeout", async () => {
    fetchMock.mockResolvedValue(response());
    await searchPlaces("Mandaue");
    await expect(searchPlaces("Lahug")).rejects.toThrow("rate limited");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const options = fetchMock.mock.calls[0][1]!;
    expect(options.cache).toBe("no-store");
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("clears failed shared requests so a later retry can succeed", async () => {
    let reject!: (reason: Error) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>((_, fail) => { reject = fail; }));
    const first = searchPlaces("Mandaue");
    const second = searchPlaces("mandaue");
    const results = Promise.allSettled([first, second]);
    reject(new Error("provider offline"));
    expect(await results).toEqual([
      { status: "rejected", reason: new Error("provider offline") },
      { status: "rejected", reason: new Error("provider offline") },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 1100);
    fetchMock.mockResolvedValue(response());
    await expect(searchPlaces("mandaue")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refreshes expired completed results", async () => {
    fetchMock.mockImplementation(async () => response());
    await searchPlaces("Mandaue");
    vi.setSystemTime(Date.now() + 3600001);
    await searchPlaces("mandaue");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
