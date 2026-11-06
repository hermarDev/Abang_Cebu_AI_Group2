import { describe, expect, it } from "vitest";
import { createDraftPayload, restoreDraftValues } from "./draft-payload";

describe("property draft payload", () => {
  it("round-trips every non-file form field and selected location", () => {
    const values = {
      title: "House", description: "A room to rent", propertyType: "house", rentalType: "private_room",
      price: "5000", address: "Sample street", barangay: "Sample barangay", city: "Cebu City",
      bathroomType: "shared", maxOccupants: "2", amenities: ["wifi", "aircon"],
      permitApplicability: "required", permitNumber: "P-001", permitLgu: "Cebu City", permitExpiresOn: "2027-01-01", permitNotRequiredConfirmed: false,
      location: { id: "osm-node-1", name: "Sample", detail: "Cebu", coordinates: [123.9, 10.3] as [number, number] },
    };
    expect(restoreDraftValues(createDraftPayload(values))).toEqual(values);
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
  it("does not discard legacy coordinates that lack a selected-place label", () => {
    expect(() => restoreDraftValues({ property: { latitude: 10.3, longitude: 123.9 }, unit: {} })).toThrow("Unsupported property draft");
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
      bathroomType: "", maxOccupants: "", amenities: [], permitApplicability: "", permitNumber: "", permitLgu: "", permitExpiresOn: "", permitNotRequiredConfirmed: false, location: null,
    };
    expect(restoreDraftValues(createDraftPayload(values))).toEqual(values);
  });
});
