import type { PlaceResult } from "@/lib/search/places";

export function restoredMediaName(sha256: string, contentType: string, originalName: unknown) {
  if (typeof originalName === "string" && originalName) return originalName;
  const extension = contentType === "application/pdf" ? "pdf" : contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  return `${sha256}.${extension}`;
}

export type UnitDraftItem = {
  unitNumber: string;
  monthlyRent: string;
  maxOccupants: string;
  rentalType: string;
};

export type DraftValues = {
  title: string; description: string; propertyType: string; rentalType: string; price: string;
  address: string; barangay: string; city: string; bathroomType: string; maxOccupants: string;
  amenities: string[]; permitApplicability: string; permitNumber: string; permitLgu: string;
  permitExpiresOn: string; permitNotRequiredConfirmed: boolean; location: PlaceResult | null; tenantPolicy?: string;
  preserved?: { property: Record<string, string | number | null>; unit: Record<string, string | number | null>; emptyPermitConfirmation: boolean };
  units?: UnitDraftItem[];
};

export type DraftInput = Omit<DraftValues, "permitNumber" | "permitLgu" | "permitExpiresOn"> & Partial<Pick<DraftValues, "permitNumber" | "permitLgu" | "permitExpiresOn">>;

export function createDraftPayload(values: DraftInput) {
  return {
    property: {
      ...values.preserved?.property,
      title: values.title, description: values.description, property_type: values.propertyType,
      street_address: values.address, barangay: values.barangay, city: values.city,
      latitude: values.location?.coordinates[1] ?? null, longitude: values.location?.coordinates[0] ?? null,
      location_id: values.location?.id ?? null, location_name: values.location?.name ?? null,
      location_detail: values.location?.detail ?? null, permit_applicability: values.permitApplicability,
      permit_number: values.permitNumber ?? "", permit_lgu: values.permitLgu ?? "", permit_expires_on: values.permitExpiresOn ?? "",
      permit_not_required_confirmed: values.preserved?.emptyPermitConfirmation && !values.permitNotRequiredConfirmed ? "" : String(values.permitNotRequiredConfirmed),
    },
    unit: { ...values.preserved?.unit, rental_type: values.rentalType, monthly_rent: values.price, bathroom_type: values.bathroomType, max_occupants: values.maxOccupants, tenant_policy: values.tenantPolicy ?? "any" },
    amenities: values.amenities,
    ...(values.units && values.units.length > 0
      ? {
          units: values.units.map((u) => ({
            unit_number: u.unitNumber,
            monthly_rent: u.monthlyRent,
            max_occupants: u.maxOccupants,
            rental_type: u.rentalType,
          })),
        }
      : {}),
  };
}

export function restoreDraftValues(value: unknown): DraftValues {
  const unsupported = () => { throw new Error("Unsupported property draft"); };
  if (!value || typeof value !== "object" || Array.isArray(value)) return unsupported();
  const payload = value as ReturnType<typeof createDraftPayload>;
  if (!payload.property || typeof payload.property !== "object" || Array.isArray(payload.property) ||
      !payload.unit || typeof payload.unit !== "object" || Array.isArray(payload.unit)) return unsupported();
  const prototype = createDraftPayload({ title: "", description: "", propertyType: "", rentalType: "", price: "", address: "", barangay: "", city: "", bathroomType: "", maxOccupants: "", amenities: [], permitApplicability: "", permitNumber: "", permitLgu: "", permitExpiresOn: "", permitNotRequiredConfirmed: false, location: null });
  const extraProperty = ["postal_code", "permit_exemption_reason", "document_categories"];
  const extraUnit = ["security_deposit", "advance_rent", "bedrooms", "bathrooms", "floor_area_sqm", "furnished_status", "available_from", "minimum_lease_months"];
  const allowedProperty = [...Object.keys(prototype.property), ...extraProperty];
  const allowedUnit = [...Object.keys(prototype.unit), ...extraUnit];
  if (Object.keys(payload).some((key) => !["property", "unit", "amenities", "units"].includes(key)) ||
      Object.keys(payload.property).some((key) => !allowedProperty.includes(key)) ||
      Object.keys(payload.unit).some((key) => !allowedUnit.includes(key))) return unsupported();
  const p = { ...prototype.property, ...payload.property };
  p.permit_number ??= "";
  p.permit_lgu ??= "";
  p.permit_expires_on ??= "";
  const u = { ...prototype.unit, ...payload.unit, tenant_policy: payload.unit.tenant_policy ?? "any" };
  const amenities = payload.amenities ?? [];
  if (!Array.isArray(amenities) || new Set(amenities).size !== amenities.length || amenities.some((item) => typeof item !== "string" || !["wifi", "aircon", "cooking", "laundry", "water_included", "electricity_included", "motorcycle_parking", "car_parking"].includes(item))) return unsupported();
  if (typeof u.monthly_rent === "number" && Number.isFinite(u.monthly_rent)) u.monthly_rent = String(u.monthly_rent);
  if (typeof u.max_occupants === "number" && Number.isFinite(u.max_occupants)) u.max_occupants = String(u.max_occupants);
  if ([p.title, p.description, p.property_type, p.street_address, p.barangay, p.city, p.permit_applicability, p.permit_number, p.permit_lgu, p.permit_expires_on, p.permit_not_required_confirmed, u.rental_type, u.monthly_rent, u.bathroom_type, u.max_occupants, u.tenant_policy].some((item) => typeof item !== "string")) return unsupported();
  if (!["", "apartment", "condominium", "house", "townhouse", "commercial", "boarding_house"].includes(p.property_type) || !["", "entire_place", "private_room", "shared_room", "bedspace"].includes(u.rental_type) || !["", "private", "shared"].includes(u.bathroom_type) || !["", "required", "not_required"].includes(p.permit_applicability) || !["any", "female_only", "male_only", "mixed"].includes(u.tenant_policy)) return unsupported();
  if (p.title.length > 200 || p.description.length > 4000 || p.street_address.length > 1000 || p.barangay.length > 200 || p.city.length > 200 || p.permit_number.length > 100 || p.permit_lgu.length > 200) return unsupported();
  if ((u.monthly_rent !== "" && !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(u.monthly_rent)) || (u.max_occupants !== "" && !/^\d+$/.test(u.max_occupants))) return unsupported();
  if (p.permit_expires_on !== "" && (!/^\d{4}-\d{2}-\d{2}$/.test(p.permit_expires_on) || Number.isNaN(Date.parse(`${p.permit_expires_on}T00:00:00Z`)) || new Date(`${p.permit_expires_on}T00:00:00Z`).toISOString().slice(0, 10) !== p.permit_expires_on)) return unsupported();
  if (!["", "true", "false"].includes(p.permit_not_required_confirmed)) return unsupported();
  const selectExtras = (source: object, keys: string[]) => Object.fromEntries(Object.entries(source).filter(([key]) => keys.includes(key)));
  const propertyExtras = selectExtras(payload.property, extraProperty);
  const unitExtras = selectExtras(payload.unit, extraUnit);
  if ([...Object.values(propertyExtras), ...Object.values(unitExtras)].some((item) => item !== null && typeof item !== "string" && (typeof item !== "number" || !Number.isFinite(item)))) return unsupported();
  if (typeof propertyExtras.permit_exemption_reason === "string" && propertyExtras.permit_exemption_reason.length > 1000) return unsupported();
  if (typeof propertyExtras.document_categories === "string" && propertyExtras.document_categories.length > 1000) return unsupported();
  const preserved = { property: propertyExtras, unit: unitExtras, emptyPermitConfirmation: p.permit_not_required_confirmed === "" };
  const locationParts = [p.location_id, p.location_name, p.location_detail, p.latitude, p.longitude];
  if (!locationParts.every((part) => part === null) && !((p.location_id === null || typeof p.location_id === "string") && (p.location_name === null || typeof p.location_name === "string") && (p.location_detail === null || typeof p.location_detail === "string") && typeof p.latitude === "number" && Number.isFinite(p.latitude) && p.latitude >= -90 && p.latitude <= 90 && typeof p.longitude === "number" && Number.isFinite(p.longitude) && p.longitude >= -180 && p.longitude <= 180)) return unsupported();
  let restoredUnits: UnitDraftItem[] | undefined;
  if ("units" in payload && (payload as { units?: unknown }).units !== undefined) {
    const rawUnits = (payload as { units?: unknown }).units;
    if (!Array.isArray(rawUnits) || rawUnits.length > 50) return unsupported();
    restoredUnits = [];
    for (const raw of rawUnits) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return unsupported();
      const u = raw as Record<string, unknown>;
      const unitNumber = String(u.unit_number ?? u.unitNumber ?? "");
      let monthlyRent = u.monthly_rent ?? u.monthlyRent ?? "";
      if (typeof monthlyRent === "number" && Number.isFinite(monthlyRent)) monthlyRent = String(monthlyRent);
      let maxOccupants = u.max_occupants ?? u.maxOccupants ?? "";
      if (typeof maxOccupants === "number" && Number.isFinite(maxOccupants)) maxOccupants = String(maxOccupants);
      const rentalType = String(u.rental_type ?? u.rentalType ?? "");
      if (unitNumber.length > 50) return unsupported();
      if (typeof monthlyRent !== "string" || (monthlyRent !== "" && !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(monthlyRent))) return unsupported();
      if (typeof maxOccupants !== "string" || (maxOccupants !== "" && !/^\d+$/.test(maxOccupants))) return unsupported();
      if (!["", "entire_place", "private_room", "shared_room", "bedspace"].includes(rentalType)) return unsupported();
      restoredUnits.push({ unitNumber, monthlyRent, maxOccupants, rentalType });
    }
  }
  return {
    title: p.title, description: p.description, propertyType: p.property_type, rentalType: u.rental_type,
    price: u.monthly_rent, address: p.street_address, barangay: p.barangay, city: p.city,
    bathroomType: u.bathroom_type, maxOccupants: u.max_occupants, amenities,
    permitApplicability: p.permit_applicability, permitNumber: p.permit_number, permitLgu: p.permit_lgu,
    permitExpiresOn: p.permit_expires_on, permitNotRequiredConfirmed: p.permit_not_required_confirmed === "true", tenantPolicy: u.tenant_policy,
    ...(Object.keys(propertyExtras).length || Object.keys(unitExtras).length || preserved.emptyPermitConfirmation ? { preserved } : {}),
    ...(restoredUnits ? { units: restoredUnits } : {}),
    location: p.longitude !== null && p.latitude !== null
      ? { id: p.location_id ?? `pin-${p.longitude}-${p.latitude}`, name: p.location_name ?? "Dropped pin", detail: p.location_detail ?? "", coordinates: [p.longitude, p.latitude] }
      : null,
  };
}
