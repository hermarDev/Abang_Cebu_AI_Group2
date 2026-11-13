const CANONICAL_PROPERTY_TYPES: Record<string, string> = {
  bedspace: "Bedspace",
  boarding_house: "Boarding House",
  private_room: "Private Room",
  shared_room: "Shared Room",
  studio: "Studio",
  apartment: "Apartment",
  condo: "Condominium",
  condominium: "Condominium",
  house: "House",
  townhouse: "House",
};

export function formatPropertyType(rawType?: string | null): string {
  if (!rawType || !rawType.trim()) return "Property";
  const trimmed = rawType.trim();
  const normalizedKey = trimmed.toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  if (CANONICAL_PROPERTY_TYPES[normalizedKey]) {
    return CANONICAL_PROPERTY_TYPES[normalizedKey];
  }
  // Fallback for unknown snake_case / kebab-case / spaced string -> Title Case
  return normalizedKey
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatListingAddress(streetOrAddress?: string | null, city?: string | null): string {
  const street = streetOrAddress?.trim() ?? "";
  const c = city?.trim() ?? "";

  if (!street && !c) return "";
  if (!street) return c;
  if (!c) return street;

  if (street.toLowerCase() === c.toLowerCase()) {
    return street;
  }

  const trailingCityRegex = new RegExp(`,\\s*${escapeRegex(c)}[.\\s]*$`, "i");
  if (trailingCityRegex.test(street)) {
    return street;
  }

  return `${street}, ${c}`;
}
