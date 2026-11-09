import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/AppToaster", () => ({ notify: vi.fn() }));
import { AdminReviewQueue, actionsFor, PropertyDetails, ReviewCard, statusLabel, submitReviewAction, type AdminProperty } from "./AdminReviewQueue";

const property: AdminProperty = { id: "p1", title: "Lahug room", status: "pending", monthlyRent: 5000, landlordName: "Lana Lord", barangay: "Lahug", city: "Cebu City", submissionDraftId: "d1", submissionExpectedRevision: 3, photoUrls: ["https://x/photo.jpg"], permitUrls: ["https://x/permit.pdf"], moderationNote: "Earlier note", description: "Bright room near IT Park", propertyType: "apartment", rentalType: "whole_unit", floorAreaSqm: 24, maxOccupants: 2, streetAddress: "1 Salinas Dr", postalCode: "6000", latitude: 10.33, longitude: 123.9 };
const ctx = (action: "approve" | "reject" | "unpublish" | "restore", p = property) => ({ property: p, action, operationId: "op-1" });
const respond = (status: number, body: unknown) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }));

afterEach(() => vi.unstubAllGlobals());

describe("AdminReviewQueue", () => {
  it("renders tabs, search and a loading skeleton before data arrives", () => {
    const html = renderToStaticMarkup(<AdminReviewQueue userId="admin-a" />);
    for (const tab of ["Pending review", "Approved / Live", "Changes requested", "Archived", "All"]) expect(html).toContain(tab);
    expect(html).toContain('placeholder="Search title, address, or landlord…"');
    expect(html).toContain("animate-pulse");
  });
  it("shows canonical status labels and the actions each status allows", () => {
    expect(statusLabel({ status: "approved", isAvailable: true })).toBe("Published · Available");
    expect(statusLabel({ status: "approved", isAvailable: false })).toBe("Published · Unavailable");
    expect(statusLabel({ status: "rejected" })).toBe("Changes requested");
    expect(actionsFor("pending")).toEqual(["approve", "reject"]);
    expect(actionsFor("approved")).toEqual(["unpublish"]);
    expect(actionsFor("archived")).toEqual(["restore"]);
    expect(actionsFor("rejected")).toEqual([]);
  });
  it("renders the property card with media, permit link, note and actions", () => {
    const html = renderToStaticMarkup(<ReviewCard property={property} onAction={() => {}} onInspect={() => {}} />);
    for (const text of ["Lahug room", "Pending review", "Lana Lord", "₱5,000", "Lahug, Cebu City", "photo 1", 'href="https://x/permit.pdf"', "Moderation note: Earlier note", "Approve", "Request changes / Reject"]) expect(html).toContain(text);
  });
  it("renders description, unit specs and the inspection trigger on the card", () => {
    const html = renderToStaticMarkup(<ReviewCard property={property} onAction={() => {}} onInspect={() => {}} />);
    for (const text of ["Bright room near IT Park", "Type: apartment", "Rental: whole_unit", "Floor area: 24 sqm", "Max occupants: 2", "Inspect details &amp; permits"]) expect(html).toContain(text);
  });
  it("renders full property details with photos and permit links in the inspection view", () => {
    const html = renderToStaticMarkup(<PropertyDetails property={property} />);
    for (const text of ["Bright room near IT Park", "apartment", "whole_unit", "24 sqm", "1 Salinas Dr", "6000", "10.33", "123.9", "Lana Lord", "Earlier note", "photo 1", 'href="https://x/permit.pdf"', "Open permit 1"]) expect(html).toContain(text);
    expect(renderToStaticMarkup(<PropertyDetails property={{ id: "p2", status: "pending" }} />)).toContain("No permits uploaded.");
  });
  it("posts a rejection to the review route with the exact submission revision", async () => {
    respond(200, { status: "rejected" });
    const result = await submitReviewAction("admin-a", ctx("reject"), "  Permit unreadable  ");
    expect(result).toMatchObject({ ok: true, property: { status: "rejected", moderationNote: "Permit unreadable" } });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/admin/properties/review");
    expect((init as RequestInit).headers).toMatchObject({ "x-expected-user-id": "admin-a" });
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ propertyId: "p1", operationId: "op-1", decision: "rejected", note: "Permit unreadable", submissionDraftId: "d1", submissionExpectedRevision: 3 });
  });
  it("approves without a note and clears the stale moderation note", async () => {
    respond(200, { status: "approved" });
    const result = await submitReviewAction("admin-a", ctx("approve"), "");
    expect(result).toMatchObject({ ok: true, property: { status: "approved", moderationNote: null } });
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toMatchObject({ decision: "approved", note: null });
  });
  it("routes unpublish and restore through the lifecycle endpoint", async () => {
    respond(200, { status: "archived" });
    await submitReviewAction("admin-a", ctx("unpublish", { ...property, status: "approved" }), "Policy breach");
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/admin/properties/lifecycle");
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({ propertyId: "p1", operationId: "op-1", action: "unpublish", reason: "Policy breach" });
  });
  it("surfaces conflicts and outages instead of updating the row", async () => {
    respond(409, { error: "This property changed after it was submitted." });
    expect(await submitReviewAction("admin-a", ctx("reject"), "x")).toEqual({ ok: false, message: "This property changed after it was submitted." });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await submitReviewAction("admin-a", ctx("reject"), "x")).toMatchObject({ ok: false });
  });
});
