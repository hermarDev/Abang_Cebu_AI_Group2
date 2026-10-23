import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/map/MapCanvas.tsx", "utf8");
const styles = readFileSync("src/components/map/MapCanvas.module.css", "utf8");

describe("MapCanvas controls", () => {
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
    expect(styles).toContain("controlledControls");
  });
});
