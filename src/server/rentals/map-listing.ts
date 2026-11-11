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

function parseDescription(value: unknown): string {
  if (value == null) return "No description provided.";
  if (typeof value !== "string") throw new Error("Invalid listing");
  return value.trim() || "No description provided.";
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
    id: text(row.id), title: text(row.title), address: row.address == null ? text(row.city) : text(row.address), imageUrls: Array.isArray(row.image_urls) ? row.image_urls.filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url)) : [], description: parseDescription(row.description),
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


const amenityLabels: Record<string, string> = { wifi: "Wi-Fi", cooking: "Cooking allowed", aircon: "Air conditioning", laundry: "Laundry allowed",
  water_included: "Water included", electricity_included: "Electricity included", motorcycle_parking: "Motorcycle parking", car_parking: "Car parking" };
const storagePath = /^[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f-]+\/[0-9a-f]{64}\.(?:jpg|png|webp)$/i;

// Maps a get_public_submitted_rentals row; tenant_policy may be a plain policy string or an object of amenity flags.
export function mapSubmittedRental(value: unknown, signedUrlsByPath: ReadonlyMap<string, string> = new Map()): RentalResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid listing");
  const row = value as Record<string, unknown>;
  const policyObject = row.tenant_policy && typeof row.tenant_policy === "object" && !Array.isArray(row.tenant_policy) ? row.tenant_policy as Record<string, unknown> : {};
  const tags = new Set(Array.isArray(row.amenities) ? row.amenities.filter((a): a is string => typeof a === "string") : []);
  const flag = (tag: string, key: string) => tags.has(tag) || policyObject[key] === true;
  const parking = String(policyObject.parking_availability ?? "").toLowerCase();
  const motorcycleParking = flag("motorcycle_parking", "motorcycle_parking") || /motor/.test(parking) || parking === "both";
  const carParking = flag("car_parking", "car_parking") || /\bcar\b/.test(parking) || parking === "both";
  const wifi = flag("wifi", "wifi_included"), aircon = flag("aircon", "aircon_included"), cooking = flag("cooking", "cooking_allowed"),
    laundry = flag("laundry", "laundry_allowed"), water = flag("water_included", "water_included"), power = flag("electricity_included", "electricity_included");
  const active = { wifi, aircon, cooking, laundry, water_included: water, electricity_included: power, motorcycle_parking: motorcycleParking, car_parking: carParking };

  const rentalType = row.rental_type;
  const mapped = row.property_type === "condominium" ? "condo" : row.property_type === "townhouse" ? "house"
    : row.property_type === "commercial" ? (rentalType === "bedspace" || rentalType === "private_room" || rentalType === "shared_room" ? rentalType : "apartment")
    : row.property_type;
  const propertyType = choice(mapped, propertyTypes);
  const maxOccupants = row.max_occupants == null ? null : number(row.max_occupants, 1, Number.MAX_SAFE_INTEGER);
  if (maxOccupants !== null && !Number.isInteger(maxOccupants)) throw new Error("Invalid listing");
  const policy = typeof row.tenant_policy === "string" ? row.tenant_policy : typeof policyObject.tenant_policy === "string" ? policyObject.tenant_policy : null;
  const curfew = policyObject.curfew_policy ?? policyObject.curfew_type;
  const status = choice(row.moderation_status, ["approved", "pending"] as const);
  const photos = Array.isArray(row.photo_paths) ? row.photo_paths : [];
  const seenKeys = new Set<string>();
  const imageUrls = photos.flatMap((path) => {
    if (typeof path !== "string") return [];
    const dedupeKey = path.split("/").pop()?.toLowerCase() ?? path;
    if (seenKeys.has(dedupeKey)) return [];
    if (/^https:\/\//i.test(path)) { seenKeys.add(dedupeKey); return [path]; }
    const url = storagePath.test(path) ? signedUrlsByPath.get(path) : undefined;
    if (!url) return [];
    seenKeys.add(dedupeKey);
    return [url];
  });

  return {
    id: text(row.id), title: text(row.title), address: row.address == null ? text(row.city) : text(row.address), imageUrls,
    description: parseDescription(row.description), locality: text(row.city),
    coordinates: [number(row.longitude, -180, 180), number(row.latitude, -90, 90)], price: number(row.price, 0, Number.MAX_SAFE_INTEGER),
    type: propertyType, propertyType, basis: rentalType === "bedspace" ? "bed" : "room", available: true, distanceMeters: null,
    area: row.floor_area_sqm == null ? 0 : number(row.floor_area_sqm, 0, Number.MAX_SAFE_INTEGER), tone: "sage",
    amenities: Object.entries(active).filter(([, on]) => on).map(([tag]) => amenityLabels[tag]),
    maxOccupants, bathroomType: row.bathroom_type == null ? null : choice(row.bathroom_type, ["private", "shared"]),
    tenantPolicy: policy == null ? null : choice(policy, ["any", "female_only", "male_only", "mixed"]),
    curfewType: curfew == null ? null : choice(curfew, ["none", "fixed", "conditional"]),
    cookingAllowed: cooking, laundryAllowed: laundry, wifiAvailable: wifi, aircon,
    waterPricingType: water ? "included" : null, electricityPricingType: power ? "included" : null,
    motorcycleParking, carParking,
    verificationStatus: status === "approved" ? "property_verified" : "unverified", directLandlord: true,
  };
}
