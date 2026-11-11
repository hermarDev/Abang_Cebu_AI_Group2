import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/map/MapCanvas.tsx", "utf8");
const styles = readFileSync("src/components/map/MapCanvas.module.css", "utf8");

describe("MapCanvas controls", () => {
  it("keeps provider attribution toggleable on every screen size", () => {
    expect(source).toContain("if (showAttribution)");
    expect(source).toContain("new AttributionControl({");
    expect(source).toContain("compact: true");
    expect(source).toContain('}), "bottom-left"');
    expect(source).toContain('https://openfreemap.org');
    expect(source).toContain('https://www.openmaptiles.org/');
    expect(source).toContain('https://www.openstreetmap.org/copyright');
    expect(source).toContain('process.env.NEXT_PUBLIC_MAP_STYLE_URL !== "/styles/osm.json"');
  });
  it("positions map credits away from desktop chat and above the mobile results sheet", () => {
    expect(styles).toContain(".mapRoot :global(.maplibregl-ctrl-bottom-left)");
    expect(styles).toContain("left: auto");
    expect(styles).toContain("justify-content: flex-end");
    expect(styles).toContain("bottom: calc(min(calc(var(--results-sheet-height, 42dvh) + 1rem), calc(100dvh - 10rem)) + 10.375rem)");
    expect(styles).not.toContain("bottom: calc(max(42dvh, 18rem) + 5.5rem)");
    expect(styles).toContain("margin: 0 0 0.625rem");
    expect(styles).toContain("+ 0.625rem)");
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

  it("renders a structured React portal popup with gallery fallback, View details, and Save/Saved actions", () => {
    expect(source).toContain("createPortal");
    expect(source).toContain("No photo available");
    expect(source).toContain("photoCount > 1 &&");
    expect(source).toContain('aria-label="Previous photo"');
    expect(source).toContain('aria-label="Next photo"');
    expect(source).toContain("<span>View details</span>");
    expect(source).toContain('<span>{isSaved ? "Saved" : "Save"}</span>');
    expect(source).toContain("closeButton: false");
    expect(styles).toContain(".rentalPopupMetaRow");
    expect(styles).toContain(".rentalPopupCategory");
    expect(styles).toContain(".rentalPopupPhotoCount");
    expect(styles).toContain(".rentalPopupTitle");
    expect(styles).toContain(".rentalPopupLocation");
    expect(styles).toContain(".rentalPopupPriceRow");
  });

  it("adds a role-gated Message landlord popup action that closes the popup before opening the inquiry", () => {
    expect(source).toContain("canMessageLandlord = false, onMessageLandlord");
    expect(source).toContain("{canMessageLandlord && (");
    expect(source).toContain("<span>Message landlord</span>");
    expect(source).toContain("closeRentalPopup(); onMessageLandlord?.(activePopupRental.id);");
    expect(source).toContain("aria-label={`Message landlord about ${activePopupRental.title}`}");
  });

  it("keeps property location picker mode free of rental search overlays even when location is locked", () => {
    expect(source).toContain("const isLocationPicker = Boolean(locationPicker || enablePinDrop || pinCoordinates !== undefined || onPinChange !== undefined);");
    expect(source).toContain("const externallyControlled = externalFilters !== undefined || isLocationPicker;");
    expect(source).toContain("!isLocationPicker && popupPortalTarget");
    expect(source).toContain("!isLocationPicker && (assistantControlsTarget");
    expect(source).toContain("setDraggable(Boolean(enablePinDrop))");
  });
});
