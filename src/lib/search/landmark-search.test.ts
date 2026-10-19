import { describe, expect, it } from "vitest";
import { getCurrentSuggestions, getLandmarkSuggestions } from "./landmark-search";

describe("landmark search", () => {
  it("USC suggestions are deterministic and resolve to the documented campus", () => {
  const first = getLandmarkSuggestions("USC");
  const second = getLandmarkSuggestions("usc");

  expect(first).toEqual(second);
  expect(first.map(({ id, name }) => ({ id, name }))).toEqual([
    { id: "usc-tc", name: "USC - Talamban Campus" },
  ]);
  expect(first[0].coordinates).toEqual([123.9114, 10.3541]);
  });

  it("does not show suggestions while the query is changing", () => {
    expect(getCurrentSuggestions("USC", "USC")).toEqual(getLandmarkSuggestions("USC"));
    expect(getCurrentSuggestions("USC-T", "USC")).toEqual([]);
    expect(getCurrentSuggestions("USC ", "USC")).toEqual([]);
  });

  it("resolves USC aliases and respects the suggestion limit", () => {
    expect(getLandmarkSuggestions("University of San Carlos").map(({ id }) => id)).toEqual(["usc-tc"]);
    expect(getLandmarkSuggestions("USC TC").map(({ id }) => id)).toEqual(["usc-tc"]);
    expect(getLandmarkSuggestions("Cebu", 2)).toHaveLength(2);
  });

  it("returns no suggestions for empty or unrelated queries", () => {
    expect(getLandmarkSuggestions("  ")).toEqual([]);
    expect(getLandmarkSuggestions("Auckland")).toEqual([]);
  });
});
