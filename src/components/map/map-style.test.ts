import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveMapStyleUrl } from "./MapCanvas";

type MapStyle = {
  version: number;
  sources: Record<string, { type: string; url?: string; tiles?: string[]; attribution?: string }>;
  sprite?: string;
  glyphs?: string;
  layers: Array<{ id: string; type: string; source?: string; "source-layer"?: string; paint?: Record<string, unknown> }>;
};

const readStyle = (path: string) => JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")) as MapStyle;
const lightStyle = readStyle("public/styles/osm.json");
const darkStyle = readStyle("public/styles/osm-dark.json");

describe("map style", () => {
  it("selects the matching built-in style, defaulting to light", () => {
    expect(resolveMapStyleUrl()).toBe("/styles/osm.json");
    expect(resolveMapStyleUrl("light")).toBe("/styles/osm.json");
    expect(resolveMapStyleUrl("dark")).toBe("/styles/osm-dark.json");
    expect(resolveMapStyleUrl("dark", "/styles/osm.json")).toBe("/styles/osm-dark.json");
  });

  it("keeps a configured custom style authoritative for either theme", () => {
    const customStyle = "https://maps.example.test/custom-style.json";
    expect(resolveMapStyleUrl("light", customStyle)).toBe(customStyle);
    expect(resolveMapStyleUrl("dark", customStyle)).toBe(customStyle);
  });

  it("uses a readable charcoal palette for dark map features", () => {
    const paint = (id: string) => darkStyle.layers.find((layer) => layer.id === id)?.paint;
    expect(paint("background")?.["background-color"]).toBe("#202733");
    expect(paint("water")?.["fill-color"]).toBe("#182d3a");
    expect(paint("highway_minor")?.["line-color"]).toBe("#4a5564");
    expect(paint("place_city")?.["text-color"]).toBe("#c5cdd7");
  });

  it("uses a compatible OpenFreeMap dark style with matching sources, sprites, glyphs and attribution", () => {
    expect(darkStyle.version).toBe(lightStyle.version);
    expect(darkStyle.sources.openmaptiles).toMatchObject({
      type: "vector",
      url: lightStyle.sources.openmaptiles.url,
    });
    expect(darkStyle.sources.ne2_shaded).toMatchObject({
      type: "raster",
      tiles: lightStyle.sources.ne2_shaded.tiles,
    });
    expect(darkStyle.sprite).toBe(lightStyle.sprite);
    expect(darkStyle.glyphs).toBe(lightStyle.glyphs);
    expect(darkStyle.layers.some((layer) => layer.type === "symbol" && layer.source === "openmaptiles")).toBe(true);
    expect(darkStyle.layers.some((layer) => layer.type === "line" && layer.source === "openmaptiles")).toBe(true);
    expect(new Set(darkStyle.layers.map((layer) => layer.id)).size).toBe(darkStyle.layers.length);
    for (const source of Object.values(darkStyle.sources)) {
      for (const provider of ["OpenFreeMap", "OpenMapTiles", "OpenStreetMap"]) {
        expect(source.attribution).toContain(provider);
      }
    }
  });
});
