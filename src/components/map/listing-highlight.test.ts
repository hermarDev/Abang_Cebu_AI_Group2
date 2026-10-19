import { afterEach, describe, expect, it, vi } from "vitest";
import { LISTING_HIGHLIGHT_EVENT, publishListingHighlight } from "@/components/map/map-search-adapter";
import { subscribeToListingHighlights } from "./listing-highlight";

function marker() {
  return { getElement: () => document.createElement("button") };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("listing highlight map adapter", () => {
  it("activates the matching pin and deactivates the previous pin", () => {
    const first = marker();
    const second = marker();
    const markers = new Map([["first", first], ["second", second]]);
    const activeListingId = { current: null as string | null };
    const setMarkerActive = vi.fn();
    const unsubscribe = subscribeToListingHighlights(markers, activeListingId, setMarkerActive);

    publishListingHighlight("first");
    expect(activeListingId.current).toBe("first");
    expect(setMarkerActive).toHaveBeenNthCalledWith(1, first, true);

    publishListingHighlight("second");
    expect(activeListingId.current).toBe("second");
    expect(setMarkerActive).toHaveBeenNthCalledWith(2, first, false);
    expect(setMarkerActive).toHaveBeenNthCalledWith(3, second, true);

    publishListingHighlight(null);
    expect(activeListingId.current).toBeNull();
    expect(setMarkerActive).toHaveBeenNthCalledWith(4, second, false);
    unsubscribe();
  });

  it("ignores malformed events and supports clear before a marker exists", () => {
    const markers = new Map([["first", marker()]]);
    const activeListingId = { current: null as string | null };
    const setMarkerActive = vi.fn();
    const unsubscribe = subscribeToListingHighlights(markers, activeListingId, setMarkerActive);

    window.dispatchEvent(new CustomEvent(LISTING_HIGHLIGHT_EVENT, { detail: { listingId: 42 } }));
    expect(activeListingId.current).toBeNull();
    expect(setMarkerActive).not.toHaveBeenCalled();

    publishListingHighlight("not-yet-rendered");
    expect(activeListingId.current).toBe("not-yet-rendered");
    expect(setMarkerActive).not.toHaveBeenCalled();

    publishListingHighlight(null);
    expect(activeListingId.current).toBeNull();
    expect(setMarkerActive).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("removes its event listener on unmount", () => {
    const markers = new Map<string, { getElement: () => HTMLElement }>();
    const activeListingId = { current: null as string | null };
    const setMarkerActive = vi.fn();
    const spy = vi.spyOn(window, "removeEventListener");
    const unsubscribe = subscribeToListingHighlights(markers, activeListingId, setMarkerActive);

    unsubscribe();
    publishListingHighlight("first");

    expect(spy).toHaveBeenCalledWith(LISTING_HIGHLIGHT_EVENT, expect.any(Function));
    expect(activeListingId.current).toBeNull();
    expect(setMarkerActive).not.toHaveBeenCalled();
  });
});
