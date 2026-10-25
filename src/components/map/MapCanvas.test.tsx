import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/map/MapCanvas.tsx", "utf8");
const styles = readFileSync("src/components/map/MapCanvas.module.css", "utf8");

describe("MapCanvas controls", () => {
  it("keeps provider attribution available with compact mobile presentation", () => {
    expect(source).toContain("attributionControl: {");
    expect(source).toContain("compact: container.clientWidth <= 640 ? true : undefined");
    expect(source).toContain('https://openfreemap.org');
    expect(source).toContain('https://www.openmaptiles.org/');
    expect(source).toContain('https://www.openstreetmap.org/copyright');
    expect(source).toContain('process.env.NEXT_PUBLIC_MAP_STYLE_URL !== "/styles/osm.json"');
  });
  it("positions map credits away from desktop chat and above the mobile results sheet", () => {
    expect(styles).toContain(".mapRoot :global(.maplibregl-ctrl-bottom-right)");
    expect(styles).toContain("right: 5rem");
    expect(styles).toContain("bottom: min(calc(var(--results-sheet-height, 42dvh) + 1rem), calc(100dvh - 10rem))");
    expect(styles).not.toContain("bottom: calc(max(42dvh, 18rem) + 5.5rem)");
    expect(styles).toContain("left: max(5rem, env(safe-area-inset-left))");
    expect(styles).toContain("bottom: min(calc(var(--results-sheet-height, 42dvh) + 1rem), calc(100dvh - 10rem))");
  });

  it("anchors mobile map controls above the active results-sheet position", () => {
    const controlsRule = [...styles.matchAll(/\.controlledControls\s*\{([^}]*)\}/g)].at(-1)?.[1] ?? "";

    expect(controlsRule).toContain("bottom: min(calc(var(--results-sheet-height, 42dvh) + 1rem), calc(100dvh - 10rem))");
    expect(styles).not.toContain("bottom: calc(max(42dvh, 18rem) + 5.5rem)");
  });

  it("keeps zoom and locate actions in one compact toolbar and removes the Metro Cebu reset button", () => {
    const controls = source.split('aria-label="Map controls"')[1]?.split("</section>")[0];

    expect(controls).toBeDefined();
    expect(controls).toContain('aria-label="Zoom in"');
    expect(controls).toContain('aria-label="Zoom out"');
    expect(controls).toContain('aria-label={');
    expect(controls).toContain('"Locate me"');
    expect(controls).not.toContain("Metro Cebu");
    expect(controls).toContain('onClick={locateMe}');
    expect(controls).toContain(".zoomControls");
    expect(styles).toContain(".mapControls");
    expect(styles).toContain(".zoomControls");
  });

  it("resizes the map on observed container changes and cancels pending work on cleanup", () => {
    expect(source).toContain("new ResizeObserver");
    expect(source).toContain("requestAnimationFrame");
    expect(source).toContain("cancelAnimationFrame(rafId)");
    expect(source).toContain("resizeObserver?.disconnect()");
    expect(source).toContain("map.resize()");
  });

  it("uses a keyboard-accessible chooser instead of a native prompt for overlapping markers", () => {
    expect(source).not.toContain("window.prompt");
    expect(source).toContain("RadixPopover.Content");
    expect(source).toContain("Choose a rental");
    expect(source).toContain("rental.verificationStatus");
  });

  it("offers explicit Search this area after map movement", () => {
    expect(source).toContain('className={styles.searchAreaButton}');
    expect(source).toContain("Search this area");
    expect(source).toContain("publishSearchCenter([center.lng, center.lat])");
  });
});
