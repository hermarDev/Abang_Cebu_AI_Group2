import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({ active: false, slots: [] as unknown[], index: 0 }));
vi.mock("react", async (original) => {
  const actual = await original<typeof import("react")>();
  return { ...actual,
    useState: (initial: unknown) => {
      if (!hooks.active) return actual.useState(initial);
      const index = hooks.index++;
      if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === "function" ? (initial as () => unknown)() : initial;
      return [hooks.slots[index], (value: unknown) => { hooks.slots[index] = typeof value === "function" ? (value as (prior: unknown) => unknown)(hooks.slots[index]) : value; }];
    },
    useRef: (initial: unknown) => {
      if (!hooks.active) return actual.useRef(initial);
      const index = hooks.index++;
      if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
      return hooks.slots[index];
    },
    useEffect: (...args: Parameters<typeof actual.useEffect>) => { if (!hooks.active) actual.useEffect(...args); },
  };
});
vi.mock("@/components/ui/AppToaster", () => ({ notify: vi.fn() }));
import { AdminReviewQueue, actionsFor, PropertyDetails, ReviewCard, statusLabel, submitReviewAction, type AdminProperty } from "./AdminReviewQueue";

const property: AdminProperty = { id: "p1", title: "Lahug room", status: "pending", monthlyRent: 5000, landlordName: "Lana Lord", barangay: "Lahug", city: "Cebu City", submissionDraftId: "d1", submissionExpectedRevision: 3, photoUrls: ["https://x/photo.jpg"], permitUrls: ["https://x/permit.pdf"], moderationNote: "Earlier note", description: "Bright room near IT Park", propertyType: "apartment", rentalType: "whole_unit", floorAreaSqm: 24, maxOccupants: 2, streetAddress: "1 Salinas Dr", postalCode: "6000", latitude: 10.33, longitude: 123.9 };
const ctx = (action: "approve" | "reject" | "unpublish" | "restore", p = property) => ({ property: p, action, operationId: "op-1" });
const respond = (status: number, body: unknown) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }));

afterEach(() => { vi.unstubAllGlobals(); hooks.active = false; hooks.slots = []; hooks.index = 0; });

function renderQueue() { hooks.index = 0; return AdminReviewQueue({ userId: "admin-a" }); }
function nodes(value: unknown): Array<import("react").ReactElement<Record<string, unknown>>> {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const element = value as import("react").ReactElement<Record<string, unknown>>;
  return [element, ...nodes(element.props.children)];
}

it("ignores out-of-order inspections, fails closed after fetch failure and binds loaded revision decisions", async () => {
  hooks.active = true;
  renderQueue();
  const first = { ...property, status: "approved", hasPendingRevision: true };
  const second = { ...first, id: "p2", submissionDraftId: "d2", submissionExpectedRevision: 8 };
  hooks.slots[4] = [first, second];
  const inspect = nodes(renderQueue()).find((node) => node.type === ReviewCard)!.props.onInspect as (p: AdminProperty) => Promise<void>;
  let finishFirst!: (value: unknown) => void;
  let finishSecond!: (value: unknown) => void;
  vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; })).mockImplementationOnce(() => new Promise((resolve) => { finishSecond = resolve; })));
  const pendingFirst = inspect(first);
  const pendingSecond = inspect(second);
  const revision = { id: "op2", draftId: "d2", expectedRevision: 8, reviewStatus: "pending", createdAt: "", snapshotPayload: { property: {}, unit: {} }, snapshotMedia: [] };
  finishSecond({ ok: true, json: async () => ({ revision }) }); await pendingSecond;
  finishFirst({ ok: true, json: async () => ({ revision: { ...revision, draftId: "d1", expectedRevision: 3 } }) }); await pendingFirst;
  let tree = nodes(renderQueue());
  expect(tree.find((node) => node.type === PropertyDetails)?.props.revision).toEqual(revision);
  const approve = tree.find((node) => node.props.children === "Approve revision")!;
  (approve.props.onClick as () => void)();
  renderQueue();
  expect(hooks.slots[6]).toMatchObject({ property: { id: "p2", submissionDraftId: "d2", submissionExpectedRevision: 8 }, action: "approve" });
  respond(503, { error: "Cannot load snapshot" });
  await inspect(first);
  tree = nodes(renderQueue());
  expect(tree.some((node) => node.type === PropertyDetails)).toBe(false);
  expect(tree.some((node) => node.props.children === "Approve revision")).toBe(false);
  expect(tree.some((node) => node.props.children === "Cannot load snapshot")).toBe(true);
});

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
  it("renders nested snapshot values without live-field or media fallback", () => {
    const html = renderToStaticMarkup(<PropertyDetails property={property} revision={{ id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "", snapshotPayload: { property: { title: "New title", description: "New description", city: "New city" }, unit: { monthly_rent: 9000, bedrooms: 3 }, amenities: ["wifi"] }, snapshotMedia: [{ kind: "permit", url: "https://signed/document" }] }} />);
    for (const text of ["New description", "New city", "₱9,000", "wifi", 'href="https://signed/document"']) expect(html).toContain(text);
    for (const text of ["Bright room", "1 Salinas Dr", "https://x/photo.jpg", "https://x/permit.pdf"]) expect(html).not.toContain(text);
  });
  it("shows bathroom type and tenant policy from the revision", () => {
    const html = renderToStaticMarkup(<PropertyDetails property={property} revision={{ id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "", snapshotPayload: { property: {}, unit: { bathroom_type: "private", tenant_policy: "female_only" } }, snapshotMedia: [] }} />);
    expect(html).toContain("private");
    expect(html).toContain("female_only");
  });
  it("shows permit fields for an initial listing", () => {
    const html = renderToStaticMarkup(<PropertyDetails property={{ ...property, permitApplicability: "required", permitNumber: "TEST-123", permitLgu: "Cebu City", permitExpiresOn: "2030-01-01" }} />);
    for (const value of ["required", "TEST-123", "Cebu City", "2030-01-01"]) expect(html).toContain(value);
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

import { reviewChecklist } from "./AdminReviewQueue";

describe("reviewChecklist", () => {
  it("flags missing fields correctly", () => {
    const empty = reviewChecklist({ id: "p-empty", status: "pending" });
    expect(empty.find((c) => c.label === "Address")?.ok).toBe(false);
    expect(empty.find((c) => c.label === "Location pin")?.ok).toBe(false);
    expect(empty.find((c) => c.label === "Monthly rent")?.ok).toBe(false);
    expect(empty.find((c) => c.label === "Photos")?.ok).toBe(false);
    expect(empty.find((c) => c.label === "Permit documents")?.ok).toBe(false);

    const full = reviewChecklist({
      id: "p-full", status: "pending",
      streetAddress: "123 Main",
      city: "Cebu City",
      latitude: 10.3,
      longitude: 123.9,
      monthlyRent: 8000,
      photoUrls: ["https://x/p1.jpg"],
      permitUrls: ["https://x/permit.pdf"],
    });
    expect(full.every((c) => c.ok)).toBe(true);
  });
});
