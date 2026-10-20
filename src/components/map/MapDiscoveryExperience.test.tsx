import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MapDiscoveryExperience from "./MapDiscoveryExperience";

const searchFilterMocks = vi.hoisted(() => ({
  updateFilters: vi.fn(),
  clearFilters: vi.fn(),
}));

vi.mock("@/components/map/MapCanvasLoader", () => ({ default: () => null }));
vi.mock("@/hooks/use-search-filters", () => ({
  useSearchFilters: () => ({
    filters: { type: [], amenities: [] },
    updateFilters: searchFilterMocks.updateFilters,
    clearFilters: searchFilterMocks.clearFilters,
    activeFilterCount: 0,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MapDiscoveryExperience filter shortcut", () => {
  it("opens the filter dialog without activating the first quick-filter pill", () => {
    render(<MapDiscoveryExperience />);

    const quickFilter = screen.getByRole("button", { name: "Under ₱5,000" });
    const results = screen.getByRole("complementary", { name: "Rental results" });
    fireEvent.click(within(results).getByRole("button", { name: "Filters" }));

    expect(screen.getByRole("dialog", { name: "Filters" })).toBeTruthy();
    expect(quickFilter.getAttribute("aria-pressed")).toBe("false");
    expect(searchFilterMocks.updateFilters).not.toHaveBeenCalled();
  });
});
