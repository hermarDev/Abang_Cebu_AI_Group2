import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";

vi.mock("@/components/ui/Modal", () => ({ Modal: ({ children, className, ...props }: { children: ReactNode; className?: string; [key: `data-${string}`]: string | boolean | undefined }) => <div className={className} {...props}>{children}</div> }));
import { DEFAULT_RENTAL_FILTERS, type RentalFilters } from "@/contracts/rental-filters";
import { QuickFilters, getActiveFilterCount } from "@/features/map/FinderQuickFilters";
import { RentalFilterDialog, applyDraft, countDraftRentals, createDraftState, getBudgetError, resetDraft, setDraftRadius, syncDraftState } from "./RentalFilterDialog";

it("keeps the quick toolbar to Budget, Property type, and Filters without a radius select", () => {
  const html = renderToStaticMarkup(<QuickFilters filters={DEFAULT_RENTAL_FILTERS} onChange={() => undefined} onOpenFilters={() => undefined} mapRadius={5} onRadiusChange={() => undefined} />);
  const toolbar = html.slice(html.indexOf('aria-label="Rental search filters"'));

  expect(toolbar.match(/<button/g)).toHaveLength(3);
  expect(toolbar).toContain("Budget");
  expect(toolbar).toContain("Property type");
  expect(toolbar).toContain("Filters");
  expect(toolbar).not.toContain("Search area radius");
  expect(getActiveFilterCount({ ...DEFAULT_RENTAL_FILTERS, maxPrice: 5000, propertyTypes: ["studio", "apartment"], furnishingTypes: ["furnished"], aircon: true, radiusKm: 5 })).toBe(3);
});

it("shows the selected budget and one or multiple property types in the toolbar", () => {
  const selected = renderToStaticMarkup(<QuickFilters filters={{ ...DEFAULT_RENTAL_FILTERS, maxPrice: 5000, propertyTypes: ["studio"] }} onChange={() => undefined} onOpenFilters={() => undefined} mapRadius={2} onRadiusChange={() => undefined} />);
  const multiple = renderToStaticMarkup(<QuickFilters filters={{ ...DEFAULT_RENTAL_FILTERS, propertyTypes: ["studio", "apartment"] }} onChange={() => undefined} onOpenFilters={() => undefined} mapRadius={2} onRadiusChange={() => undefined} />);

  expect(selected).toContain("Up to ₱5,000");
  expect(selected).toContain(">Studio</span>");
  expect(multiple).toContain(">2 types</span>");
});

it("exposes the mobile sheet scroll region before its persistent apply footer", () => {
  const html = renderToStaticMarkup(<RentalFilterDialog filters={DEFAULT_RENTAL_FILTERS} open onApply={() => undefined} matchCount={0} />);
  const sheet = html.indexOf('data-filter-surface="responsive-sheet"');
  const scrollRegion = html.indexOf('data-scroll-region="filter-options"');
  const footer = html.indexOf('data-sticky-footer="true"');

  expect(sheet).toBeGreaterThanOrEqual(0);
  expect(scrollRegion).toBeGreaterThan(sheet);
  expect(footer).toBeGreaterThan(scrollRegion);
  expect(html.slice(footer)).toContain("Reset");
  expect(html.slice(footer)).toContain("Apply filters");
});

it("keeps area and monthly budget visible while secondary filter groups collapse", () => {
  const html = renderToStaticMarkup(<RentalFilterDialog filters={DEFAULT_RENTAL_FILTERS} open onApply={() => undefined} matchCount={9} />);
  for (const label of ["Search area", "Monthly budget", "Property type", "Essentials", "Policies", "Apply filters"]) {
    expect(html).toContain(label);
  }
  expect(html.match(/<details/g)).toHaveLength(3);
  expect(html).not.toMatch(/<details[^>]*open/);
  expect(html.indexOf("</details>")).toBeGreaterThan(html.indexOf('id="rental-budget-heading"'));
  expect(html).not.toContain("Show 9 rentals");
});

it("passes the draft radius into a valid live preview", () => {
  const count = vi.fn((_draft: RentalFilters, radius: number) => radius * 2);
  const html = renderToStaticMarkup(<RentalFilterDialog filters={DEFAULT_RENTAL_FILTERS} open mapRadius={5} onApply={() => undefined} matchCount={0} getDraftCount={count} />);

  expect(count).toHaveBeenCalledOnce();
  expect(count.mock.calls[0]?.[1]).toBe(5);
  expect(countDraftRentals({ ...DEFAULT_RENTAL_FILTERS, minPrice: 6000, maxPrice: 5000 }, 5, count)).toBeNull();
  expect(html).toContain("Show 10 rentals");
});

it("passes a changed draft radius into the live preview before apply", () => {
  const getDraftCount = vi.fn((_draft: RentalFilters, radius: number) => radius * 2);
  const changed = setDraftRadius(createDraftState(DEFAULT_RENTAL_FILTERS, 5), 1);

  expect(countDraftRentals(changed.draft, changed.radius, getDraftCount)).toBe(2);
  expect(getDraftCount.mock.calls[0]?.[1]).toBe(1);
});

it("defaults, resets, applies, and cancels the radius with its filter draft", () => {
  const initialDefault = createDraftState(DEFAULT_RENTAL_FILTERS);
  expect(initialDefault.radius).toBe(2);
  const initial = createDraftState(DEFAULT_RENTAL_FILTERS, 5);
  expect(initial.radius).toBe(5);

  const changed = setDraftRadius({ ...initial, draft: { ...initial.draft, maxPrice: 5000 } }, 1);
  const reset = resetDraft(changed);
  expect(reset.radius).toBe(2);
  expect(reset.draft).toEqual(DEFAULT_RENTAL_FILTERS);

  const appliedFilters: RentalFilters[] = [];
  const appliedRadii: number[] = [];
  applyDraft(reset, (draft) => appliedFilters.push(draft), (radius) => appliedRadii.push(radius));
  expect(appliedFilters).toEqual([DEFAULT_RENTAL_FILTERS]);
  expect(appliedRadii).toEqual([2]);

  const discarded = syncDraftState(changed, DEFAULT_RENTAL_FILTERS, false, 5);
  expect(discarded.radius).toBe(1);
  expect(syncDraftState(discarded, DEFAULT_RENTAL_FILTERS, true, 5).radius).toBe(5);
});

it("validates budget ordering and supported numeric bounds", () => {
  expect(getBudgetError({ ...DEFAULT_RENTAL_FILTERS, minPrice: 5000, maxPrice: 4000 })).toBe("Minimum budget must not exceed maximum budget.");
  expect(getBudgetError({ ...DEFAULT_RENTAL_FILTERS, minPrice: -1 })).toBe("Enter a monthly budget between ₱0 and ₱50,000.");
  expect(getBudgetError({ ...DEFAULT_RENTAL_FILTERS, maxPrice: 50_001 })).toBe("Enter a monthly budget between ₱0 and ₱50,000.");
  expect(getBudgetError({ ...DEFAULT_RENTAL_FILTERS, minPrice: 4_000, maxPrice: 5_000 })).toBe("");
});
