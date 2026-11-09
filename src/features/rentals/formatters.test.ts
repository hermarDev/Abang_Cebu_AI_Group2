import { describe, expect, it } from "vitest";
import { formatCurfew, formatOccupancy, formatTenantPolicy, getAmenityIcon } from "./formatters";
import { Wifi, UtensilsCrossed, HelpCircle } from "lucide-react";

describe("formatters", () => {
  it("formats occupancy correctly", () => {
    expect(formatOccupancy(null)).toBe("Occupancy not specified");
    expect(formatOccupancy(0)).toBe("Occupancy not specified");
    expect(formatOccupancy(1)).toBe("1 occupant maximum");
    expect(formatOccupancy(2)).toBe("Up to 2 occupants");
    expect(formatOccupancy(4)).toBe("Up to 4 occupants");
  });

  it("formats tenant policy correctly", () => {
    expect(formatTenantPolicy(null)).toBe("No restriction specified");
    expect(formatTenantPolicy("any")).toBe("All tenants welcome");
    expect(formatTenantPolicy("female_only")).toBe("Female tenants only");
    expect(formatTenantPolicy("male_only")).toBe("Male tenants only");
    expect(formatTenantPolicy("mixed")).toBe("Mixed tenancy allowed");
  });

  it("formats curfew correctly", () => {
    expect(formatCurfew(null)).toBe("No curfew");
    expect(formatCurfew("none")).toBe("No curfew");
    expect(formatCurfew("fixed")).toBe("Fixed curfew hours");
    expect(formatCurfew("conditional")).toBe("Conditional curfew");
  });

  it("resolves amenity icons", () => {
    expect(getAmenityIcon("Wi-Fi")).toBe(Wifi);
    expect(getAmenityIcon("Cooking allowed")).toBe(UtensilsCrossed);
    expect(getAmenityIcon("Unknown perk")).toBe(HelpCircle);
  });
});
