vi.mock("server-only", () => ({}));
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  listings: vi.fn(),
  properties: vi.fn(),
  submissions: vi.fn(),
  drafts: vi.fn(),
  units: vi.fn(),
  feedbackRpc: vi.fn(),
  storageSignedUrls: vi.fn(),
  eq: vi.fn(),
  landlordEq: vi.fn(),
  submissionEq: vi.fn(),
  draftsEq: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        createSignedUrls: mocks.storageSignedUrls,
      }),
    },
  }),
}));

import {
  fetchLandlordPortfolio,
  fetchLandlordManagedProperties,
  photoPaths,
  type LandlordManagedProperty,
} from "./landlord-properties";

function createMockSupabase(): SupabaseClient {
  return {
    from: (table: string) => {
      if (table === "listings") {
        return {
          select: () => ({
            eq: mocks.eq,
          }),
        };
      }
      if (table === "properties") {
        return {
          select: () => ({
            eq: mocks.landlordEq,
          }),
        };
      }
      if (table === "property_submissions") {
        return {
          select: () => ({
            eq: mocks.submissionEq,
          }),
        };
      }
      if (table === "property_drafts") {
        return {
          select: () => ({
            eq: mocks.draftsEq,
          }),
        };
      }
      if (table === "rental_units") {
        return {
          select: () => ({
            in: mocks.units,
          }),
        };
      }
      return { select: () => ({ eq: () => ({}) }) };
    },
    rpc: mocks.feedbackRpc,
  } as unknown as SupabaseClient;
}

describe("fetchLandlordPortfolio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eq.mockReturnValue({ order: mocks.listings });
    mocks.landlordEq.mockReturnValue({ order: mocks.properties });
    mocks.submissionEq.mockReturnValue({ order: mocks.submissions });
    mocks.draftsEq.mockReturnValue({ order: mocks.drafts });

    mocks.listings.mockResolvedValue({ data: [], error: null });
    mocks.properties.mockResolvedValue({ data: [], error: null });
    mocks.submissions.mockResolvedValue({ data: [], error: null });
    mocks.drafts.mockResolvedValue({ data: [], error: null });
    mocks.units.mockResolvedValue({ data: [], error: null });
    mocks.feedbackRpc.mockResolvedValue({ data: [], error: null });
    mocks.storageSignedUrls.mockResolvedValue({ data: [], error: null });
  });

  it("returns portfolio with unified items and all error flags false when successful", async () => {
    const supabase = createMockSupabase();
    mocks.properties.mockResolvedValue({
      data: [
        {
          id: "prop-1",
          title: "Approved Condo",
          description: "Nice condo",
          property_type: "condo",
          street_address: "Apas",
          city: "Cebu City",
          status: "approved",
          created_at: "2026-01-01",
        },
      ],
      error: null,
    });
    mocks.units.mockResolvedValue({
      data: [{ property_id: "prop-1", monthly_rent: 30000, is_available: true }],
      error: null,
    });

    const result = await fetchLandlordPortfolio(supabase, "user-1");

    expect(result.errors).toEqual({
      listings: false,
      properties: false,
      submissions: false,
      drafts: false,
      units: false,
      feedback: false,
      media: false,
    });
    expect(result.truncated).toBe(false);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("prop-1");
    expect(result.items[0].status).toBe("published");
    expect(result.items[0].statusLabel).toBe("Published · Available");
    expect(result.items[0].availabilityKnown).toBe(true);
    expect(result.items[0].hasPendingRevision).toBe(false);
  });

  it("summarizes multi-unit property availability with counts and individual unit details", async () => {
    const supabase = createMockSupabase();
    mocks.properties.mockResolvedValue({
      data: [
        {
          id: "prop-bh",
          title: "Apas Boarding House",
          description: "Rooms for rent",
          property_type: "boarding_house",
          street_address: "Apas",
          city: "Cebu City",
          status: "approved",
          created_at: "2026-01-01",
        },
      ],
      error: null,
    });
    mocks.units.mockResolvedValue({
      data: [
        { id: "u-1", property_id: "prop-bh", unit_number: "Room 1", rental_type: "private_room", monthly_rent: 4500, max_occupants: 1, is_available: true },
        { id: "u-2", property_id: "prop-bh", unit_number: "Room 2", rental_type: "private_room", monthly_rent: 4500, max_occupants: 1, is_available: false },
        { id: "u-3", property_id: "prop-bh", unit_number: "Room 3", rental_type: "private_room", monthly_rent: 5000, max_occupants: 2, is_available: true },
      ],
      error: null,
    });

    const result = await fetchLandlordPortfolio(supabase, "user-1");
    const item = result.items[0];
    expect(item.totalUnitsCount).toBe(3);
    expect(item.availableUnitsCount).toBe(2);
    expect(item.statusLabel).toBe("Published · 2 of 3 units available");
    expect(item.units).toHaveLength(3);
    expect(item.units?.[0]).toEqual({
      id: "u-1",
      unitNumber: "Room 1",
      rentalType: "private_room",
      monthlyRent: 4500,
      maxOccupants: 1,
      isAvailable: true,
    });
  });

  it("identifies hasPendingRevision when approved property has an active pending submission", async () => {
    const supabase = createMockSupabase();
    mocks.properties.mockResolvedValue({
      data: [
        {
          id: "prop-1",
          title: "Approved Condo",
          status: "approved",
          created_at: "2026-01-01",
        },
      ],
      error: null,
    });
    mocks.submissions.mockResolvedValue({
      data: [
        {
          property_id: "prop-1",
          draft_id: "draft-rev2",
          expected_revision: 2,
          superseded_by: null,
          review_status: "pending",
          snapshot_payload: null,
          snapshot_media: [],
          created_at: "2026-01-02",
        },
      ],
      error: null,
    });
    mocks.units.mockResolvedValue({
      data: [{ property_id: "prop-1", monthly_rent: 30000, is_available: true }],
      error: null,
    });

    const result = await fetchLandlordPortfolio(supabase, "user-1");

    expect(result.items[0].status).toBe("published");
    expect(result.items[0].hasPendingRevision).toBe(true);
  });

  it("sets availabilityKnown to false and statusLabel to 'Published · Availability unknown' when units query fails", async () => {
    const supabase = createMockSupabase();
    mocks.properties.mockResolvedValue({
      data: [
        {
          id: "prop-1",
          title: "Approved Condo",
          status: "approved",
          created_at: "2026-01-01",
        },
      ],
      error: null,
    });
    mocks.units.mockResolvedValue({
      data: null,
      error: { message: "connection error" },
    });

    const result = await fetchLandlordPortfolio(supabase, "user-1");

    expect(result.errors.units).toBe(true);
    expect(result.items[0].availabilityKnown).toBe(false);
    expect(result.items[0].statusLabel).toBe("Published · Availability unknown");
  });

  it("does NOT cross-dedupe listings against properties by bare UUID match", async () => {
    const supabase = createMockSupabase();
    const sharedId = "same-uuid-123";
    mocks.properties.mockResolvedValue({
      data: [
        {
          id: sharedId,
          title: "From Properties Table",
          status: "approved",
          created_at: "2026-01-01",
        },
      ],
      error: null,
    });
    mocks.listings.mockResolvedValue({
      data: [
        {
          id: sharedId,
          title: "From Listings Table",
          status: "published",
          is_available: true,
          created_at: "2026-01-01",
        },
      ],
      error: null,
    });

    const result = await fetchLandlordPortfolio(supabase, "user-1");

    expect(result.items).toHaveLength(2);
    expect(result.items.map((i: LandlordManagedProperty) => i.title)).toContain("From Properties Table");
    expect(result.items.map((i: LandlordManagedProperty) => i.title)).toContain("From Listings Table");
  });

  it("captures query errors into errors object and sets truncated if row count >= 1000", async () => {
    const supabase = createMockSupabase();
    mocks.listings.mockResolvedValue({
      data: Array.from({ length: 1000 }, (_, i) => ({
        id: `listing-${i}`,
        title: `Listing ${i}`,
        status: "published",
        is_available: true,
      })),
      error: null,
    });
    mocks.properties.mockResolvedValue({ data: null, error: { message: "fail" } });
    mocks.submissions.mockResolvedValue({ data: null, error: { message: "fail" } });
    mocks.feedbackRpc.mockResolvedValue({ data: null, error: { message: "fail" } });

    const result = await fetchLandlordPortfolio(supabase, "user-1");

    expect(result.errors.properties).toBe(true);
    expect(result.errors.submissions).toBe(true);
    expect(result.errors.feedback).toBe(true);
    expect(result.errors.listings).toBe(false);
    expect(result.truncated).toBe(true);
    expect(result.items).toHaveLength(1000);
  });

  it("captures storage media signing errors into errors.media", async () => {
    const ownerId = "11111111-1111-4111-8111-111111111111";
    const draftId = "22222222-2222-4222-8222-222222222222";
    const supabase = createMockSupabase();
    mocks.properties.mockResolvedValue({
      data: [{ id: "prop-1", title: "Prop 1", status: "pending" }],
      error: null,
    });
    const validPhoto = `${ownerId}/${draftId}/33333333-3333-4333-8333-333333333333/${"a".repeat(64)}.jpg`;
    mocks.submissions.mockResolvedValue({
      data: [
        {
          property_id: "prop-1",
          draft_id: draftId,
          expected_revision: 1,
          superseded_by: null,
          snapshot_media: [{ kind: "photo", object_path: validPhoto }],
        },
      ],
      error: null,
    });
    mocks.storageSignedUrls.mockRejectedValue(new Error("Storage service down"));

    const result = await fetchLandlordPortfolio(supabase, ownerId);

    expect(result.errors.media).toBe(true);
    expect(mocks.storageSignedUrls).toHaveBeenCalledWith([validPhoto], 3600);
  });

  it("refuses cross-owner, cross-draft, non-photo, and payload-fallback paths when snapshot_media exists", async () => {
    const ownerId = "11111111-1111-4111-8111-111111111111";
    const otherOwnerId = "99999999-9999-4999-8999-999999999999";
    const draftId = "22222222-2222-4222-8222-222222222222";
    const otherDraftId = "88888888-8888-4888-8888-888888888888";
    const ownPhoto = `${ownerId}/${draftId}/33333333-3333-4333-8333-333333333333/${"a".repeat(64)}.jpg`;
    const crossOwnerPhoto = `${otherOwnerId}/${draftId}/33333333-3333-4333-8333-333333333333/${"b".repeat(64)}.jpg`;
    const crossDraftPhoto = `${ownerId}/${otherDraftId}/33333333-3333-4333-8333-333333333333/${"c".repeat(64)}.jpg`;
    const permitDoc = `${ownerId}/${draftId}/33333333-3333-4333-8333-333333333333/${"d".repeat(64)}.jpg`;
    const payloadPhoto = `${ownerId}/${draftId}/33333333-3333-4333-8333-333333333333/${"e".repeat(64)}.jpg`;

    const supabase = createMockSupabase();
    mocks.properties.mockResolvedValue({
      data: [
        { id: "prop-1", title: "Own", status: "approved" },
        { id: "prop-2", title: "Empty snapshot", status: "approved" },
      ],
      error: null,
    });
    mocks.submissions.mockResolvedValue({
      data: [
        {
          property_id: "prop-1",
          draft_id: draftId,
          expected_revision: 1,
          superseded_by: null,
          snapshot_media: [
            { kind: "photo", object_path: crossOwnerPhoto },
            { kind: "photo", object_path: crossDraftPhoto },
            { kind: "permit", object_path: permitDoc },
            { kind: "photo", object_path: ownPhoto },
          ],
        },
        {
          property_id: "prop-2",
          draft_id: draftId,
          expected_revision: 1,
          superseded_by: null,
          snapshot_media: [],
          snapshot_payload: { media: { photos: [{ object_path: payloadPhoto }] } },
        },
      ],
      error: null,
    });
    mocks.storageSignedUrls.mockResolvedValue({
      data: [{ path: ownPhoto, signedUrl: "https://cdn.example/own.jpg", error: null }],
      error: null,
    });

    const result = await fetchLandlordPortfolio(supabase, ownerId);

    expect(mocks.storageSignedUrls).toHaveBeenCalledTimes(1);
    expect(mocks.storageSignedUrls).toHaveBeenCalledWith([ownPhoto], 3600);
    expect(result.items.find((i) => i.id === "prop-1")?.imageUrls).toEqual(["https://cdn.example/own.jpg"]);
    expect(result.items.find((i) => i.id === "prop-2")?.imageUrls).toEqual([]);
  });

  it("batches rental_units queries in chunks and prefers live draft revision for editHref", async () => {
    const supabase = createMockSupabase();
    const manyProps = Array.from({ length: 125 }, (_, i) => ({
      id: `prop-${i + 1}`,
      title: `Prop ${i + 1}`,
      status: "rejected",
    }));
    mocks.properties.mockResolvedValue({ data: manyProps, error: null });
    mocks.submissions.mockResolvedValue({
      data: [
        { property_id: "prop-1", draft_id: "draft-live", expected_revision: 1, review_status: "rejected", superseded_by: null },
      ],
      error: null,
    });
    mocks.drafts.mockResolvedValue({
      data: [
        { id: "draft-live", revision: 4, payload: { property: { title: "Edited Draft" }, unit: {} }, created_at: "2026-11-11T00:00:00Z" },
      ],
      error: null,
    });

    const result = await fetchLandlordPortfolio(supabase, "user-1");

    expect(mocks.units).toHaveBeenCalledTimes(2);
    expect(mocks.units.mock.calls[0][1]).toHaveLength(100);
    expect(mocks.units.mock.calls[1][1]).toHaveLength(25);
    expect(result.items.find((i) => i.id === "prop-1")?.editHref).toBe("/list-property?draftId=draft-live&revision=4");
  });

  it("photoPaths fails closed when expectedOwnerId or draft_id is missing", () => {
    const ownerId = "11111111-1111-4111-8111-111111111111";
    const draftId = "22222222-2222-4222-8222-222222222222";
    const ownPhoto = `${ownerId}/${draftId}/33333333-3333-4333-8333-333333333333/${"a".repeat(64)}.jpg`;
    expect(photoPaths({ property_id: "p", draft_id: draftId, expected_revision: 1, superseded_by: null, snapshot_media: [{ kind: "photo", object_path: ownPhoto }] }, "")).toEqual([]);
    expect(photoPaths({ property_id: "p", draft_id: "", expected_revision: 1, superseded_by: null, snapshot_media: [{ kind: "photo", object_path: ownPhoto }] }, ownerId)).toEqual([]);
  });

  it("fetchLandlordManagedProperties delegates to fetchLandlordPortfolio and returns items", async () => {
    const supabase = createMockSupabase();
    mocks.properties.mockResolvedValue({
      data: [{ id: "prop-1", title: "Prop 1", status: "pending" }],
      error: null,
    });

    const items = await fetchLandlordManagedProperties(supabase, "user-1");

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("prop-1");
  });
});
