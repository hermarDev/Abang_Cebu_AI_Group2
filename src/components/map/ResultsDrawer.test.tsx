"use client";

import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DEFAULT_SEARCH_FILTERS } from "@/lib/search-filters";
import ResultsDrawer, { type RentalResult } from "./ResultsDrawer";

const results: RentalResult[] = [
  { id: "first", title: "First rental", price: 4000, address: "Lahug", type: "bedspace", latitude: 10.3, longitude: 123.9, amenities: ["wifi"] },
  { id: "second", title: "Second rental", price: 7000, address: "Banilad", type: "apartment", latitude: 10.35, longitude: 123.91, amenities: ["aircon"] },
];

afterEach(() => cleanup());

describe("ResultsDrawer pin coordination", () => {
  it("highlights the hovered card, clears it after pointer exit, and pins on tap", async () => {
    let activeListingId: string | null = null;
    const onPinHighlight = vi.fn((id: string | null) => { activeListingId = id; });
    const renderDrawer = () => createElement(ResultsDrawer, {
      results,
      filters: DEFAULT_SEARCH_FILTERS,
      onPinHighlight,
      activeListingId,
    });
    const { rerender } = render(renderDrawer());

    await waitFor(() => expect(screen.getByText("First rental")).toBeTruthy());
    const first = screen.getByText("First rental").closest("[data-listing-id]");
    expect(first).not.toBeNull();

    fireEvent.pointerOver(first!, { pointerType: "mouse" });
    expect(onPinHighlight).toHaveBeenLastCalledWith("first");
    rerender(renderDrawer());
    fireEvent.pointerOut(first!, { pointerType: "mouse", relatedTarget: document.body });
    expect(onPinHighlight).toHaveBeenLastCalledWith(null);
    rerender(renderDrawer());

    fireEvent.click(first!);
    expect(onPinHighlight).toHaveBeenLastCalledWith("first");
  });


  it("highlights a listing on touch start and clears it with Escape", async () => {
    const onPinHighlight = vi.fn();
    render(createElement(ResultsDrawer, { results, filters: DEFAULT_SEARCH_FILTERS, onPinHighlight }));

    await waitFor(() => expect(screen.getByText("First rental")).toBeTruthy());
    const first = screen.getByText("First rental").closest("[data-listing-id]");
    expect(first).not.toBeNull();

    fireEvent.touchStart(first!, { touches: [{ clientY: 200 }] });
    expect(onPinHighlight).toHaveBeenLastCalledWith("first");
    fireEvent.touchEnd(first!, { changedTouches: [{ clientY: 198 }] });
    expect(onPinHighlight).toHaveBeenLastCalledWith("first");
    fireEvent.keyDown(first!, { key: "Escape" });
    expect(onPinHighlight).toHaveBeenLastCalledWith(null);
  });

  it("updates the result list when filter props change", async () => {
    const { rerender } = render(createElement(ResultsDrawer, { results, filters: DEFAULT_SEARCH_FILTERS, onPinHighlight: vi.fn() }));
    await waitFor(() => expect(screen.getByText("Second rental")).toBeTruthy());
    rerender(createElement(ResultsDrawer, { results, filters: { ...DEFAULT_SEARCH_FILTERS, maxRent: 5000 }, onPinHighlight: vi.fn() }));
    expect(screen.getByText("First rental")).toBeTruthy();
    expect(screen.queryByText("Second rental")).toBeNull();
  });
});
