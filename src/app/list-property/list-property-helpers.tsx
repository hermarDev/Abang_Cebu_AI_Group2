"use client";

import { useEffect, useRef } from "react";

export const propertyTypes = [
  ["apartment", "Apartment"], ["condominium", "Condominium"], ["house", "House"],
  ["townhouse", "Townhouse"], ["commercial", "Commercial"], ["boarding_house", "Boarding house"],
] as const;

// Unit types that make sense per property type: whole-property rentals for
// standalone/commercial spaces, room-level rentals for boarding houses.
export const unitTypesByPropertyType: Record<string, readonly string[]> = {
  apartment: ["entire_place", "private_room", "shared_room", "bedspace"],
  condominium: ["entire_place", "private_room", "shared_room", "bedspace"],
  house: ["entire_place", "private_room", "shared_room", "bedspace"],
  townhouse: ["entire_place", "private_room", "shared_room", "bedspace"],
  commercial: ["entire_place"],
  boarding_house: ["entire_place", "private_room", "shared_room", "bedspace"],
};
export const allUnitTypes = ["entire_place", "private_room", "shared_room", "bedspace"] as const;
export const unitTypeLabels: Record<string, string> = { entire_place: "Entire place", private_room: "Private room", shared_room: "Shared room", bedspace: "Bedspace" };

export function getRentOutlierWarning(rentalType: string, rawPrice: string): string | null {
  const trimmed = rawPrice.trim();
  if (!trimmed) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const bounds: Record<string, { min: number; max: number; label: string }> = {
    bedspace: { min: 500, max: 12_000, label: "a bedspace (per bed)" },
    shared_room: { min: 800, max: 18_000, label: "a shared room" },
    private_room: { min: 1_000, max: 35_000, label: "a private room" },
    entire_place: { min: 2_500, max: 250_000, label: "an entire place" },
  };
  const rule = bounds[rentalType] ?? { min: 500, max: 250_000, label: "a rental unit" };
  if (amount < rule.min) {
    return `₱${amount.toLocaleString("en-PH")} is unusually low for ${rule.label}. Confirm this monthly rent is accurate before submitting.`;
  }
  if (amount > rule.max) {
    return `₱${amount.toLocaleString("en-PH")} is unusually high for ${rule.label}. Confirm this monthly rent is accurate before submitting.`;
  }
  return null;
}

export function getCityGuidance(city: string) {
  const norm = (city || "").trim().toLowerCase();
  if (norm.includes("mandaue")) {
    return {
      cityName: "Mandaue City",
      text: "Mandaue City typically looks for a City Business Permit / Mayor's Permit or Barangay Business Clearance, accompanied by Fire Safety Inspection Certificate (FSIC) and Sanitary Permit. For individual residential owners leasing rooms or units, a proof of ownership (Tax Declaration or Transfer Certificate of Title) or authorization letter is commonly reviewed.",
    };
  }
  if (norm.includes("lapu-lapu") || norm.includes("lapu lapu")) {
    return {
      cityName: "Lapu-Lapu City",
      text: "Lapu-Lapu City verification standardly accepts the Mayor's Business Permit, Barangay Clearance for Leasing, and Fire Safety Inspection Certificate. Condominium and subdivision rentals may also provide HOA clearance or Land Title / Tax Declaration.",
    };
  }
  if (norm.includes("talisay")) {
    return {
      cityName: "Talisay City",
      text: "Talisay City guidelines recognize business permits issued by the City Hall or Barangay Clearance alongside sanitary and fire certificates. For residential accommodations, ownership proof (Tax Declaration / Deed) is also accepted.",
    };
  }
  if (norm.includes("cebu")) {
    return {
      cityName: "Cebu City",
      text: "Cebu City typically reviews the Mayor's Business Permit and Barangay Clearance for commercial/commercial-residential rentals, or Fire Safety Inspection Certificate (FSIC). Individual property owners offering residential rooms or houses may provide a Tax Declaration or Proof of Ownership if commercial registration is not required.",
    };
  }
  return {
    cityName: city.trim() || "Metro Cebu LGU",
    text: "Local Government Units across Cebu typically verify rental listings through a Mayor's / Business Permit, Barangay Clearance, Fire Safety Inspection Certificate (FSIC), or Sanitary Permit. Individual residential landlords may provide ownership proof (Tax Declaration, Deed of Sale, or HOA authorization) when commercial permits are not applicable.",
  };
}

export const amenities = [
  ["wifi", "Wi-Fi"], ["aircon", "Air conditioning"], ["cooking", "Cooking allowed"], ["laundry", "Laundry area"],
  ["water_included", "Water included"], ["electricity_included", "Electricity included"],
  ["motorcycle_parking", "Motorcycle parking"], ["car_parking", "Car parking"],
] as const;

export const steps = ["Property details", "Location", "Amenities & photos", "Business permit", "Review"];
export const STEP_HEADING_IDS = [
  "property-details-heading",
  "property-location-heading",
  "property-amenities-heading",
  "business-permit-heading",
  "listing-review-heading",
] as const;

export type ListingReview = {
  title: string;
  description: string;
  propertyType: string;
  rentalType: string;
  barangay: string;
  price: string;
  city: string;
  amenities: string[];
  tenantPolicy: string;
  bathrooms?: string;
  bathroomType?: string;
};

export function PermitThumbnail({ file, className = "size-12 rounded object-cover" }: { file: File; className?: string }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (image.current) image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  // Blob URLs are local previews and cannot use the image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={image} alt="" className={className} />;
}

export const fileSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const sameFiles = (a: File[], b: File[]) => a.length === b.length && a.every((f, i) => f.name === b[i].name && f.size === b[i].size && f.type === b[i].type);
