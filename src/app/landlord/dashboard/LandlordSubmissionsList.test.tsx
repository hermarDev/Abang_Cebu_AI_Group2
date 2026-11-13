import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandlordSubmissionsList } from "./LandlordSubmissionsList";
import type { LandlordManagedProperty } from "@/server/landlord-properties";

describe("LandlordSubmissionsList", () => {
  const items: Partial<LandlordManagedProperty>[] = Array.from({ length: 15 }, (_, i) => ({
    id: `prop-${i + 1}`,
    title: `Property ${i + 1}`,
    status: (i % 2 === 0 ? "pending" : "published") as LandlordManagedProperty["status"],
    statusLabel: i % 2 === 0 ? "Pending review" : "Published · Available",
    propertyType: "apartment",
    address: `${i + 1} Main St`,
    city: "Cebu City",
    price: 15000,
    isAvailable: true,
    thumbnailUrl: null,
    imageUrls: [],
    description: null,
    amenities: [],
    rejectionReason: null,
    editHref: `/list-property?draftId=draft-${i + 1}&revision=1`,
    mapHref: `/landlord/map?selected=prop-${i + 1}`,
    previewHref: `/?selected=prop-${i + 1}`,
  }));

  it("renders page 1 items and pagination when items exceed pageSize", () => {
    const html = renderToStaticMarkup(
      <LandlordSubmissionsList
        items={items as LandlordManagedProperty[]}
        linkClass="test-link"
        pageSize={10}
      />
    );

    expect(html).toContain("Property 1");
    expect(html).toContain("Property 10");
    expect(html).not.toContain("Property 11");
    expect(html).toContain('aria-label="Pagination"');
    expect(html).toContain("Showing 1–10 of 15");
  });

  it("renders without pagination when items are within pageSize", () => {
    const html = renderToStaticMarkup(
      <LandlordSubmissionsList
        items={items.slice(0, 5) as LandlordManagedProperty[]}
        linkClass="test-link"
        pageSize={10}
      />
    );

    expect(html).toContain("Property 1");
    expect(html).toContain("Property 5");
    expect(html).not.toContain('aria-label="Pagination"');
  });

  it("renders location, property type and rent metadata with formatting", () => {
    const html = renderToStaticMarkup(
      <LandlordSubmissionsList
        items={[
          {
            id: "p1",
            title: "Metro flat",
            status: "pending",
            statusLabel: "Pending review",
            address: "12 Colon St, Cebu City",
            city: "Cebu City",
            propertyType: "apartment",
            price: 12500,
            isAvailable: true,
            thumbnailUrl: null,
            imageUrls: [],
            description: null,
            amenities: [],
            rejectionReason: null,
            editHref: "/list-property?draftId=draft-1&revision=1",
            mapHref: "/landlord/map?selected=p1",
            previewHref: "/?selected=p1",
          },
        ]}
        linkClass="test-link"
      />
    );
    expect(html).toContain("12 Colon St, Cebu City · Apartment · ₱12,500/mo");
  });

  it("renders Revision under review badge for published properties with pending revision", () => {
    const html = renderToStaticMarkup(
      <LandlordSubmissionsList
        items={[
          {
            id: "p-rev",
            title: "Live Property Editing",
            status: "published",
            statusLabel: "Published · Available",
            hasPendingRevision: true,
            address: "Salinas Dr",
            city: "Cebu City",
            propertyType: "condo",
            price: 25000,
            isAvailable: true,
            thumbnailUrl: null,
            imageUrls: [],
            description: null,
            amenities: [],
            rejectionReason: null,
            editHref: "/list-property?draftId=draft-rev&revision=2&lockedLocation=1",
            mapHref: "/landlord/map?selected=p-rev",
            previewHref: "/?selected=p-rev",
          },
        ]}
        linkClass="test-link"
      />
    );
    expect(html).toContain("Live Property Editing");
    expect(html).toContain("Published · Available");
    expect(html).toContain("Revision under review");
    expect(html).toContain("Update listing");
  });

  it("renders contextual actions for different statuses including legacy draft fallback", () => {
    const html = renderToStaticMarkup(
      <LandlordSubmissionsList
        items={[
          {
            id: "p-draft",
            title: "Draft Item",
            status: "draft",
            statusLabel: "Draft",
            address: "",
            city: "Cebu City",
            propertyType: "studio",
            price: null,
            isAvailable: false,
            thumbnailUrl: null,
            imageUrls: [],
            description: null,
            amenities: [],
            rejectionReason: null,
            editHref: "/list-property?draftId=d-1&revision=1",
            mapHref: null,
            previewHref: null,
          },
          {
            id: "p-legacy-draft",
            title: "Legacy Draft Item",
            status: "draft",
            statusLabel: "Draft",
            address: "Lahug",
            city: "Cebu City",
            propertyType: "house",
            price: 15000,
            isAvailable: false,
            thumbnailUrl: null,
            imageUrls: [],
            description: null,
            amenities: [],
            rejectionReason: null,
            editHref: null,
            mapHref: null,
            previewHref: null,
          },
          {
            id: "p-rej",
            title: "Rejected Item",
            status: "rejected",
            statusLabel: "Changes requested",
            address: "Banilad",
            city: "Cebu City",
            propertyType: "house",
            price: 20000,
            isAvailable: false,
            thumbnailUrl: null,
            imageUrls: [],
            description: null,
            amenities: [],
            rejectionReason: "Need tax declaration copy",
            editHref: "/list-property?draftId=d-2&revision=2",
            mapHref: "/landlord/map?selected=p-rej",
            previewHref: null,
          },
        ]}
        linkClass="test-link"
      />
    );
    expect(html).toContain("Edit draft");
    expect(html).toContain('href="/list-property"');
    expect(html).toContain("Correct and resubmit");
    expect(html).toContain("Need tax declaration copy");
    expect(html).toContain("grid-cols-[minmax(0,1fr)]");
  });
});
