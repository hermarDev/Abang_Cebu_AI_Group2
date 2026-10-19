import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEARCH_FILTERS,
  parseSearchFilters,
  serializeSearchFilters,
  type SearchFilters,
} from "@/lib/search-filters";

describe("search filter URL state", () => {
  it("parses the supported filters and accepts comma-separated or repeated values", () => {
    expect(
      parseSearchFilters(
        "?type=bedspace,condo&type=bedspace&min_rent=1500&max_rent=5000&gender=female_only&amenities=wifi,aircon&keep=1",
      ),
    ).toEqual({
      type: ["bedspace", "condo"],
      minRent: 1500,
      maxRent: 5000,
      gender: "female_only",
      amenities: ["aircon", "wifi"],
    });
  });

  it("ignores unsupported or malformed values and drops an inverted rent range", () => {
    expect(
      parseSearchFilters("?type=spaceship&min_rent=nope&max_rent=-5&gender=invalid&amenities=wifi,malware"),
    ).toEqual({ type: [], amenities: ["wifi"] });
    expect(parseSearchFilters("?min_rent=9000&max_rent=3000")).toEqual(DEFAULT_SEARCH_FILTERS);
  });

  it("serializes canonically, preserves unrelated query params, and round-trips", () => {
    const filters: SearchFilters = {
      type: ["condo", "bedspace", "bedspace"],
      minRent: 1500,
      maxRent: 5000,
      gender: "female_only",
      amenities: ["wifi", "aircon", "wifi"],
    };
    const query = serializeSearchFilters(filters, new URLSearchParams("landmark=usc&other=keep"));

    expect(query.toString()).toBe(
      "landmark=usc&other=keep&type=bedspace%2Ccondo&min_rent=1500&max_rent=5000&gender=female_only&amenities=aircon%2Cwifi",
    );
    expect(parseSearchFilters(query)).toEqual({
      type: ["bedspace", "condo"],
      minRent: 1500,
      maxRent: 5000,
      gender: "female_only",
      amenities: ["aircon", "wifi"],
    });
  });

  it("removes only filter keys when filters are cleared", () => {
    expect(serializeSearchFilters(DEFAULT_SEARCH_FILTERS, new URLSearchParams("type=condo&landmark=it-park")).toString())
      .toBe("landmark=it-park");
  });
});
