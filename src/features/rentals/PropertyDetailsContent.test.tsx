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
});
