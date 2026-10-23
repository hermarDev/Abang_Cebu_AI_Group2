import { describe, expect, it } from "vitest";
import { formatPlacePopupHtml } from "./places";

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
