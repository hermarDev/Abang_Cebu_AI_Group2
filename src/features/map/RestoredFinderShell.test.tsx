import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RestoredFinderShell } from "./RestoredFinderShell";
import type { RentalResult } from "@/contracts/preview";
import { DEFAULT_RENTAL_FILTERS, type RentalFilters } from "@/contracts/rental-filters";

const hooks = vi.hoisted(() => ({ changeFilters: undefined as ((filters: RentalFilters) => void) | undefined, changeCenter: undefined as ((center: [number, number]) => void) | undefined, mapRentals: [] as RentalResult[], slots: [] as unknown[], index: 0, effect: undefined as (() => void | (() => void)) | undefined }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return [hooks.slots[index], (value: unknown) => { hooks.slots[index] = typeof value === "function" ? value(hooks.slots[index]) : value; }];
  },
  useEffect: (effect: () => void | (() => void)) => { hooks.effect ??= effect; },
}));
vi.mock("@/components/map/MapCanvasLoader", () => ({ default: ({ rentals = [], onFiltersChange, onSearchCenterChange }: { rentals?: RentalResult[]; onFiltersChange: (filters: RentalFilters) => void; onSearchCenterChange: (center: [number, number]) => void }) => {
  hooks.changeFilters = onFiltersChange;
  hooks.mapRentals = rentals;
  hooks.changeCenter = onSearchCenterChange;
  return <div data-map-rentals={rentals.map(({ id }) => id).join(",")} />;
} }));

function render(rentalStatus?: "loading" | "error" | "ready") {
  hooks.index = 0;
  hooks.mapRentals = [];
  return renderToStaticMarkup(<RestoredFinderShell rentalStatus={rentalStatus} />);
}

const rental: RentalResult = { id: "live-1", title: "Endpoint rental", locality: "Lahug, Cebu City", coordinates: [123.89, 10.32], price: 4200, type: "studio", propertyType: "studio", basis: "room", amenities: ["Wi-Fi"], description: "Description from the endpoint.", area: 0, tone: "blue", available: true, distanceMeters: null };

async function load(response: { ok: boolean; json: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  const html = render();
  const cleanup = hooks.effect?.();
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { html, fetchMock, cleanup };
}

afterEach(() => { hooks.slots = []; hooks.index = 0; hooks.effect = undefined; vi.unstubAllGlobals(); });

describe("RestoredFinderShell", () => {
  it("loads endpoint rentals, renders their real details and passes inventory to the map", async () => {
    const { html, fetchMock, cleanup } = await load({ ok: true, json: async () => ({ rentals: [rental] }) });
    expect(html).toContain("Loading rentals…");
    expect(fetchMock).toHaveBeenCalledWith("/api/rentals", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    const ready = render();
    for (const detail of [rental.title, rental.locality, "Studio", "4,200", "Wi-Fi", rental.description, "No photos provided", "1 listing found"]) expect(ready).toContain(detail);
    expect(ready).toContain('data-map-rentals="live-1"');
    expect(ready).not.toContain("No verified rentals found");
    cleanup?.();
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it("recalculates sidebar distances when map center changes", async () => {
    const near: RentalResult = { ...rental, id: "near", title: "Near center", coordinates: [123.9, 10.34] };
    const far: RentalResult = { ...rental, id: "far", title: "Far from center", coordinates: [123.93, 10.34] };
    await load({ ok: true, json: async () => ({ rentals: [near, far] }) });
    const center = hooks.changeCenter;
    expect(center).toBeDefined();
    center?.([123.9, 10.34]);
    const updated = render();
    expect(updated).toContain("Near center");
    expect(updated).not.toContain("Far from center");
  });

  it("filters endpoint cards using current budget, type and amenity filters", async () => {
    await load({ ok: true, json: async () => ({ rentals: [rental] }) });
    for (const filter of [{ maxPrice: 3000 }, { propertyTypes: ["bedspace"] as RentalFilters["propertyTypes"] }, { aircon: true }]) {
      hooks.changeFilters?.({ ...DEFAULT_RENTAL_FILTERS, ...filter });
      expect(render()).toContain("No verified rentals found");
      expect(render()).not.toContain(rental.title);
    }
    hooks.changeFilters?.({ ...DEFAULT_RENTAL_FILTERS, maxPrice: 5000, propertyTypes: ["studio"], wifiAvailable: true });
    expect(render()).toContain(rental.title);
  });

  it.each([
    { ok: true, json: async () => ({ rentals: [] }), message: "No verified rentals found" },
    { ok: false, json: async () => ({}), message: "Rental inventory unavailable" },
    { ok: true, json: async () => ({ rentals: null }), message: "Rental inventory unavailable" },
    { ok: true, json: async () => { throw new Error("Invalid JSON"); }, message: "Rental inventory unavailable" },
  ])("distinguishes empty and failed reads ($message)", async ({ message, ...response }) => {
    await load(response);
    expect(render()).toContain(message);
  });

  it("shows network failures honestly with a retry action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));
    render();
    hooks.effect?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(render()).toContain('role="alert"');
    expect(render()).toContain("Rental inventory unavailable");
    expect(render()).toContain("Try again");
  });

  it("does not fetch with an explicit SSR state override", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render("ready");
    hooks.effect?.();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not publish a request result after cleanup", async () => {
    let resolve!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise((done) => { resolve = done; })));
    render();
    const cleanup = hooks.effect?.();
    cleanup?.();
    resolve({ ok: true, json: async () => ({ rentals: [rental] }) });
    await new Promise((done) => setTimeout(done, 0));
    expect(render()).toContain("Loading rentals…");
    expect(render()).not.toContain(rental.title);
  });

  it("renders the map-first shell and does not pretend unavailable rentals are live", () => {
    const html = render("error");

    expect(html).toContain('role="group" aria-label="Rental search filters"');
    expect(html).toContain('aria-label="Budget, any maximum"');
    expect(html).toContain("Rental inventory unavailable");
    expect(html).toContain("No sample properties are shown.");
    expect(html).toContain("Use sample data");
    expect(html).toContain('aria-label="Open menu"');
    expect(html).toContain('aria-label="Open account dialog"');
    expect(html).toContain('aria-label="Ask AbangCebu"');
    expect(html).not.toContain("Garden room in Lahug");
  });

  it("renders the sample-data action when inventory is unavailable or empty", () => {
    expect(render("error")).toContain("Use sample data");
    expect(render("loading")).not.toContain("Use sample data");
    expect(render("ready")).toContain("Use sample data");
  });

  it("renders one AREA radius selector before budget and a descriptive rail chip", () => {
    const html = render("error");

    expect(html.match(/aria-label="Search area radius"/g)).toHaveLength(1);
    expect(html).toContain('<option value="2" selected="">2 km radius</option>');
    expect(html).toContain("Search area: 2 km radius");
    expect(html.indexOf('aria-label="Search area radius"')).toBeLessThan(html.indexOf('aria-label="Budget, any maximum"'));
    expect(html).not.toContain('id="radius"');
    expect(html).toContain('aria-label="Search places"');
    expect(html.indexOf("</header>")).toBeLessThan(html.indexOf('aria-label="Open account dialog"'));
    expect(html).toContain('aria-label="Open account dialog"');
    expect(html).not.toContain("Continue with email");
    expect(html).not.toContain("Create account");
  });

  it.each([
    ["loading", "Loading rentals…", "Checking the configured rental data service…"],
    ["ready", "No verified rentals found", "No live rental records match your search area."],
  ] as const)("keeps the %s inventory state explicit", (rentalStatus, title, message) => {
    const html = renderToStaticMarkup(<RestoredFinderShell rentalStatus={rentalStatus} />);

    expect(html).toContain(title);
    expect(html).toContain(message);
    expect(html).not.toContain("AVAILABLE IN CEBU");
  });

  it("places a small gap between the search header and filter strip on desktop and mobile", () => {
    const css = readFileSync("src/features/map/RestoredFinderShell.module.css", "utf8");

    expect(css).toContain("top: max(6rem, calc(env(safe-area-inset-top) + 5rem))");
    expect(css).toContain("top: calc(max(8.5rem, env(safe-area-inset-top) + 8rem) + .5rem)");
  });

  it("keeps the account dialog closed until the account trigger is used", () => {
    const html = render("error");

    expect(html).toContain('aria-label="Open account dialog"');
    expect(html).not.toContain('class="_accountDialog_');
    expect(html).not.toContain('aria-label="Account access"');
    expect(html).not.toContain("Email Address");
  });
});
