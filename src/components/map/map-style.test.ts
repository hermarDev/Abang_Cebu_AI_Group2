import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const style = JSON.parse(readFileSync(resolve(process.cwd(), "public/styles/osm.json"), "utf8")) as {
  sources: Record<string, { type: string; url?: string; tiles?: string[]; attribution?: string }>;
  layers: Array<{ type: string; source?: string }>;
};

describe("map style", () => {
  it("uses the hosted OpenFreeMap vector style and keeps required map attribution", () => {
    const source = style.sources.openmaptiles;
    expect(source.type).toBe("vector");
    expect(source.url).toBe("https://tiles.openfreemap.org/planet");
    expect(style.sources.ne2_shaded?.type).toBe("raster");
    expect(style.layers.some((layer) => layer.type === "symbol" && layer.source === "openmaptiles")).toBe(true);
    expect(style.layers.some((layer) => layer.type === "line" && layer.source === "openmaptiles")).toBe(true);
    for (const provider of ["OpenFreeMap", "OpenMapTiles", "OpenStreetMap"]) {
      expect(source.attribution).toContain(provider);
    }
  });
});
