import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FinderQuickFilters } from "./FinderQuickFilters";

const renderFilters = (selectedBudget: number | null, selectedPropertyTypes: ("bedspace" | "boarding_house" | "private_room" | "shared_room" | "studio" | "apartment" | "condo" | "house")[] = []) =>
  renderToStaticMarkup(
    <FinderQuickFilters
      selectedBudget={selectedBudget}
      selectedPropertyTypes={selectedPropertyTypes}
      additionalFilterCount={2}
      onBudgetChange={vi.fn()}
      onPropertyTypesChange={vi.fn()}
      onOpenFilters={vi.fn()}
    />,
  );

describe("FinderQuickFilters", () => {
  it("renders SOURCE budget and property choices with the selected values and advanced-filter action", () => {
    const html = renderFilters(3500, ["bedspace", "studio"]);
    const budgets = Array.from(html.matchAll(/type="radio"[^>]*value="([^"]*)"/g), ([, value]) => value);
    const propertyTypes = Array.from(html.matchAll(/type="checkbox"[^>]*value="([^"]+)"/g), ([, value]) => value);

    expect(html).toContain('role="group" aria-label="Refine rental search"');
    expect(budgets).toEqual(["", "2500", "3500", "5000", "8000"]);
    expect(propertyTypes).toEqual([
      "private_room", "bedspace", "boarding_house", "shared_room", "studio", "apartment", "condo", "house",
    ]);
    expect(html).toContain('aria-label="Budget, up to 3,500 pesos"');
    expect(html).toContain("≤ ₱3.5k");
    expect(html).toContain('aria-label="Property type, Bedspace, Studio"');
    expect(html).toContain('aria-label="All filters, 2 more applied"');
    expect(html).toMatch(/class="[^"]*filterBadge[^"]*" aria-hidden="true">2<\/span>/);
    expect(html).toMatch(/<input type="checkbox"(?=[^>]*value="bedspace")(?=[^>]*checked="")[^>]*>/);
    expect(html).toMatch(/<input type="checkbox"(?=[^>]*value="studio")(?=[^>]*checked="")[^>]*>/);
  });

  it("preserves an existing custom budget ceiling as a selectable option", () => {
    const html = renderFilters(3200);

    expect(html).toMatch(/<input type="radio" name="[^"]+"(?=[^>]*value="3200")(?=[^>]*checked="")[^>]*>/);
    expect(html).toContain("Up to ₱3,200");
    expect(html).toContain("≤ ₱3.2k");
  });
});
