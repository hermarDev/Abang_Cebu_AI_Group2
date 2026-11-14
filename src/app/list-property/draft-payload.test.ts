import { describe, expect, it } from "vitest";
import { createDraftPayload, restoreDraftValues, restoredMediaName } from "./draft-payload";

describe("property draft payload", () => {
  it("uses unique digest-based names for media without original names", () => {
    expect(restoredMediaName("a".repeat(64), "image/png", null)).toBe(`${"a".repeat(64)}.png`);
    expect(restoredMediaName("b".repeat(64), "application/pdf", "")).toBe(`${"b".repeat(64)}.pdf`);
    expect(restoredMediaName("a".repeat(64), "image/jpeg", "original.jpg")).toBe("original.jpg");
  });
  it("round-trips every non-file form field and selected location", () => {
    const values = {
      title: "House", description: "A room to rent", propertyType: "house", rentalType: "private_room",
      price: "5000", address: "Sample street", barangay: "Sample barangay", city: "Cebu City",
      bathroomType: "shared", maxOccupants: "2", amenities: ["wifi", "aircon"],
      permitApplicability: "required", permitNumber: "P-001", permitLgu: "Cebu City", permitExpiresOn: "2027-01-01", permitNotRequiredConfirmed: false, tenantPolicy: "any",
      location: { id: "osm-node-1", name: "Sample", detail: "Cebu", coordinates: [123.9, 10.3] as [number, number] },
    };
    expect(restoreDraftValues(createDraftPayload(values))).toEqual(values);
  });
  it("retains supported fields the editor does not expose when a draft is saved again", () => {
    const payload = { property: { title: "Saved", postal_code: "6000", permit_not_required_confirmed: "" }, unit: { security_deposit: 1000, bedrooms: 2, furnished_status: "furnished" } };
    const restored = restoreDraftValues(payload);
    const saved = createDraftPayload(restored);
    expect(saved.property).toMatchObject({ postal_code: "6000", permit_not_required_confirmed: "" });
    expect(saved.unit).toMatchObject({ security_deposit: 1000, bedrooms: 2, furnished_status: "furnished" });
  });
  it("rejects malformed stored data instead of silently replacing it", () => {
    expect(() => restoreDraftValues({ property: { title: "Saved" }, unit: {}, amenities: ["unknown"] })).toThrow("Unsupported property draft");
    expect(() => restoreDraftValues({ property: { title: "Saved", unexpected: "important" }, unit: {}, amenities: [] })).toThrow("Unsupported property draft");
  });
  it("restores incomplete legacy drafts without inventing a selected location", () => {
    const restored = restoreDraftValues({ property: { title: "Old draft" }, unit: { monthly_rent: 5000 } });
    expect(restored.title).toBe("Old draft");
    expect(restored.price).toBe("5000");
    expect(restored.location).toBeNull();
  });
  it("round-trips tenant policy and defaults legacy drafts to anyone", () => {
    const values = { title: "", description: "", propertyType: "", rentalType: "", price: "", address: "", barangay: "", city: "", bathroomType: "", maxOccupants: "", amenities: [], permitApplicability: "", permitNotRequiredConfirmed: false, location: null, tenantPolicy: "female_only" };
    const payload = createDraftPayload(values);
    expect(payload.unit).toMatchObject({ tenant_policy: "female_only" });
    expect(restoreDraftValues(payload).tenantPolicy).toBe("female_only");
    expect(restoreDraftValues({ property: {}, unit: {} }).tenantPolicy).toBe("any");
    expect(() => restoreDraftValues({ property: {}, unit: { tenant_policy: "invalid" } })).toThrow("Unsupported property draft");
  });
  it("defaults omitted legacy permit inputs when creating new payloads", () => {
    const values = { title: "", description: "", propertyType: "", rentalType: "", price: "", address: "", barangay: "", city: "", bathroomType: "", maxOccupants: "", amenities: [], permitApplicability: "", permitNotRequiredConfirmed: false, tenantPolicy: "any", location: null };
    const payload = createDraftPayload(values);
    expect(payload.property).toMatchObject({ permit_number: "", permit_lgu: "", permit_expires_on: "" });
    expect(() => restoreDraftValues(JSON.parse(JSON.stringify(payload)))).not.toThrow();
  });
  it("accepts null or missing legacy permit text fields", () => {
    const restored = restoreDraftValues({ property: { permit_number: null, permit_lgu: null, permit_expires_on: null }, unit: {} });
    expect(restored).toMatchObject({ permitNumber: "", permitLgu: "", permitExpiresOn: "" });
    expect(createDraftPayload(restored).property).toMatchObject({ permit_number: "", permit_lgu: "", permit_expires_on: "" });
  });
  it("restores and retains legacy coordinates without place metadata", () => {
    const restored = restoreDraftValues({ property: { latitude: 10.3, longitude: 123.9, permit_number: "P-123", permit_lgu: "Cebu", permit_expires_on: "2027-01-01" }, unit: {} });
    expect(restored.location?.coordinates).toEqual([123.9, 10.3]);
    expect(createDraftPayload(restored).property).toMatchObject({ latitude: 10.3, longitude: 123.9, permit_number: "P-123", permit_lgu: "Cebu", permit_expires_on: "2027-01-01" });
  });
  it("rejects unsupported option values and duplicated amenities", () => {
    const draft = createDraftPayload({ title: "", description: "", propertyType: "house", rentalType: "private_room", price: "", address: "", barangay: "", city: "", bathroomType: "", maxOccupants: "", amenities: [], permitApplicability: "", permitNumber: "", permitLgu: "", permitExpiresOn: "", permitNotRequiredConfirmed: false, location: null });
    expect(() => restoreDraftValues({ ...draft, property: { ...draft.property, property_type: "castle" } })).toThrow("Unsupported property draft");
    expect(() => restoreDraftValues({ ...draft, amenities: ["wifi", "wifi"] })).toThrow("Unsupported property draft");
  });
  it("rejects values the editor cannot safely represent", () => {
    const draft = createDraftPayload({ title: "", description: "", propertyType: "house", rentalType: "private_room", price: "", address: "", barangay: "", city: "", bathroomType: "", maxOccupants: "", amenities: [], permitApplicability: "", permitNumber: "", permitLgu: "", permitExpiresOn: "", permitNotRequiredConfirmed: false, location: null });
    expect(() => restoreDraftValues({ ...draft, unit: { ...draft.unit, monthly_rent: "invalid" } })).toThrow("Unsupported property draft");
    expect(() => restoreDraftValues({ ...draft, property: { ...draft.property, title: "x".repeat(201) } })).toThrow("Unsupported property draft");
    expect(() => restoreDraftValues({ ...draft, property: { ...draft.property, permit_expires_on: "2027-02-30" } })).toThrow("Unsupported property draft");
  });
  it("round-trips an incomplete draft without fabricating a location or declaration", () => {
    const values = {
      title: "", description: "", propertyType: "", rentalType: "", price: "", address: "", barangay: "", city: "",
      bathroomType: "", maxOccupants: "", amenities: [], permitApplicability: "", permitNumber: "", permitLgu: "", permitExpiresOn: "", permitNotRequiredConfirmed: false, tenantPolicy: "any", location: null,
    };
    expect(restoreDraftValues(createDraftPayload(values))).toEqual(values);
  });
  it("round-trips conditional unit specs, permit exemption reason, and document categories via preserved", () => {
    const values = {
      title: "Condo", description: "Studio unit with balcony", propertyType: "condominium", rentalType: "entire_place",
      price: "15000", address: "IT Park", barangay: "Apas", city: "Cebu City",
      bathroomType: "private", maxOccupants: "2", amenities: ["wifi", "aircon"],
      permitApplicability: "not_required", permitNumber: "", permitLgu: "", permitExpiresOn: "", permitNotRequiredConfirmed: true, tenantPolicy: "any", location: null,
      preserved: {
        property: {
          permit_exemption_reason: "Individual residential condo owner leasing unit.",
          document_categories: JSON.stringify({ "deed.pdf": "ownership_title" }),
        },
        unit: {
          bedrooms: 0,
          bathrooms: 1,
          floor_area_sqm: 32,
          furnished_status: "furnished",
        },
        emptyPermitConfirmation: false,
      },
    };
    const payload = createDraftPayload(values);
    expect(payload.property).toMatchObject({
      permit_exemption_reason: "Individual residential condo owner leasing unit.",
      document_categories: JSON.stringify({ "deed.pdf": "ownership_title" }),
    });
    expect(payload.unit).toMatchObject({
      bedrooms: 0,
      bathrooms: 1,
      floor_area_sqm: 32,
      furnished_status: "furnished",
    });
    const restored = restoreDraftValues(payload);
    expect(restored).toEqual(values);
  });
  it("stores and round-trips multi-unit boarding house units in draft payload", () => {
    const values = {
      title: "Apas Boarding House", description: "Rooms near IT park", propertyType: "boarding_house", rentalType: "private_room",
      price: "4500", address: "123 Apas", barangay: "Apas", city: "Cebu City",
      bathroomType: "shared", maxOccupants: "1", amenities: ["wifi"],
      permitApplicability: "required", permitNumber: "BP-001", permitLgu: "Cebu City", permitExpiresOn: "2027-12-31", permitNotRequiredConfirmed: false, tenantPolicy: "any", location: null,
      units: [
        { unitNumber: "Room 1", monthlyRent: "4500", maxOccupants: "1", rentalType: "private_room" },
        { unitNumber: "Room 2", monthlyRent: "5000", maxOccupants: "2", rentalType: "private_room" },
      ],
    };
    const payload = createDraftPayload(values);
    expect(payload.units).toEqual([
      { unit_number: "Room 1", monthly_rent: "4500", max_occupants: "1", rental_type: "private_room" },
      { unit_number: "Room 2", monthly_rent: "5000", max_occupants: "2", rental_type: "private_room" },
    ]);
    const restored = restoreDraftValues(payload);
    expect(restored.units).toEqual(values.units);
  });
});
