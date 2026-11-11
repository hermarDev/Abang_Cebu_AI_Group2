import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PropertyDetailsSheetBody } from "./PropertyDetailsSheet";
import type { RentalThreadDetail, ThreadCounterpart } from "../messages/messaging-client";

const owner: ThreadCounterpart = { id: "landlord-1", fullName: "abangcebu landlord", avatarUrl: null, role: "landlord" };
const renter: ThreadCounterpart = { id: "renter-1", fullName: "abangcebu renter", avatarUrl: null, role: "renter" };
const thread = (over: Partial<RentalThreadDetail>): RentalThreadDetail => ({
  id: "t1", listingId: "p1", listingTitle: "Cebu It Park", listingPrice: 40000, listingStatus: "pending", listingAvailable: true,
  counterpart: owner, listingOwner: owner, unreadCount: 0, isArchived: false, isBlocked: false, blockedByViewer: false, canSend: true,
  lastMessagePreview: null, lastMessageAt: null, ...over,
});
const listedBy = (html: string) => html.slice(html.indexOf("Listed by"));

describe("PropertyDetailsSheetBody — Listed by", () => {
  it("renter viewer sees the landlord", () => {
    const html = renderToStaticMarkup(<PropertyDetailsSheetBody thread={thread({})} />);
    expect(listedBy(html)).toContain("abangcebu landlord");
    expect(listedBy(html)).toContain("landlord");
  });

  it("landlord viewer (counterpart = renter) sees the same landlord, never the renter", () => {
    const asRenter = renderToStaticMarkup(<PropertyDetailsSheetBody thread={thread({})} />);
    const asLandlord = renderToStaticMarkup(<PropertyDetailsSheetBody thread={thread({ counterpart: renter })} />);
    expect(asLandlord).not.toContain("abangcebu renter");
    expect(listedBy(asLandlord)).toBe(listedBy(asRenter));
  });

  it("admin-like viewer with an unrelated counterpart still sees the owner", () => {
    const admin: ThreadCounterpart = { id: "admin-1", fullName: "Admin Person", avatarUrl: null, role: "admin" };
    const html = renderToStaticMarkup(<PropertyDetailsSheetBody thread={thread({ counterpart: admin })} />);
    expect(listedBy(html)).toContain("abangcebu landlord");
    expect(html).not.toContain("Admin Person");
  });

  it("missing owner profile shows an unavailable state, not the counterpart", () => {
    const html = renderToStaticMarkup(<PropertyDetailsSheetBody thread={thread({ counterpart: renter, listingOwner: null })} />);
    expect(listedBy(html)).toContain("Landlord unavailable");
    expect(html).not.toContain("abangcebu renter");
  });

  it("omits the section when only a legacy response (no listingOwner) is available", () => {
    const { listingOwner: _o, ...legacy } = thread({ counterpart: renter });
    void _o;
    const html = renderToStaticMarkup(<PropertyDetailsSheetBody thread={legacy} />);
    expect(html).not.toContain("Listed by");
    expect(html).not.toContain("abangcebu renter");
  });
});
