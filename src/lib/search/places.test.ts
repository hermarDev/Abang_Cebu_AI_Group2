import { describe, expect, it } from "vitest";
import { formatPlacePopupHtml, parsePhotonPlaces, parsePlacesResponse } from "./places";

it("accepts northern, southern and island Cebu places through both parsers", () => {
  const coordinates = [[124.01, 11.25], [123.33, 9.45], [124.4, 10.65], [123.9, 10.3]];
  for (const point of coordinates) {
    const places = parsePhotonPlaces({ features: [{ geometry: { type: "Point", coordinates: point }, properties: { osm_id: 1, osm_type: "N", name: "Cebu location", countrycode: "ph" } }] });
    expect(places).toHaveLength(1);
    expect(parsePlacesResponse({ places })).toEqual(places);
  }
  expect(parsePhotonPlaces({ features: [{ geometry: { type: "Point", coordinates: [120.98, 14.6] }, properties: { osm_id: 2, osm_type: "N", name: "Manila", countrycode: "ph" } }] })).toEqual([]);
});

describe("formatPlacePopupHtml", () => {
  it("escapes untrusted place names and details before rendering popup markup", () => {
    expect(formatPlacePopupHtml({
      id: "osm-node-7",
      name: '<img src=x onerror="alert(1)">',
      detail: "<script>alert(2)</script>",
      coordinates: [123.9, 10.3],
    })).toBe(
      "<strong>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</strong><br><span>&lt;script&gt;alert(2)&lt;/script&gt;</span>",
    );
  });

  it("omits an empty detail row", () => {
    expect(formatPlacePopupHtml({
      id: "osm-node-8",
      name: "Cebu IT Park",
      detail: "",
      coordinates: [123.9, 10.3],
    })).toBe("<strong>Cebu IT Park</strong>");
  });
});
