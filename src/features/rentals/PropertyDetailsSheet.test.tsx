import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  PropertyDetailsSheetBody,
  PropertyDetailsSheetFooter,
} from "./PropertyDetailsSheet";
import type { RentalResult } from "@/contracts/preview";

describe("PropertyDetailsSheet", () => {
  const baseRental: RentalResult = {
    id: "prop-1",
    title: "Cebu IT Park Boarding House",
    locality: "Lahug, Cebu City",
    address: "M.J. Cuenco Avenue, Cebu City",
    coordinates: [123.907, 10.328],
    price: 40000,
    type: "boarding_house",
    propertyType: "boarding_house",
    basis: "room",
    amenities: ["Wi-Fi", "Cooking allowed"],
    description: "Display the landlord's actual description with readable line wrapping.",
    area: 25,
    maxOccupants: 1,
    bathroomType: "private",
    tenantPolicy: "any",
    curfewType: "none",
    tone: "blue",
    available: true,
    distanceMeters: null,
    imageUrls: ["https://example.com/p1.jpg", "https://example.com/p2.jpg"],
    verificationStatus: "property_verified",
  };

  it("renders property title, address, formatted price, and category badge", () => {
    const html = renderToStaticMarkup(
      <PropertyDetailsSheetBody rental={baseRental} />
    );

    expect(html).toContain("Cebu IT Park Boarding House");
    expect(html).toContain("M.J. Cuenco Avenue, Cebu City");
    expect(html).toContain("₱40,000");
    expect(html).toContain("Boarding house");
    expect(html).toContain("Verified property");
  });

  it("fixes grammar: '1 occupant maximum' and 'All tenants welcome'", () => {
    const html = renderToStaticMarkup(
      <PropertyDetailsSheetBody rental={baseRental} />
    );

    expect(html).toContain("1 occupant maximum");
    expect(html).not.toContain("Up to 1 occupants");
    expect(html).toContain("All tenants welcome");
    expect(html).not.toContain("Tenant policy: any");
    expect(html).toContain("No curfew");
  });

  it("renders cautionary advisory when listing is pending verification", () => {
    const pendingRental: RentalResult = {
      ...baseRental,
      verificationStatus: "unverified",
    };
    const html = renderToStaticMarkup(
      <PropertyDetailsSheetBody rental={pendingRental} />
    );

    expect(html).toContain("Pending verification");
    expect(html).toContain("This listing is awaiting staff verification");
  });

  it("renders empty state placeholder when no photos are present", () => {
    const noPhotoRental: RentalResult = {
      ...baseRental,
      imageUrls: [],
    };
    const html = renderToStaticMarkup(
      <PropertyDetailsSheetBody rental={noPhotoRental} />
    );

    expect(html).toContain("Property photo gallery");
    expect(html).toContain("No photos provided");
    expect(html).not.toContain("Previous photo");
  });

  it("renders amenities with contextual labels", () => {
    const html = renderToStaticMarkup(
      <PropertyDetailsSheetBody rental={baseRental} />
    );

    expect(html).toContain("Amenities");
    expect(html).toContain("Wi-Fi");
    expect(html).toContain("Cooking allowed");
  });

  it("renders the sticky footer with Message landlord and Save listing buttons", () => {
    const html = renderToStaticMarkup(
      <PropertyDetailsSheetFooter
        rental={baseRental}
        canMessage={true}
        canSave={true}
        saved={false}
        onMessage={vi.fn()}
        onToggleSaved={vi.fn()}
      />
    );

    expect(html).toContain("Message landlord");
    expect(html).toContain('aria-label="Save listing"');
  });

  it("renders saved state in secondary button", () => {
    const html = renderToStaticMarkup(
      <PropertyDetailsSheetFooter
        rental={baseRental}
        canMessage={true}
        canSave={true}
        saved={true}
        onMessage={vi.fn()}
        onToggleSaved={vi.fn()}
      />
    );

    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="Remove listing from saved"');
  });

  it("renders multi-unit availability badge and unit pills for multi-unit property", () => {
    const multiUnitRental: RentalResult = {
      ...baseRental,
      availableUnitsCount: 2,
      totalUnitsCount: 3,
      units: [
        { id: "u-1", unitNumber: "Room 1", rentalType: "private_room", monthlyRent: 4500, maxOccupants: 1, isAvailable: false },
        { id: "u-2", unitNumber: "Room 2", rentalType: "private_room", monthlyRent: 4500, maxOccupants: 1, isAvailable: true },
        { id: "u-3", unitNumber: "Room 3", rentalType: "private_room", monthlyRent: 5000, maxOccupants: 2, isAvailable: true },
      ],
    };
    const html = renderToStaticMarkup(<PropertyDetailsSheetBody rental={multiUnitRental} />);

    expect(html).toContain("2 of 3 units available");
    expect(html).toContain("Room 1 (Occupied)");
    expect(html).toContain("Room 2 (Available — ₱4,500/mo)");
    expect(html).toContain("Room 3 (Available — ₱5,000/mo)");
  });
});
