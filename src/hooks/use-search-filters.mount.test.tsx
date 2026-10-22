import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useSearchFilters } from "./use-search-filters";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("useSearchFilters URL restoration", () => {
  it("hydrates the mounted hook from a loaded URL and restores filters after reload", () => {
    const url = "/?landmark=usc&type=bedspace%2Ccondo&min_rent=1500&max_rent=5000&gender=female_only&amenities=aircon%2Cwifi&keep=1#map";
    window.history.replaceState(null, "", url);

    const { result, unmount } = renderHook(() => useSearchFilters());
    const expected = {
      type: ["bedspace", "condo"],
      minRent: 1500,
      maxRent: 5000,
      gender: "female_only",
      amenities: ["aircon", "wifi"],
    };

    expect(result.current.filters).toEqual(expected);
    expect(result.current.activeFilterCount).toBe(7);

    unmount();

    const reloaded = renderHook(() => useSearchFilters());

    expect(reloaded.result.current.filters).toEqual(expected);
    expect(reloaded.result.current.activeFilterCount).toBe(7);

    act(() => {
      window.history.replaceState(null, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(reloaded.result.current.filters).toEqual({ type: [], amenities: [] });
    expect(reloaded.result.current.activeFilterCount).toBe(0);

    act(() => {
      window.history.replaceState(null, "", url);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(reloaded.result.current.filters).toEqual(expected);
    expect(reloaded.result.current.activeFilterCount).toBe(7);
  });
});
