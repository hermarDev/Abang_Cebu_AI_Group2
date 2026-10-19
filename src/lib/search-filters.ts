export const PROPERTY_TYPES = [
  "boarding_house",
  "bedspace",
  "apartment",
  "condo",
] as const;

export const AMENITIES = [
  "aircon",
  "wifi",
  "private_cr",
  "cooking_allowed",
  "laundry",
  "submeter",
] as const;

export const GENDER_POLICIES = ["male_only", "female_only", "coed"] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type Amenity = (typeof AMENITIES)[number];
export type GenderPolicy = (typeof GENDER_POLICIES)[number];

export interface SearchFilters {
  type: PropertyType[];
  minRent?: number;
  maxRent?: number;
  gender?: GenderPolicy;
  amenities: Amenity[];
}

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  type: [],
  amenities: [],
};

const FILTER_KEYS = ["type", "min_rent", "max_rent", "gender", "amenities"] as const;

function readList<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T[] {
  const values = [...params.getAll(key).flatMap((entry) => entry.split(","))];
  return [...new Set(values.filter((value): value is T => allowed.includes(value as T)))].sort();
}

function readRent(params: URLSearchParams, key: string): number | undefined {
  const value = params.get(key);
  if (value === null || !/^\d+$/.test(value)) return undefined;

  const amount = Number(value);
  return Number.isSafeInteger(amount) ? amount : undefined;
}

export function parseSearchFilters(
  search: string | URLSearchParams,
): SearchFilters {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  const minRent = readRent(params, "min_rent");
  const maxRent = readRent(params, "max_rent");
  const validRentRange =
    minRent === undefined || maxRent === undefined || minRent <= maxRent;
  const gender = params.get("gender");

  return {
    type: readList(params, "type", PROPERTY_TYPES),
    ...(validRentRange && minRent !== undefined ? { minRent } : {}),
    ...(validRentRange && maxRent !== undefined ? { maxRent } : {}),
    ...(GENDER_POLICIES.includes(gender as GenderPolicy)
      ? { gender: gender as GenderPolicy }
      : {}),
    amenities: readList(params, "amenities", AMENITIES),
  };
}

export function serializeSearchFilters(
  filters: SearchFilters,
  current: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const params = new URLSearchParams(current);
  FILTER_KEYS.forEach((key) => params.delete(key));

  const types = [...new Set(filters.type)].filter((value) =>
    PROPERTY_TYPES.includes(value),
  ).sort();
  const amenities = [...new Set(filters.amenities)].filter((value) =>
    AMENITIES.includes(value),
  ).sort();

  if (types.length) params.set("type", types.join(","));
  if (
    filters.minRent !== undefined &&
    Number.isSafeInteger(filters.minRent) &&
    filters.minRent >= 0 &&
    (filters.maxRent === undefined || filters.minRent <= filters.maxRent)
  ) {
    params.set("min_rent", String(filters.minRent));
  }
  if (
    filters.maxRent !== undefined &&
    Number.isSafeInteger(filters.maxRent) &&
    filters.maxRent >= 0 &&
    (filters.minRent === undefined || filters.minRent <= filters.maxRent)
  ) {
    params.set("max_rent", String(filters.maxRent));
  }
  if (filters.gender && GENDER_POLICIES.includes(filters.gender)) {
    params.set("gender", filters.gender);
  }
  if (amenities.length) params.set("amenities", amenities.join(","));

  return params;
}

export function toggleFilterValue<T extends string>(
  values: readonly T[],
  value: T,
): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value].sort();
}

export function isRentRangeValid(filters: SearchFilters): boolean {
  return (
    filters.minRent === undefined ||
    filters.maxRent === undefined ||
    filters.minRent <= filters.maxRent
  );
}
