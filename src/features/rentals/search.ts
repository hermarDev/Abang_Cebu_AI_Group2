import type { Rental } from "@/contracts/preview";
import type { RentalFilters } from "@/contracts/rental-filters";

export type SearchFilters = Partial<RentalFilters> & { type?: Rental["type"] | "all"; wifi?: boolean };

export function searchPreviewRentals(
  rentals: Rental[],
  filters: SearchFilters,
  location = "",
  origin: [number, number] = [123.907, 10.328],
) {
  const query = location.trim().toLocaleLowerCase();
  return rentals.flatMap((rental) => {
    if (!rental.available) return [];
    if (query && ![rental.title, rental.locality, rental.address ?? ""].join(" ").toLocaleLowerCase().includes(query)) return [];
    if (filters.minPrice != null && rental.price < filters.minPrice) return [];
    if (filters.maxPrice != null && rental.price > filters.maxPrice) return [];
    if (filters.type && filters.type !== "all" && rental.type !== filters.type) return [];
    const propertyType = rental.propertyType ?? (rental.type === "room" ? "private_room" : rental.type === "bedspace" ? "bedspace" : "boarding_house");
    if (filters.propertyTypes?.length && !filters.propertyTypes.includes(propertyType)) return [];
    if ((filters.wifi || filters.wifiAvailable === true) && rental.wifiAvailable !== true && !rental.amenities.includes("Wi-Fi")) return [];
    if (filters.occupants != null && (rental.maxOccupants ?? 1) < filters.occupants) return [];
    if (filters.bathroom && rental.bathroomType !== filters.bathroom) return [];
    if (filters.cookingAllowed === true && rental.cookingAllowed !== true) return [];
    if (filters.laundryAllowed === true && rental.laundryAllowed !== true) return [];
    if (filters.curfewType && rental.curfewType !== filters.curfewType) return [];
    if (filters.aircon === true && rental.aircon !== true) return [];
    if (filters.waterIncluded === true && rental.waterPricingType !== "included") return [];
    if ((filters.electricityIncluded === true || ("powerIncluded" in filters && filters.powerIncluded === true)) && rental.electricityPricingType !== "included") return [];
    if ((filters.motorcycleParking === true || ("motorParking" in filters && filters.motorParking === true)) && rental.motorcycleParking !== true) return [];
    if (filters.carParking === true && rental.carParking !== true) return [];
    if (filters.verifiedOnly === true && (!rental.verificationStatus || rental.verificationStatus === "unverified")) return [];
    if (filters.directLandlordOnly === true && rental.directLandlord !== true) return [];
    const [lng, lat] = rental.coordinates;
    const [originLng, originLat] = origin;
    const dLat = (lat - originLat) * Math.PI / 180;
    const dLng = (lng - originLng) * Math.PI / 180;
    const distanceMeters = 6371008.8 * 2 * Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(originLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2));
    if (filters.radiusKm != null && distanceMeters > filters.radiusKm * 1000) return [];
    return [{ ...rental, distanceMeters }];
  }).sort((a, b) => a.distanceMeters - b.distanceMeters || a.price - b.price || a.id.localeCompare(b.id));
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(price);
}

export function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}
