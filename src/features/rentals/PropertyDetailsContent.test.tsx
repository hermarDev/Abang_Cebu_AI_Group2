import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PropertyDetailsContent } from "./PropertyDetailsContent";
import type { RentalThreadSummary } from "../messages/messaging-client";

describe("PropertyDetailsContent", () => {
  const sampleThread: RentalThreadSummary = {
    id: "thread-1",
    listingId: "prop-123",
    listingTitle: "Modern Studio in IT Park",
    listingPrice: 15000,
    listingStatus: "published",
    listingAvailable: true,
    listingPhotoUrl: "https://example.com/cover.jpg",
    listingAddress: "Apas, Cebu City",
    listingCity: "Cebu City",
    counterpart: {
      id: "landlord-1",
      fullName: "Carlos Mendoza",
      avatarUrl: "https://example.com/avatar.jpg",
      role: "landlord",
    },
    listingOwner: {
      id: "landlord-1",
      fullName: "Carlos Mendoza",
      avatarUrl: "https://example.com/avatar.jpg",
      role: "landlord",
    },
    unreadCount: 0,
    isArchived: false,
    isBlocked: false,
    blockedByViewer: false,
    canSend: true,
    lastMessagePreview: "Hello",
    lastMessageAt: "2026-11-09T03:00:00Z",
  };

  it("renders cover photo, title, price, address, and specs", () => {
    const html = renderToStaticMarkup(
      <PropertyDetailsContent thread={sampleThread} userRole="renter" />
    );

    expect(html).toContain("Modern Studio in IT Park");
    expect(html).toContain("₱15,000");
    expect(html).toContain("/month");
    expect(html).toContain("Apas, Cebu City");
    expect(html).toContain("Carlos Mendoza");
    expect(html).toContain("View on rental map");
    expect(html).toContain('href="/?selected=prop-123"');
  });

  it("adapts map link for landlord role", () => {
    const html = renderToStaticMarkup(
      <PropertyDetailsContent thread={sampleThread} userRole="landlord" />
    );

    expect(html).toContain("Manage in property map");
    expect(html).toContain('href="/landlord/map?selected=prop-123"');
  });

  describe("Listed by", () => {
    const renterProfile = { id: "renter-1", fullName: "Rina Renter", avatarUrl: "https://example.com/renter.jpg", role: "renter" as const };
    const landlordThreadForLandlordViewer: RentalThreadSummary = {
      ...sampleThread,
      // A landlord viewing their own listing: the chat counterpart is the renter.
      counterpart: renterProfile,
    };

    it("shows the listing owner for a landlord viewer even when the chat counterpart is the renter", () => {
      const html = renderToStaticMarkup(
        <PropertyDetailsContent thread={landlordThreadForLandlordViewer} userRole="landlord" />
      );
      expect(html).toContain("Listed by");
      expect(html).toContain("Carlos Mendoza");
      expect(html).toContain("landlord");
      expect(html).not.toContain("Rina Renter");
      expect(html).not.toContain("renter.jpg");
    });

    it("renders identical Listed by content for renter and landlord viewers", () => {
      const listedBy = (html: string) => html.slice(html.indexOf("Listed by"), html.indexOf("mt-auto"));
      const asRenter = renderToStaticMarkup(<PropertyDetailsContent thread={sampleThread} userRole="renter" />);
      const asLandlord = renderToStaticMarkup(<PropertyDetailsContent thread={landlordThreadForLandlordViewer} userRole="landlord" />);
      expect(listedBy(asLandlord)).toBe(listedBy(asRenter));
    });

    it("never substitutes the counterpart when the owner profile is missing", () => {
      const html = renderToStaticMarkup(
        <PropertyDetailsContent thread={{ ...landlordThreadForLandlordViewer, listingOwner: null }} userRole="landlord" />
      );
      expect(html).toContain("Landlord unavailable");
      expect(html).not.toContain("Rina Renter");
    });

    it("hides Listed by when the server did not send listingOwner instead of falling back to counterpart", () => {
      const { listingOwner: _omit, ...legacy } = landlordThreadForLandlordViewer;
      void _omit;
      const html = renderToStaticMarkup(<PropertyDetailsContent thread={legacy} userRole="landlord" />);
      expect(html).not.toContain("Listed by");
      expect(html).not.toContain("Rina Renter");
    });
  });
});
