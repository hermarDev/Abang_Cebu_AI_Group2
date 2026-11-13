import { describe, expect, it } from "vitest";
import { formatListingAddress, formatPropertyType } from "./property-display";

describe("formatPropertyType", () => {
  it("maps canonical property taxonomy to user-facing labels", () => {
    expect(formatPropertyType("bedspace")).toBe("Bedspace");
    expect(formatPropertyType("boarding_house")).toBe("Boarding House");
    expect(formatPropertyType("private_room")).toBe("Private Room");
    expect(formatPropertyType("shared_room")).toBe("Shared Room");
    expect(formatPropertyType("studio")).toBe("Studio");
    expect(formatPropertyType("apartment")).toBe("Apartment");
    expect(formatPropertyType("condo")).toBe("Condominium");
    expect(formatPropertyType("condominium")).toBe("Condominium");
    expect(formatPropertyType("house")).toBe("House");
    expect(formatPropertyType("townhouse")).toBe("House");
  });

  it("handles case insensitivity, spaces and underscores in known types", () => {
    expect(formatPropertyType("  STUDIO  ")).toBe("Studio");
    expect(formatPropertyType("Boarding_House")).toBe("Boarding House");
    expect(formatPropertyType("CONDO")).toBe("Condominium");
  });

  it("converts unknown snake_case types to Title Case", () => {
    expect(formatPropertyType("commercial_space")).toBe("Commercial Space");
    expect(formatPropertyType("single_family_home")).toBe("Single Family Home");
    expect(formatPropertyType("penthouse")).toBe("Penthouse");
  });

  it("falls back to 'Property' for null, undefined, empty, or whitespace", () => {
    expect(formatPropertyType(null)).toBe("Property");
    expect(formatPropertyType(undefined)).toBe("Property");
    expect(formatPropertyType("")).toBe("Property");
    expect(formatPropertyType("   ")).toBe("Property");
  });
});

describe("formatListingAddress", () => {
  it("normalizes trailing duplicate city suffix when city is provided", () => {
    expect(formatListingAddress("Salinas Drive, Apas, Cebu City", "Cebu City")).toBe("Salinas Drive, Apas, Cebu City");
    expect(formatListingAddress("Cebu City", "Cebu City")).toBe("Cebu City");
    expect(formatListingAddress("Salinas Drive, Apas", "Cebu City")).toBe("Salinas Drive, Apas, Cebu City");
    expect(formatListingAddress("12 Colon St", "Cebu City")).toBe("12 Colon St, Cebu City");
  });

  it("does not strip valid street/barangay tokens when city name appears earlier in string", () => {
    expect(formatListingAddress("Cebu City Road, Apas", "Cebu City")).toBe("Cebu City Road, Apas, Cebu City");
    expect(formatListingAddress("Mandaue City Highway, Subangdaku", "Mandaue City")).toBe("Mandaue City Highway, Subangdaku, Mandaue City");
  });

  it("preserves city fallback if street is empty or null", () => {
    expect(formatListingAddress("", "Cebu City")).toBe("Cebu City");
    expect(formatListingAddress(null, "Cebu City")).toBe("Cebu City");
  });

  it("preserves street if city is empty or null", () => {
    expect(formatListingAddress("12 Colon St", "")).toBe("12 Colon St");
    expect(formatListingAddress("12 Colon St", null)).toBe("12 Colon St");
  });

  it("returns empty string when both street and city are empty or null", () => {
    expect(formatListingAddress(null, null)).toBe("");
    expect(formatListingAddress("", "")).toBe("");
  });
});
