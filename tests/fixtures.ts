import { test as base, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const providerAttribution = JSON.parse(readFileSync("public/styles/osm.json", "utf8")).sources.openmaptiles.attribution as string;

export const test = base.extend({
  context: async ({ context, baseURL }, provide) => {
    const origin = new URL(baseURL!).origin;
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== origin || !["GET", "HEAD"].includes(request.method())) {
        return route.abort("blockedbyclient");
      }
      if (url.pathname === "/api/places") {
        return route.fulfill({ json: { places: [] } });
      }
      if (url.pathname === "/api/rentals") {
        return route.fulfill({ json: { rentals: [] } });
      }
      if (url.pathname === "/styles/osm.json") {
        // shortcut: fixture tests controls, not provider tiles; verify geography separately.
        return route.fulfill({ json: {
          version: 8,
          sources: { fixture: { type: "geojson", data: { type: "FeatureCollection", features: [] }, attribution: providerAttribution } },
          layers: [{ id: "background", type: "background", paint: { "background-color": "#e5edf0" } }, { id: "fixture", type: "circle", source: "fixture" }],
        } });
      }
      return route.continue();
    });
    await provide(context);
  },
});

export { expect };
