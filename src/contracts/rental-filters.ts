/**
 * Canonical Rental Filters Specification for AbangCebu.
 * Follows ABANGCEBU_AI_AGENT_REAL_RENTAL_FILTERS_SPEC.md strictly.
 */

export type PropertyType =
  | "bedspace"
  | "boarding_house"
  | "private_room"
  | "shared_room"
  | "studio"
  | "apartment"
  | "condo"
  | "house";

export type BathroomType = "private" | "shared";

export type TenantPolicy = "any" | "female_only" | "male_only" | "mixed";

export type CurfewType = "none" | "fixed" | "conditional";

export type VisitorsPolicy = "allowed" | "restricted" | "not_allowed";

export type FurnishingType = "unfurnished" | "semi_furnished" | "furnished";

export type WaterPricingType = "included" | "fixed" | "per_person" | "metered";

export type ElectricityPricingType = "included" | "submetered" | "fixed";

export type VerificationStatus =
  | "unverified"
  | "identity_verified"
  | "property_verified"
  | "fully_verified";

/** Canonical filter state for search, URL query, and database queries. */
export interface RentalFilters {
  minPrice?: number | null;
  maxPrice?: number | null;

  propertyTypes: PropertyType[];

  occupants?: number | null;

  bathroom?: BathroomType | null;

  tenantPolicy?: TenantPolicy | null;

  cookingAllowed?: boolean | null;
  laundryAllowed?: boolean | null;
  kitchenAvailable?: boolean | null;
  laundryArea?: boolean | null;

  curfewType?: CurfewType | null;
  curfewTime?: string | null;

  visitorsPolicy?: VisitorsPolicy | null;

  petsAllowed?: boolean | null;
  childrenAllowed?: boolean | null;
  smokingAllowed?: boolean | null;

  wifiAvailable?: boolean | null;
  wifiIncluded?: boolean | null;
  wfhSuitable?: boolean | null;
  minInternetSpeedMbps?: number | null;

  aircon?: boolean | null;
  electricFan?: boolean | null;
  terrace?: boolean | null;

  furnishingTypes: FurnishingType[];

  motorcycleParking?: boolean | null;
  carParking?: boolean | null;
  bicycleParking?: boolean | null;

  waterPricingType?: WaterPricingType | null;
  waterIncluded?: boolean | null;
  waterFee?: number | null;

  electricityPricingType?: ElectricityPricingType | null;
  electricityIncluded?: boolean | null;
  electricitySubmetered?: boolean | null;
  electricityRatePerKwh?: number | null;
  electricityFixedFee?: number | null;

  availableBy?: string | null;

  maxMinimumStayMonths?: number | null;

  maxAdvanceMonths?: number | null;
  maxDepositMonths?: number | null;

  gated?: boolean | null;
  cctv?: boolean | null;
  securityGuard?: boolean | null;
  ownEntrance?: boolean | null;
  wellLitEntrance?: boolean | null;

  landlordReportsNoFlooding?: boolean | null;

  verifiedOnly?: boolean | null;
  directLandlordOnly?: boolean | null;
  exactLocationVerified?: boolean | null;

  listedWithinDays?: number | null;

  lat?: number | null;
  lng?: number | null;
  radiusKm?: number | null;

  landmarkLat?: number | null;
  landmarkLng?: number | null;
  landmarkRadiusMeters?: number | null;
}

/** Full Rental Listing domain model supporting strict unknown (null) semantics. */
export interface RentalListing {
  id: string;
  title: string;
  description: string;
  monthlyRent: number;
  propertyType: PropertyType;
  coordinates: [longitude: number, latitude: number];
  locality: string;
  barangay?: string | null;
  city?: string | null;
  locationText?: string | null;

  minOccupants?: number | null;
  maxOccupants?: number | null;

  bathroomType?: BathroomType | null;
  aircon?: boolean | null;
  electricFan?: boolean | null;
  terrace?: boolean | null;
  furnishingType?: FurnishingType | null;

  tenantPolicy?: TenantPolicy | null;
  curfewType?: CurfewType | null;
  curfewTime?: string | null;
  visitorsPolicy?: VisitorsPolicy | null;
  petsAllowed?: boolean | null;
  childrenAllowed?: boolean | null;
  smokingAllowed?: boolean | null;

  cookingAllowed?: boolean | null;
  laundryAllowed?: boolean | null;
  kitchenAvailable?: boolean | null;
  laundryArea?: boolean | null;

  wifiAvailable?: boolean | null;
  wifiIncluded?: boolean | null;
  wfhSuitable?: boolean | null;
  internetSpeedMbps?: number | null;

  waterPricingType?: WaterPricingType | null;
  waterFee?: number | null;
  electricityPricingType?: ElectricityPricingType | null;
  electricityRatePerKwh?: number | null;
  electricityFixedFee?: number | null;

  motorcycleParking?: boolean | null;
  carParking?: boolean | null;
  bicycleParking?: boolean | null;

  advanceMonths?: number | null;
  depositMonths?: number | null;
  availableFrom?: string | null;
  minimumStayMonths?: number | null;

  gated?: boolean | null;
  cctv?: boolean | null;
  securityGuard?: boolean | null;
  ownEntrance?: boolean | null;
  wellLitEntrance?: boolean | null;

  landlordReportsNoFlooding?: boolean | null;

  verificationStatus?: VerificationStatus | null;
  directLandlord?: boolean | null;
  exactLocationVerified?: boolean | null;

  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
  available: boolean;
  basis?: "room" | "bed";
  area?: number;
  tone?: "sage" | "sand" | "clay" | "blue";
  distanceMeters?: number | null;
}

/** Default empty filter state. */
export const DEFAULT_RENTAL_FILTERS: RentalFilters = {
  minPrice: null,
  maxPrice: null,
  propertyTypes: [],
  occupants: null,
  bathroom: null,
  tenantPolicy: null,
  cookingAllowed: null,
  laundryAllowed: null,
  kitchenAvailable: null,
  laundryArea: null,
  curfewType: null,
  curfewTime: null,
  visitorsPolicy: null,
  petsAllowed: null,
  childrenAllowed: null,
  smokingAllowed: null,
  wifiAvailable: null,
  wifiIncluded: null,
  wfhSuitable: null,
  minInternetSpeedMbps: null,
  aircon: null,
  electricFan: null,
  terrace: null,
  furnishingTypes: [],
  motorcycleParking: null,
  carParking: null,
  bicycleParking: null,
  waterPricingType: null,
  waterIncluded: null,
  waterFee: null,
  electricityPricingType: null,
  electricityIncluded: null,
  electricitySubmetered: null,
  electricityRatePerKwh: null,
  electricityFixedFee: null,
  availableBy: null,
  maxMinimumStayMonths: null,
  maxAdvanceMonths: null,
  maxDepositMonths: null,
  gated: null,
  cctv: null,
  securityGuard: null,
  ownEntrance: null,
  wellLitEntrance: null,
  landlordReportsNoFlooding: null,
  verifiedOnly: null,
  directLandlordOnly: null,
  exactLocationVerified: null,
  listedWithinDays: null,
  lat: null,
  lng: null,
  radiusKm: null,
  landmarkLat: null,
  landmarkLng: null,
  landmarkRadiusMeters: null,
};
