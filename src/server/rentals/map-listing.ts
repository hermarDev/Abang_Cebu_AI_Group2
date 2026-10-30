import type { RentalResult } from "@/contracts/preview";

const propertyTypes = ["bedspace", "boarding_house", "private_room", "shared_room", "studio", "apartment", "condo", "house"] as const;

function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Invalid listing");
  return value.trim();
}

function number(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error("Invalid listing");
  }
  return value;
}

function boolean(value: unknown): boolean | null {
  if (value == null) return null;
  if (typeof value !== "boolean") throw new Error("Invalid listing");
  return value;
}

function choice<const T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== "string" || !choices.includes(value as T)) throw new Error("Invalid listing");
  return value as T;
}

export function mapListing(value: unknown): RentalResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid listing");
  const row = value as Record<string, unknown>;
  if (row.status !== "published" || row.is_available !== true || row.currency !== "PHP" || row.rental_period !== "monthly") {
    throw new Error("Unsupported listing");
  }
  const propertyType = choice(row.property_type, propertyTypes);
  const wifiAvailable = boolean(row.wifi_available);
  const cookingAllowed = boolean(row.cooking_allowed);
  const waterIncluded = boolean(row.water_included);
  const electricityIncluded = boolean(row.electricity_included);
  const aircon = boolean(row.aircon);
  const maxOccupants = row.max_occupants == null ? null : number(row.max_occupants, 1, Number.MAX_SAFE_INTEGER);
  if (maxOccupants !== null && !Number.isInteger(maxOccupants)) throw new Error("Invalid listing");

  return {
    id: text(row.id), title: text(row.title), address: row.address == null ? text(row.city) : text(row.address), imageUrls: Array.isArray(row.image_urls) ? row.image_urls.filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url)) : [], description: row.description == null ? "" : text(row.description),
    locality: text(row.city), coordinates: [number(row.longitude, -180, 180), number(row.latitude, -90, 90)],
    price: number(row.price, 0, Number.MAX_SAFE_INTEGER), type: propertyType, propertyType,
    basis: propertyType === "bedspace" ? "bed" : "room", available: true, distanceMeters: null,
    // shortcut: schema has no floor area; 0 is unknown until the shared contract supports null.
    area: 0, tone: "sage",
    amenities: [wifiAvailable && "Wi-Fi", cookingAllowed && "Cooking allowed", aircon && "Air conditioning",
      waterIncluded && "Water included", electricityIncluded && "Electricity included"].filter((item): item is string => typeof item === "string"),
    maxOccupants,
    bathroomType: row.bathroom_type == null ? null : choice(row.bathroom_type, ["private", "shared"]),
    curfewType: row.curfew_type == null ? null : choice(row.curfew_type, ["none", "fixed", "conditional"]),
    cookingAllowed, laundryAllowed: boolean(row.laundry_allowed), wifiAvailable, aircon,
    waterPricingType: waterIncluded === true ? "included" : null,
    electricityPricingType: electricityIncluded === true ? "included" : null,
    motorcycleParking: boolean(row.motorcycle_parking), carParking: boolean(row.car_parking),
    verificationStatus: row.verification_status == null ? null : choice(row.verification_status, ["unverified", "identity_verified", "property_verified", "fully_verified"]),
    directLandlord: boolean(row.direct_landlord),
  };
}
