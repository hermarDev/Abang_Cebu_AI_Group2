import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchFilterPanel from "./SearchFilterPanel";

const defaults = { type: [], amenities: [] };

afterEach(cleanup);

function renderPanel() {
  const onChange = vi.fn();
  const onClear = vi.fn();
  render(
    <div>
      <main>Background content</main>
      <SearchFilterPanel
        filters={defaults}
        activeFilterCount={0}
        onChange={onChange}
        onClear={onClear}
      />
    </div>,
  );
  const trigger = screen.getByRole("button", { name: "Filters" });
  trigger.focus();
  fireEvent.click(trigger);
  return { onChange, onClear, dialog: screen.getByRole("dialog"), trigger };
}

describe("SearchFilterPanel", () => {
  it("clears all draft filters, including rent and gender", () => {
    const { dialog, onChange, onClear } = renderPanel();
    fireEvent.change(within(dialog).getByLabelText("Minimum"), { target: { value: "1000" } });
    fireEvent.change(within(dialog).getByLabelText("Maximum"), { target: { value: "5000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Male only" }));

    fireEvent.click(within(dialog).getByRole("button", { name: "Clear all" }));

    expect(within(dialog).getByLabelText("Minimum")).toHaveProperty("value", "");
    expect(within(dialog).getByLabelText("Maximum")).toHaveProperty("value", "");
    expect(within(dialog).getByRole("button", { name: "Male only" }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(within(dialog).getByRole("button", { name: "Show rentals" }));
    expect(onClear).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith({
      type: [],
      amenities: [],
      minRent: undefined,
      maxRent: undefined,
      gender: undefined,
    });
  });

  it("exposes the filter sheet as a named modal dialog", () => {
    renderPanel();
    expect(screen.getByRole("dialog", { name: "Filters" }).getAttribute("aria-modal")).toBe("true");
  });

  it("makes background content inert while open and restores its prior state", () => {
    const { onChange, onClear } = (() => {
      const onChange = vi.fn();
      const onClear = vi.fn();
      render(
        <div>
          <SearchFilterPanel filters={defaults} activeFilterCount={0} onChange={onChange} onClear={onClear} />
        </div>,
      );
      return { onChange, onClear };
    })();
    const background = screen.getByLabelText("Rental filters");
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(background.hasAttribute("inert")).toBe(true);
    expect(background.getAttribute("aria-hidden")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Close filters" }));
    expect(background.hasAttribute("inert")).toBe(false);
    expect(background.hasAttribute("aria-hidden")).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
  });

  it("closes on Escape and restores focus to the filter trigger", () => {
    const { trigger } = renderPanel();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("wraps keyboard focus from the first dialog control to the last", () => {
    const { dialog } = renderPanel();
    const controls = within(dialog).getAllByRole("button");
    controls.forEach((control) => vi.spyOn(control, "getClientRects").mockReturnValue(Object.assign([{ } as DOMRect], { item: (index: number) => index === 0 ? {} as DOMRect : null }) as DOMRectList));
    controls[0].focus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(controls.at(-1));
  });

  it("wraps keyboard focus from the last dialog control to the first", () => {
    const { dialog } = renderPanel();
    const controls = within(dialog).getAllByRole("button");
    controls.forEach((control) => vi.spyOn(control, "getClientRects").mockReturnValue(Object.assign([{ } as DOMRect], { item: (index: number) => index === 0 ? {} as DOMRect : null }) as DOMRectList));
    controls.at(-1)?.focus();

    fireEvent.keyDown(document, { key: "Tab" });

    expect(document.activeElement).toBe(controls[0]);
  });
});
