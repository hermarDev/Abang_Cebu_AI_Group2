import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { loadPendingVerificationMap, mapCoordinates, type VerificationQueueItem } from "./verification-map-data";

const createQueueItem = (overrides: Partial<VerificationQueueItem> = {}): VerificationQueueItem => ({
  id: "prop-1",
  title: "Test Property",
  description: "Description",
  propertyType: "apartment",
  streetAddress: "123 Test St",
  barangay: "Barangay",
  city: "Cebu City",
  latitude: 10.3314,
  longitude: 123.9064,
  landlordId: "landlord-1",
  landlordName: "Landlord Name",
  landlordPhone: "+639****0000",
  submissionDraftId: "draft-1",
  submissionExpectedRevision: 1,
  submissionOperationId: "op-1",
  submissionCreatedAt: "2026-11-14T00:00:00Z",
  reviewStatus: "pending",
  fieldVerificationStatus: "pending_verification",
  fieldVerifiedBy: null,
  fieldVerifiedAt: null,
  fieldVerificationMethod: null,
  fieldVerificationNotes: null,
  fieldVerificationProof: [],
  fieldVerificationProxyName: null,
  fieldVerificationProxyRelationship: null,
  ...overrides,
});

describe("loadPendingVerificationMap", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFetch.mockReset();
  });

  it("returns empty array for 0 items", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ queue: [] }),
    });

    const signal = new AbortController().signal;
    const result = await loadPendingVerificationMap("user-1", signal);

    expect(result).toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain("/api/verification/queue");
    expect(callUrl).toContain("status=pending_verification");
    expect(callUrl).toContain("limit=100");
    expect(callUrl).toContain("offset=0");
    const callHeaders = mockFetch.mock.calls[0][1] as RequestInit;
    expect(callHeaders.headers).toEqual({ "x-expected-user-id": "user-1" });
    expect(callHeaders.signal).toBe(signal);
  });

  it("returns items for 1 page (100 items)", async () => {
    const items = Array.from({ length: 100 }, (_, i) => createQueueItem({ id: `prop-${i + 1}` }));
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ queue: items }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ queue: [] }) });

    const signal = new AbortController().signal;
    const result = await loadPendingVerificationMap("user-1", signal);

    expect(result).toHaveLength(100);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("fetches second page for 101 items", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => createQueueItem({ id: `prop-${i + 1}` }));
    const page2 = [createQueueItem({ id: "prop-101" })];
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ queue: page1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ queue: page2 }) });

    const signal = new AbortController().signal;
    const result = await loadPendingVerificationMap("user-1", signal);

    expect(result).toHaveLength(101);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const call1 = mockFetch.mock.calls[0][0] as string;
    const call2 = mockFetch.mock.calls[1][0] as string;
    expect(call1).toContain("offset=0");
    expect(call2).toContain("offset=100");
  });

  it("fetches all pages for 201 items", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => createQueueItem({ id: `prop-${i + 1}` }));
    const page2 = Array.from({ length: 100 }, (_, i) => createQueueItem({ id: `prop-${i + 101}` }));
    const page3 = [createQueueItem({ id: "prop-201" })];
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ queue: page1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ queue: page2 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ queue: page3 }) });

    const signal = new AbortController().signal;
    const result = await loadPendingVerificationMap("user-1", signal);

    expect(result).toHaveLength(201);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("rejects on failed second page", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => createQueueItem({ id: `prop-${i + 1}` }));
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ queue: page1 }) })
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: "Service unavailable" }) });

    const signal = new AbortController().signal;
    await expect(loadPendingVerificationMap("user-1", signal)).rejects.toThrow();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("deduplicates items by id across pages", async () => {
    const item = createQueueItem({ id: "prop-dup" });
    const page1 = Array.from({ length: 100 }, (_, i) => createQueueItem({ id: `prop-page1-${i}` }));
    page1[0] = item;
    const page2 = Array.from({ length: 100 }, (_, i) => createQueueItem({ id: `prop-page2-${i}` }));
    page2[0] = item;
    page2[1] = createQueueItem({ id: "prop-unique-3" });
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ queue: page1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ queue: page2 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ queue: [] }) });

    const signal = new AbortController().signal;
    const result = await loadPendingVerificationMap("user-1", signal);

    expect(result).toHaveLength(199);
    const ids = result.map((r) => r.id);
    expect(new Set(ids).size).toBe(199);
  });

  it("aborts on signal abort before any fetch", async () => {
    const controller = new AbortController();
    controller.abort();
    const signal = controller.signal;

    await expect(loadPendingVerificationMap("user-1", signal)).rejects.toThrow();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends x-expected-user-id header and status=pending_verification", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ queue: [] }) });

    const signal = new AbortController().signal;
    await loadPendingVerificationMap("officer-42", signal);

    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers["x-expected-user-id"]).toBe("officer-42");
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("status=pending_verification");
  });
});

describe("mapCoordinates", () => {
  it("returns [longitude, latitude] for valid coordinates", () => {
    const result = mapCoordinates({ latitude: 10.3314, longitude: 123.9064 });
    expect(result).toEqual([123.9064, 10.3314]);
  });

  it("returns null for null latitude", () => {
    const result = mapCoordinates({ latitude: null, longitude: 123.9064 });
    expect(result).toBeNull();
  });

  it("returns null for null longitude", () => {
    const result = mapCoordinates({ latitude: 10.3314, longitude: null });
    expect(result).toBeNull();
  });

  it("returns null for NaN latitude", () => {
    const result = mapCoordinates({ latitude: NaN, longitude: 123.9064 });
    expect(result).toBeNull();
  });

  it("returns null for NaN longitude", () => {
    const result = mapCoordinates({ latitude: 10.3314, longitude: NaN });
    expect(result).toBeNull();
  });

  it("returns null for Infinity latitude", () => {
    const result = mapCoordinates({ latitude: Infinity, longitude: 123.9064 });
    expect(result).toBeNull();
  });

  it("returns null for -Infinity longitude", () => {
    const result = mapCoordinates({ latitude: 10.3314, longitude: -Infinity });
    expect(result).toBeNull();
  });

  it("returns null for latitude > 90", () => {
    const result = mapCoordinates({ latitude: 91, longitude: 123.9064 });
    expect(result).toBeNull();
  });

  it("returns null for latitude < -90", () => {
    const result = mapCoordinates({ latitude: -91, longitude: 123.9064 });
    expect(result).toBeNull();
  });

  it("returns null for longitude > 180", () => {
    const result = mapCoordinates({ latitude: 10.3314, longitude: 181 });
    expect(result).toBeNull();
  });

  it("returns null for longitude < -180", () => {
    const result = mapCoordinates({ latitude: 10.3314, longitude: -181 });
    expect(result).toBeNull();
  });

  it("accepts latitude = 90", () => {
    const result = mapCoordinates({ latitude: 90, longitude: 123.9064 });
    expect(result).toEqual([123.9064, 90]);
  });

  it("accepts latitude = -90", () => {
    const result = mapCoordinates({ latitude: -90, longitude: 123.9064 });
    expect(result).toEqual([123.9064, -90]);
  });

  it("accepts longitude = 180", () => {
    const result = mapCoordinates({ latitude: 10.3314, longitude: 180 });
    expect(result).toEqual([180, 10.3314]);
  });

  it("accepts longitude = -180", () => {
    const result = mapCoordinates({ latitude: 10.3314, longitude: -180 });
    expect(result).toEqual([-180, 10.3314]);
  });
});