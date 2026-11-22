import { describe, expect, it } from "vitest";
import { parseAssistantSearch, selectAssistantRentals } from "./assistant-search";
import type { RentalResult } from "@/contracts/preview";

const rental = (overrides: Partial<RentalResult>): RentalResult => ({ id: "a", title: "Home", locality: "Mandaue", coordinates: [0, 0], price: 8000, type: "room", basis: "room", amenities: [], description: "", area: 0, tone: "sage", available: true, distanceMeters: null, verificationStatus: "property_verified", ...overrides });


describe("selectAssistantRentals", () => {
  it("selects eligible units and labels only higher prices as alternatives", () => {
    const units = [8000, 12000, 7000].map((monthlyRent, i) => ({ id: `u${i}`, unitNumber: `${i}`, rentalType: "private_room", monthlyRent, maxOccupants: 1, isAvailable: i !== 2 }));
    const criteria = { kind: "search" as const, minPrice: null, maxPrice: 10000, area: "mandaue", propertyType: "room", verifiedOnly: true };
    const result = selectAssistantRentals([rental({ units }), rental({ id: "exact", price: 10000 }), rental({ id: "above", price: 10001 }), rental({ id: "unverified", price: 9000, verificationStatus: "unverified" })], criteria);
    expect(result.matches).toEqual([expect.objectContaining({ id: "a", unitId: "u0", monthlyPricePHP: 8000, overBudgetPHP: 0 }), expect.objectContaining({ id: "exact", unitId: null, monthlyPricePHP: 10000, overBudgetPHP: 0 })]);
    expect(result.alternatives).toEqual([expect.objectContaining({ id: "above", unitId: null, monthlyPricePHP: 10001, overBudgetPHP: 1 }), expect.objectContaining({ id: "a", unitId: "u1", monthlyPricePHP: 12000, overBudgetPHP: 2000 })]);
  });
  it("returns no alternatives when budget is absent, excludes identity-only/null verified-only, and never falls back on empty units", () => {
    const emptyUnits = rental({ id: "empty", price: 5000, units: [] });
    const identityOnly = rental({ id: "id-only", price: 9000, verificationStatus: "identity_verified" });
    const nullStatus = rental({ id: "null-v", price: 9000, verificationStatus: null });
    const noBudget = selectAssistantRentals([emptyUnits, identityOnly, nullStatus, rental({ id: "ok", price: 9000 })], { kind: "search", minPrice: null, maxPrice: null, area: null, propertyType: null, verifiedOnly: true });
    expect(noBudget.matches.map((item) => item.id)).toEqual(["ok"]);
    expect(noBudget.alternatives).toEqual([]);
  });
  it("maps legacy private_room and shared_room properties when searching for rooms", () => {
    const result = selectAssistantRentals([
      rental({ id: "priv", type: "private_room", propertyType: "private_room", price: 8500 }),
      rental({ id: "shared", type: "shared_room", propertyType: "shared_room", price: 6500 }),
      rental({ id: "studio", type: "studio", propertyType: "studio", price: 7500 }),
    ], { kind: "search", minPrice: null, maxPrice: 10000, area: null, propertyType: "room", verifiedOnly: false });
    expect(result.matches.map((item) => item.id)).toEqual(["shared", "priv"]);
  });
  it("matches area against address as well as locality", () => {
    const result = selectAssistantRentals([
      rental({ id: "itp", locality: "Cebu City", address: "IT Park, Apas", price: 9500 }),
    ], { kind: "search", minPrice: null, maxPrice: 10000, area: "it park", propertyType: null, verifiedOnly: false });
    expect(result.matches.map((item) => item.id)).toEqual(["itp"]);
  });
  it("skips rentals with availableUnitsCount <= 0 even when units array is omitted", () => {
    const result = selectAssistantRentals([
      rental({ id: "zero", price: 8000, availableUnitsCount: 0, units: undefined }),
      rental({ id: "neg", price: 8000, availableUnitsCount: -1, units: undefined }),
      rental({ id: "null-count", price: 8000, availableUnitsCount: null, units: undefined }),
      rental({ id: "one", price: 8500, availableUnitsCount: 1, units: undefined }),
    ], { kind: "search", minPrice: null, maxPrice: 10000, area: null, propertyType: null, verifiedOnly: false });
    expect(result.matches.map((item) => item.id)).toEqual(["null-count", "one"]);
  });

  it("enforces range bounds inclusively and keeps alternatives respecting minimum price", () => {
    const result = selectAssistantRentals([rental({ id: "low", price: 4999 }), rental({ id: "min", price: 5000 }), rental({ id: "max", price: 10000 }), rental({ id: "over", price: 10001 })], { kind: "search", minPrice: 5000, maxPrice: 10000, area: null, propertyType: null, verifiedOnly: false });
    expect(result.matches.map((item) => item.id)).toEqual(["min", "max"]);
    expect(result.alternatives.map((item) => [item.id, item.overBudgetPHP])).toEqual([["over", 1]]);
  });

  it("caps over-budget alternatives to max(5000, 50% of maxPrice), sorted lowest first, max 3", () => {
    const lowBudget = selectAssistantRentals(
      [rental({ id: "within", price: 11000 }), rental({ id: "too-far", price: 11001 })],
      { kind: "search", minPrice: null, maxPrice: 6000, area: null, propertyType: null, verifiedOnly: false },
    );
    expect(lowBudget.alternatives.map((item) => [item.id, item.overBudgetPHP])).toEqual([["within", 5000]]);

    const highBudget = selectAssistantRentals(
      [
        rental({ id: "d", price: 30000 }),
        rental({ id: "a", price: 21000 }),
        rental({ id: "b", price: 25000 }),
        rental({ id: "c", price: 29000 }),
        rental({ id: "too-far", price: 30001 }),
      ],
      { kind: "search", minPrice: null, maxPrice: 20000, area: null, propertyType: null, verifiedOnly: false },
    );
    expect(highBudget.alternatives.map((item) => [item.id, item.overBudgetPHP])).toEqual([
      ["a", 1000],
      ["b", 5000],
      ["c", 9000],
    ]);
  });
});

describe("parseAssistantSearch", () => {
  it.each([
    ["list a property under 10k", 10000],
    ["list rooms under 10k", 10000],
    ["naa moy kwarto ubos 10k", 10000],
    ["naa moy kwarto ubos sa 10k", 10000],
    ["naa moy kwarto ubos ug 10k", 10000],
    ["show rooms below 10k", 10000],
  ])("detects %s", (message, maxPrice) => {
    expect(parseAssistantSearch([message])).toMatchObject({ kind: "search", maxPrice });
  });
  it.each([
    ["find a room in Mandaue City under 10k", "mandaue"],
    ["find a room in Lapu-Lapu City under 10k", "lapu-lapu"],
    ["find a room in Talisay City under 10k", "talisay"],
  ])("normalizes city area alias: %s", (message, area) => {
    expect(parseAssistantSearch([message])).toMatchObject({ kind: "search", area, maxPrice: 10000 });
  });
  it("uses the latest explicit budget and preserves area", () => {
    expect(parseAssistantSearch(["find a room in Mandaue under 10k", "increase my budget to 15000"]))
      .toMatchObject({ kind: "search", maxPrice: 15000, area: "mandaue" });
    expect(parseAssistantSearch(["find a room in Mandaue under 10k", "make it 15000"]))
      .toMatchObject({ kind: "search", maxPrice: 15000, area: "mandaue" });
  });
  it("clarifies unsupported amenity or occupant constraints instead of silently ignoring them", () => {
    expect(parseAssistantSearch(["find a pet-friendly room under 10k"]).kind).toBe("clarify");
    expect(parseAssistantSearch(["find a room under 10k with pool"]).kind).toBe("clarify");
    expect(parseAssistantSearch(["find a room for 2 persons under 10k"]).kind).toBe("clarify");
  });
  it("understands a range", () => {
    expect(parseAssistantSearch(["show a room ₱5,000 to ₱10,000"]))
      .toMatchObject({ kind: "search", minPrice: 5000, maxPrice: 10000 });
  });
  it("retains a budget when changing location", () => {
    expect(parseAssistantSearch(["find a room in Mandaue under 10,000", "in Cebu City"]))
      .toMatchObject({ kind: "search", area: "cebu city", maxPrice: 10000 });
  });
  it("does not invent type or budget and respects verification", () => {
    expect(parseAssistantSearch(["show verified properties"])).toMatchObject({ kind: "search", propertyType: null, maxPrice: null, verifiedOnly: true });
  });
  it.each(["show a room ₱10,000 to ₱5,000", "find a room in Atlantis", "find a room under banana", "find a villa under 10k"])("clarifies unsupported or invalid criteria: %s", (message) => {
    expect(parseAssistantSearch([message]).kind).toBe("clarify");
  });
  it("does not trigger inventory lookup for unrelated conversation", () => {
    expect(parseAssistantSearch(["hello"])).toEqual({ kind: "not-needed" });
  });
  it.each([
    [["list rooms under 10k", "how do I contact the landlord?"]],
    [["list rooms under 10k", "thank you!"]],
    [["list rooms under 10k", "can you help with payment?"]],
  ])("exits sticky search when latest turn is general conversation: %j", (messages) => {
    expect(parseAssistantSearch(messages)).toEqual({ kind: "not-needed" });
  });
  it("resolves earlier clarifications and accepts bare budget follow-ups while searching", () => {
    expect(parseAssistantSearch(["find a room in Atlantis under 10k", "in Lahug"]))
      .toMatchObject({ kind: "search", area: "lahug", maxPrice: 10000, propertyType: "room" });
    expect(parseAssistantSearch(["find a room under banana", "10k"]))
      .toMatchObject({ kind: "search", minPrice: null, maxPrice: 10000, propertyType: "room" });
    expect(parseAssistantSearch(["find a room in Lahug", "10k"]))
      .toMatchObject({ kind: "search", minPrice: null, maxPrice: 10000, area: "lahug", propertyType: "room" });
  });
  it("does not false-clarify harmless 'with ...' phrasing", () => {
    expect(parseAssistantSearch(["find rooms in Mandaue with my friend"]))
      .toMatchObject({ kind: "search", area: "mandaue", propertyType: "room", maxPrice: null });
  });
  it.each(["no budget limit", "remove budget", "clear budget", "any price", "any budget"])("resets budget on %s without triggering budget clarify", (resetPhrase) => {
    expect(parseAssistantSearch(["show rooms in Mandaue ₱5,000 to ₱10,000", resetPhrase]))
      .toMatchObject({ kind: "search", minPrice: null, maxPrice: null, area: "mandaue", propertyType: "room" });
  });
  it.each(["anywhere in Cebu", "any area", "all areas"])("resets area on %s while preserving budget", (resetPhrase) => {
    expect(parseAssistantSearch(["find a room in Mandaue under 10k", resetPhrase]))
      .toMatchObject({ kind: "search", minPrice: null, maxPrice: 10000, area: null, propertyType: "room" });
  });
});
