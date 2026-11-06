import type { PlaceResult } from "@/lib/search/places";

type DraftValues = {
  title: string; description: string; propertyType: string; rentalType: string; price: string;
  address: string; barangay: string; city: string; bathroomType: string; maxOccupants: string;
  amenities: string[]; permitApplicability: string; permitNumber: string; permitLgu: string;
  permitExpiresOn: string; permitNotRequiredConfirmed: boolean; location: PlaceResult | null;
};

export function createDraftPayload(values: DraftValues) {
  return {
    property: {
      title: values.title, description: values.description, property_type: values.propertyType,
      street_address: values.address, barangay: values.barangay, city: values.city,
      latitude: values.location?.coordinates[1] ?? null, longitude: values.location?.coordinates[0] ?? null,
      location_id: values.location?.id ?? null, location_name: values.location?.name ?? null,
      location_detail: values.location?.detail ?? null, permit_applicability: values.permitApplicability,
      permit_number: values.permitNumber, permit_lgu: values.permitLgu, permit_expires_on: values.permitExpiresOn,
      permit_not_required_confirmed: String(values.permitNotRequiredConfirmed),
    },
    unit: { rental_type: values.rentalType, monthly_rent: values.price, bathroom_type: values.bathroomType, max_occupants: values.maxOccupants },
    amenities: values.amenities,
  };
}

export function restoreDraftValues(value: unknown): DraftValues {
  const unsupported = () => { throw new Error("Unsupported property draft"); };
  if (!value || typeof value !== "object" || Array.isArray(value)) return unsupported();
  const payload = value as ReturnType<typeof createDraftPayload>;
  if (!payload.property || typeof payload.property !== "object" || Array.isArray(payload.property) ||
      !payload.unit || typeof payload.unit !== "object" || Array.isArray(payload.unit)) return unsupported();
  const prototype = createDraftPayload({ title: "", description: "", propertyType: "", rentalType: "", price: "", address: "", barangay: "", city: "", bathroomType: "", maxOccupants: "", amenities: [], permitApplicability: "", permitNumber: "", permitLgu: "", permitExpiresOn: "", permitNotRequiredConfirmed: false, location: null });
  const allowedProperty = Object.keys(prototype.property);
  const allowedUnit = Object.keys(prototype.unit);
  if (Object.keys(payload).some((key) => !["property", "unit", "amenities"].includes(key)) ||
      Object.keys(payload.property).some((key) => !allowedProperty.includes(key)) ||
      Object.keys(payload.unit).some((key) => !allowedUnit.includes(key))) return unsupported();
  const p = { ...prototype.property, ...payload.property };
  const u = { ...prototype.unit, ...payload.unit };
  const amenities = payload.amenities ?? [];
  if (!Array.isArray(amenities) || new Set(amenities).size !== amenities.length || amenities.some((item) => typeof item !== "string" || !["wifi", "aircon", "cooking", "laundry", "water_included", "electricity_included", "motorcycle_parking", "car_parking"].includes(item))) return unsupported();
  if (typeof u.monthly_rent === "number" && Number.isFinite(u.monthly_rent)) u.monthly_rent = String(u.monthly_rent);
  if (typeof u.max_occupants === "number" && Number.isFinite(u.max_occupants)) u.max_occupants = String(u.max_occupants);
  if ([p.title, p.description, p.property_type, p.street_address, p.barangay, p.city, p.permit_applicability, p.permit_number, p.permit_lgu, p.permit_expires_on, p.permit_not_required_confirmed, u.rental_type, u.monthly_rent, u.bathroom_type, u.max_occupants].some((item) => typeof item !== "string")) return unsupported();
  if (!["", "apartment", "condominium", "house", "townhouse", "commercial", "boarding_house"].includes(p.property_type) || !["", "entire_place", "private_room", "shared_room", "bedspace"].includes(u.rental_type) || !["", "private", "shared"].includes(u.bathroom_type) || !["", "required", "not_required"].includes(p.permit_applicability)) return unsupported();
  if (p.title.length > 200 || p.description.length > 4000 || p.street_address.length > 1000 || p.barangay.length > 200 || p.city.length > 200 || p.permit_number.length > 100 || p.permit_lgu.length > 200) return unsupported();
  if ((u.monthly_rent !== "" && !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(u.monthly_rent)) || (u.max_occupants !== "" && !/^\d+$/.test(u.max_occupants))) return unsupported();
  if (p.permit_expires_on !== "" && (!/^\d{4}-\d{2}-\d{2}$/.test(p.permit_expires_on) || Number.isNaN(Date.parse(`${p.permit_expires_on}T00:00:00Z`)) || new Date(`${p.permit_expires_on}T00:00:00Z`).toISOString().slice(0, 10) !== p.permit_expires_on)) return unsupported();
  if (!["true", "false"].includes(p.permit_not_required_confirmed)) return unsupported();
  const locationParts = [p.location_id, p.location_name, p.location_detail, p.latitude, p.longitude];
  if (!locationParts.every((part) => part === null) && !(typeof p.location_id === "string" && typeof p.location_name === "string" && typeof p.location_detail === "string" && typeof p.latitude === "number" && Number.isFinite(p.latitude) && p.latitude >= -90 && p.latitude <= 90 && typeof p.longitude === "number" && Number.isFinite(p.longitude) && p.longitude >= -180 && p.longitude <= 180)) return unsupported();
  return {
    title: p.title, description: p.description, propertyType: p.property_type, rentalType: u.rental_type,
    price: u.monthly_rent, address: p.street_address, barangay: p.barangay, city: p.city,
    bathroomType: u.bathroom_type, maxOccupants: u.max_occupants, amenities,
    permitApplicability: p.permit_applicability, permitNumber: p.permit_number, permitLgu: p.permit_lgu,
    permitExpiresOn: p.permit_expires_on, permitNotRequiredConfirmed: p.permit_not_required_confirmed === "true",
    location: p.location_id !== null && p.location_name !== null && p.location_detail !== null && p.longitude !== null && p.latitude !== null
      ? { id: p.location_id, name: p.location_name, detail: p.location_detail, coordinates: [p.longitude, p.latitude] }
      : null,
  };
}
