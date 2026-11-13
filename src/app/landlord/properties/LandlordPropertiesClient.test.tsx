import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { LandlordManagedProperty } from "@/server/landlord-properties";

const mockState = vi.hoisted(() => ({
  status: "" as string,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockState.status ? `status=${mockState.status}` : ""),
  usePathname: () => "/landlord/properties",
}));

vi.mock("@/features/rentals/PropertyDetailsSheet", () => ({
  PropertyDetailsSheet: () => null,
}));

import { LandlordPropertiesClient } from "./LandlordPropertiesClient";

function makeProp(overrides: Partial<LandlordManagedProperty>): LandlordManagedProperty {
  return {
    id: "prop-1",
    title: "Sample Property",
    status: "published",
    statusLabel: "Published · Available",
    propertyType: "condo",
    address: "IT Park",
    city: "Cebu City",
    price: 15000,
    isAvailable: true,
    thumbnailUrl: null,
    imageUrls: [],
    description: null,
    amenities: [],
    rejectionReason: null,
    editHref: null,
    mapHref: "/landlord/map?selected=prop-1",
    previewHref: "/?selected=prop-1",
    ...overrides,
  };
}

describe("LandlordPropertiesClient", () => {
  it("renders minmax(0,1fr) grid and min-w-0 cards so long unbroken titles do not overflow mobile viewports", () => {
    mockState.status = "";
    const html = renderToStaticMarkup(
      <LandlordPropertiesClient
        properties={[
          makeProp({
            id: "prop-long",
            title: "VeryLongUnbrokenPropertyTitleWithoutAnySpacesWhatsoeverThatShouldWrapOrTruncateCleanly",
          }),
        ]}
      />
    );

    expect(html).toContain("grid-cols-[minmax(0,1fr)]");
    expect(html).toContain("min-w-0");
  });

  it("does not double-count pending items that also carry hasPendingRevision", () => {
    mockState.status = "";
    const html = renderToStaticMarkup(
      <LandlordPropertiesClient
        properties={[
          makeProp({ id: "p-1", status: "pending", statusLabel: "Pending review", hasPendingRevision: true }),
          makeProp({ id: "p-2", status: "published", statusLabel: "Published · Available", hasPendingRevision: true }),
        ]}
      />
    );

    const underReviewTab = html.match(/Under review<\/span><span[^>]*>(\d+)<\/span>/)?.[1];
    expect(underReviewTab).toBe("2");
  });

  it("activates the tab matching ?status= query parameter on initial render", () => {
    mockState.status = "pending";
    const html = renderToStaticMarkup(
      <LandlordPropertiesClient
        properties={[
          makeProp({ id: "p-pub", title: "Live Condo", status: "published" }),
          makeProp({ id: "p-rev", title: "Pending Condo", status: "pending", statusLabel: "Pending review" }),
        ]}
      />
    );

    expect(html).toContain("Pending Condo");
    expect(html).not.toContain("Live Condo");
  });
});
