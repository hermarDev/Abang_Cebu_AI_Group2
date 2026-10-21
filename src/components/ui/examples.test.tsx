import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ComponentShowcase } from "./examples";

afterEach(cleanup);

describe("UI library showcase", () => {
  it("renders form, loading, error, search, card, and skeleton states", () => {
    render(<ComponentShowcase />);

    expect(screen.getByRole("heading", { name: "Reusable UI components" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Location" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Bedrooms" })).toBeInTheDocument();
    expect(screen.getByLabelText("Monthly budget")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Loading: Saving" })).toBeDisabled();
    expect(screen.getByRole("heading", { name: "Search result panel" })).toBeInTheDocument();
    expect(document.querySelectorAll("[aria-hidden='true'].animate-pulse")).toHaveLength(2);
  });

  it("renders a dismissible confirmation toast", async () => {
    const user = userEvent.setup();
    render(<ComponentShowcase />);

    await user.click(screen.getByRole("button", { name: "Show confirmation" }));
    expect(screen.getByText("Search settings saved")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByText("Search settings saved")).not.toBeInTheDocument();
  });
});
