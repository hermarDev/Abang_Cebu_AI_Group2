/** Local, synthetic preview data only. Extended with real Cebu rental filter domain fields. */
import type {
  BathroomType,
  CurfewType,
  ElectricityPricingType,
  FurnishingType,
  PropertyType,
  RentalFilters,
  TenantPolicy,
  VerificationStatus,
  VisitorsPolicy,
  WaterPricingType,
} from "./rental-filters";

export type Coordinate = [longitude: number, latitude: number];
export type RentalType = "room" | "bedspace" | "boarding-house" | PropertyType;

export type Rental = {
  id: string;
  title: string;
  locality: string;
  coordinates: Coordinate;
  price: number;
  type: RentalType;
  basis: "room" | "bed";
  amenities: string[];
  description: string;
  area: number;
  tone: "sage" | "sand" | "clay" | "blue";
  available: boolean;

  // Real Cebu rental dimensions (nullable for strict unknown semantics)
  propertyType?: PropertyType;
  minOccupants?: number | null;
  maxOccupants?: number | null;
  bathroomType?: BathroomType | null;
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
  aircon?: boolean | null;
  electricFan?: boolean | null;
  terrace?: boolean | null;
  furnishingType?: FurnishingType | null;
  motorcycleParking?: boolean | null;
  carParking?: boolean | null;
  bicycleParking?: boolean | null;
  waterPricingType?: WaterPricingType | null;
  waterFee?: number | null;
  electricityPricingType?: ElectricityPricingType | null;
  electricityRatePerKwh?: number | null;
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
  publishedAt?: string | null;
};

export type SearchScope =
  | { mode: "map-radius" | "place-radius"; center: Coordinate; radiusMeters: number; label: string }
  | { mode: "viewport"; bounds: { west: number; south: number; east: number; north: number }; label: string };

export type SearchFilters = {
  maxPrice: number | null;
  type: RentalType | "all";
  wifi: boolean;
  minPrice?: number | null;
  propertyTypes?: PropertyType[];
  occupants?: number | null;
  bathroom?: BathroomType | null;
  cookingAllowed?: boolean | null;
  laundryAllowed?: boolean | null;
  curfewType?: CurfewType | null;
  waterIncluded?: boolean | null;
  powerIncluded?: boolean | null;
  motorParking?: boolean | null;
  carParking?: boolean | null;
  verifiedOnly?: boolean | null;
  directLandlordOnly?: boolean | null;
};

export type RentalResult = Rental & { distanceMeters: number | null };

export type MapView = {
  center: Coordinate;
  radiusMeters: number;
  bounds: { west: number; south: number; east: number; north: number };
  zoom: number;
};

export type MapFocus = { center: Coordinate; zoom?: number; radiusMeters?: number; revision: number };

export type CebuMapProps = {
  rentals: RentalResult[];
  scope: SearchScope;
  pendingScope: SearchScope | null;
  selectedId: string | null;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  focus: MapFocus | null;
  onSelect: (id: string) => void;
  onViewChange: (view: MapView, userInitiated: boolean) => void;
  onReady?: () => void;
};

export type { RentalFilters };
