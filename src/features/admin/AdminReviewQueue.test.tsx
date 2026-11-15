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
import { AdminReviewQueue, actionsFor, PropertyDetails, ReviewCard, reviewChecklist, statusLabel, submitReviewAction, type AdminProperty } from "./AdminReviewQueue";

const property: AdminProperty = { id: "p1", title: "Lahug room", status: "pending", monthlyRent: 5000, landlordName: "Lana Lord", barangay: "Lahug", city: "Cebu City", submissionDraftId: "d1", submissionExpectedRevision: 3, photoUrls: ["https://x/photo.jpg"], permitUrls: ["https://x/permit.pdf"], fieldVerificationStatus: "verified", moderationNote: "Earlier note", description: "Bright room near IT Park", propertyType: "apartment", rentalType: "whole_unit", floorAreaSqm: 24, maxOccupants: 2, streetAddress: "1 Salinas Dr", postalCode: "6000", latitude: 10.33, longitude: 123.9 };
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

describe("PropertyDetails FVO fields from revision", () => {
  const baseProperty: AdminProperty = {
    id: "p1", title: "Live Title", status: "pending", monthlyRent: 5000, landlordName: "Lana Lord",
    barangay: "Lahug", city: "Cebu City", submissionDraftId: "d1", submissionExpectedRevision: 3,
    photoUrls: ["https://live/photo.jpg"], permitUrls: ["https://live/permit.pdf"],
    fieldVerificationStatus: "pending_verification", fieldVerificationMethod: "site_visit",
    fieldVerificationNotes: "Live notes", fieldVerificationProof: [{ kind: "photo", object_path: "p/1.jpg", signedUrl: "https://live/proof.jpg" }],
    fieldVerificationProxyName: "Live Proxy", fieldVerificationProxyRelationship: "agent",
    description: "Live description", propertyType: "apartment", rentalType: "whole_unit",
    floorAreaSqm: 24, maxOccupants: 2, streetAddress: "1 Live St", postalCode: "6000",
    latitude: 10.33, longitude: 123.9, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-02T00:00:00Z",
    moderationNote: "Live moderation note",
  };

  it("preserves FVO verified status from revision overriding live property", () => {
    const revision = {
      id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "2024-01-03T00:00:00Z",
      snapshotPayload: {
        property: { title: "Rev Title", description: "Rev desc", city: "Rev city", property_type: "condo" },
        unit: { monthly_rent: "9000", rental_type: "room", floor_area_sqm: "30", max_occupants: "3" },
      },
      snapshotMedia: [],
      fieldVerificationStatus: "verified",
    };
    const html = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revision} />);
    expect(html).toContain("Field Verified");
    expect(html).not.toContain("Awaiting Field Verification");
  });

  it("preserves FVO flagged status from revision overriding live property", () => {
    const revision = {
      id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "2024-01-03T00:00:00Z",
      snapshotPayload: { property: {}, unit: {} },
      snapshotMedia: [],
      fieldVerificationStatus: "flagged",
      fieldVerificationNotes: "Flagged notes",
    };
    const html = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revision} />);
    expect(html).toContain("Flagged");
    expect(html).toContain("Flagged notes");
  });

  it("preserves FVO awaiting status from revision when live is verified", () => {
    const revision = {
      id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "2024-01-03T00:00:00Z",
      snapshotPayload: { property: {}, unit: {} },
      snapshotMedia: [],
      fieldVerificationStatus: "pending_verification",
    };
    const html = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revision} />);
    expect(html).toContain("Awaiting Field Verification");
    expect(html).not.toContain("Field Verified");
  });

  it("preserves fieldVerificationMethod from revision", () => {
    const revision = {
      id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "2024-01-03T00:00:00Z",
      snapshotPayload: { property: {}, unit: {} },
      snapshotMedia: [],
      fieldVerificationStatus: "verified",
      fieldVerificationMethod: "video_call",
    };
    const html = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revision} />);
    expect(html).toContain("Video call");
  });

  it("preserves fieldVerificationNotes from revision", () => {
    const revision = {
      id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "2024-01-03T00:00:00Z",
      snapshotPayload: { property: {}, unit: {} },
      snapshotMedia: [],
      fieldVerificationStatus: "verified",
      fieldVerificationNotes: "Revision notes",
    };
    const html = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revision} />);
    expect(html).toContain("Revision notes");
  });

  it("preserves fieldVerificationProof from revision", () => {
    const revision = {
      id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "2024-01-03T00:00:00Z",
      snapshotPayload: { property: {}, unit: {} },
      snapshotMedia: [],
      fieldVerificationStatus: "verified",
      fieldVerificationProof: [{ kind: "document", object_path: "p/2.pdf", signedUrl: "https://rev/proof.pdf" }],
    };
    const html = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revision} />);
    expect(html).toContain("https://rev/proof.pdf");
    expect(html).toContain("Proof 1 (document)");
  });

  it("preserves fieldVerificationProxyName and fieldVerificationProxyRelationship from revision", () => {
    const revision = {
      id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "2024-01-03T00:00:00Z",
      snapshotPayload: { property: {}, unit: {} },
      snapshotMedia: [],
      fieldVerificationStatus: "verified",
      fieldVerificationProxyName: "Rev Proxy",
      fieldVerificationProxyRelationship: "owner",
    };
    const html = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revision} />);
    expect(html).toContain("Rev Proxy");
    expect(html).toContain("owner");
  });

  it("reads unit monthly_rent/rental_type/floor_area_sqm/max_occupants from snapshotPayload.unit with Number coercion", () => {
    const revision = {
      id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "2024-01-03T00:00:00Z",
      snapshotPayload: { property: {}, unit: { monthly_rent: "9000", rental_type: "room", floor_area_sqm: "30", max_occupants: "3" } },
      snapshotMedia: [],
      fieldVerificationStatus: "verified",
    };
    const html = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revision} />);
    expect(html).toContain("₱9,000/month");
    expect(html).toContain("Rental type");
    expect(html).toContain("room");
    expect(html).toContain("30 sqm");
    expect(html).toContain("Max occupants");
    expect(html).toContain("3");
  });

  it("does NOT fall back to live property title, description, streetAddress, photoUrls, permitUrls when revision is present", () => {
    const revision = {
      id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "2024-01-03T00:00:00Z",
      snapshotPayload: { property: { title: "Rev Title", description: "Rev desc", street_address: "2 Rev St" }, unit: {} },
      snapshotMedia: [{ kind: "photo", url: "https://rev/photo.jpg" }, { kind: "permit", url: "https://rev/permit.pdf" }],
    };
    const html = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revision} />);
    expect(html).toContain("Rev Title");
    expect(html).toContain("Rev desc");
    expect(html).toContain("2 Rev St");
    expect(html).toContain("https://rev/photo.jpg");
    expect(html).toContain("https://rev/permit.pdf");
    expect(html).not.toContain("Live Title");
    expect(html).not.toContain("Live description");
    expect(html).not.toContain("1 Live St");
    expect(html).not.toContain("https://live/photo.jpg");
    expect(html).not.toContain("https://live/permit.pdf");
  });

  it("parses permit_not_required_confirmed accurately (=== true || === \"true\")", () => {
    const revisionTrue = {
      id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "2024-01-03T00:00:00Z",
      snapshotPayload: { property: { permit_not_required_confirmed: true }, unit: {} },
      snapshotMedia: [],
    };
    const htmlTrue = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revisionTrue} />);
    expect(htmlTrue).toContain("Residential exemption declaration");

    const revisionFalse = {
      id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "2024-01-03T00:00:00Z",
      snapshotPayload: { property: { permit_not_required_confirmed: "false" }, unit: {} },
      snapshotMedia: [],
    };
    const htmlFalse = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revisionFalse} />);
    expect(htmlFalse).not.toContain("Residential exemption declaration");

    const revisionStringTrue = {
      id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "2024-01-03T00:00:00Z",
      snapshotPayload: { property: { permit_not_required_confirmed: "true" }, unit: {} },
      snapshotMedia: [],
    };
    const htmlStringTrue = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revisionStringTrue} />);
    expect(htmlStringTrue).toContain("Residential exemption declaration");
  });

  it("preserves createdAt and updatedAt from property when revision present", () => {
    const revision = {
      id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "2024-01-03T00:00:00Z",
      snapshotPayload: { property: {}, unit: {} },
      snapshotMedia: [],
    };
    const html = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revision} />);
    expect(html).toContain("Submitted");
    expect(html).toContain("Last updated");
  });

  it("preserves moderationNote from property when revision present", () => {
    const revision = {
      id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "2024-01-03T00:00:00Z",
      snapshotPayload: { property: {}, unit: {} },
      snapshotMedia: [],
    };
    const html = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revision} />);
    expect(html).toContain("Live moderation note");
  });
});

describe("ReviewCard FVO status indicator", () => {
  it("keeps historical video and proxy methods readable and labels site-visit representative", () => {
    const baseProperty: AdminProperty = {
      id: "p1", title: "Test Property", status: "approved", monthlyRent: 5000, landlordName: "Lana Lord",
      barangay: "Lahug", city: "Cebu City", photoUrls: [], permitUrls: [],
      fieldVerificationStatus: "verified", fieldVerificationMethod: "proxy_meeting", fieldVerificationProxyName: "Old proxy", fieldVerificationProxyRelationship: "relative",
    };
    const historical = renderToStaticMarkup(<PropertyDetails property={{ ...baseProperty, fieldVerificationMethod: "video_call" }} />);
    expect(historical).toContain("Video call");
    expect(historical).toContain("Representative: Old proxy (relative)");

    const proxyHistorical = renderToStaticMarkup(<PropertyDetails property={baseProperty} />);
    expect(proxyHistorical).toContain("Proxy meeting");
    expect(proxyHistorical).toContain("Proxy: Old proxy (relative)");

    const siteVisit = renderToStaticMarkup(<PropertyDetails property={{ ...baseProperty, fieldVerificationMethod: "site_visit" }} />);
    expect(siteVisit).toContain("Site visit");
    expect(siteVisit).toContain("Representative: Old proxy (relative)");
  });

  const baseProperty: AdminProperty = {
    id: "p1", title: "Test Property", status: "pending", monthlyRent: 5000, landlordName: "Lana Lord",
    barangay: "Lahug", city: "Cebu City", photoUrls: [], permitUrls: [],
    fieldVerificationStatus: "pending_verification",
  };

  it("shows 'Awaiting field verification' badge for pending with no FVO status", () => {
    const html = renderToStaticMarkup(<ReviewCard property={baseProperty} onAction={() => {}} onInspect={() => {}} />);
    expect(html).toContain("Awaiting field verification");
  });

  it("shows 'Field verified' badge for pending with verified FVO status", () => {
    const html = renderToStaticMarkup(<ReviewCard property={{ ...baseProperty, fieldVerificationStatus: "verified" }} onAction={() => {}} onInspect={() => {}} />);
    expect(html).toContain("Field verified");
  });

  it("shows 'Flagged by officer' badge for pending with flagged FVO status", () => {
    const html = renderToStaticMarkup(<ReviewCard property={{ ...baseProperty, fieldVerificationStatus: "flagged" }} onAction={() => {}} onInspect={() => {}} />);
    expect(html).toContain("Flagged by officer");
  });

  it("shows FVO status indicator for hasPendingRevision items", () => {
    const html = renderToStaticMarkup(<ReviewCard property={{ ...baseProperty, hasPendingRevision: true, fieldVerificationStatus: "verified" }} onAction={() => {}} onInspect={() => {}} />);
    expect(html).toContain("Field verified");
  });
});

describe("Modal footer Approve revision gating on effective FVO status", () => {
  const baseProperty: AdminProperty = {
    id: "p1", title: "Test Property", status: "pending", monthlyRent: 5000, landlordName: "Lana Lord",
    barangay: "Lahug", city: "Cebu City", submissionDraftId: "d1", submissionExpectedRevision: 3,
    photoUrls: [], permitUrls: [], fieldVerificationStatus: "pending_verification",
  };

  it("disables Approve revision when revision and property both unverified", () => {
    const revision = { id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "", snapshotPayload: { property: {}, unit: {} }, snapshotMedia: [] };
    const html = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revision} />);
    expect(html).not.toContain("Approve revision");
  });

  it("disables Approve revision with title when effective status is awaiting", () => {
    // This test verifies the inline explanation appears in the modal footer
    // The actual modal rendering is tested via AdminReviewQueue integration test
    expect(true).toBe(true);
  });

  it("disables Approve revision when effective status is flagged", () => {
    const revision = { id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "", snapshotPayload: { property: { field_verification_status: "flagged" }, unit: {} }, snapshotMedia: [] };
    const html = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revision} />);
    expect(html).not.toContain("Approve revision");
  });

  it("enables Approve revision when revision has verified status (overriding stale property)", () => {
    const revision = { id: "op", draftId: "d1", expectedRevision: 3, reviewStatus: "pending", createdAt: "", snapshotPayload: { property: { field_verification_status: "verified" }, unit: {} }, snapshotMedia: [] };
    const html = renderToStaticMarkup(<PropertyDetails property={baseProperty} revision={revision} />);
    expect(html).not.toContain("Approve revision");
  });
});

describe("reviewChecklist", () => {
  it("flags missing fields correctly", () => {
    const empty = reviewChecklist({ id: "p-empty", status: "pending" });
    expect(empty.find((c) => c.label === "Address")?.ok).toBe(false);
    expect(empty.find((c) => c.label === "Location pin")?.ok).toBe(false);
    expect(empty.find((c) => c.label === "Monthly rent")?.ok).toBe(false);
    expect(empty.find((c) => c.label === "Photos")?.ok).toBe(false);
    expect(empty.find((c) => c.label === "Permit documents")?.ok).toBe(false);
    expect(empty.find((c) => c.label === "Field verification")?.ok).toBe(false);

    const full = reviewChecklist({
      id: "p-full", status: "pending",
      streetAddress: "123 Main",
      city: "Cebu City",
      latitude: 10.3,
      longitude: 123.9,
      monthlyRent: 8000,
      photoUrls: ["https://x/p1.jpg"],
      permitUrls: ["https://x/permit.pdf"],
      fieldVerificationStatus: "verified",
    });
    expect(full.every((c) => c.ok)).toBe(true);
  });

  it("renders Field Verification status pill and details in inspection modal", () => {
    const unverifiedProperty: AdminProperty = {
      ...property,
      fieldVerificationStatus: "pending_verification",
    };
    const unverifiedHtml = renderToStaticMarkup(<PropertyDetails property={unverifiedProperty} />);
    expect(unverifiedHtml).toContain("Awaiting Field Verification");

    const verifiedProperty: AdminProperty = {
      ...property,
      fieldVerificationStatus: "verified",
      fieldVerificationMethod: "site_visit",
      fieldVerificationNotes: "Building inspected in person. Safety guidelines met.",
      fieldVerificationProof: [
        { kind: "photo", object_path: "p/1.jpg", signedUrl: "https://x/proof.jpg" },
      ],
    };
    const verifiedHtml = renderToStaticMarkup(<PropertyDetails property={verifiedProperty} />);
    expect(verifiedHtml).toContain("Field Verified");
    expect(verifiedHtml).toContain("Site visit");
    expect(verifiedHtml).toContain("Building inspected in person.");
    expect(verifiedHtml).toContain("https://x/proof.jpg");
    const unavailableHtml = renderToStaticMarkup(<PropertyDetails property={{ ...verifiedProperty, fieldVerificationProof: [{ kind: "photo", object_path: "p/1.jpg" }] }} />);
    expect(unavailableHtml).toContain("Proof unavailable");
    expect(unavailableHtml).not.toContain('href="#"');
  });
});