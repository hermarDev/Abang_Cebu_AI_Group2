import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  Select,
  Skeleton,
  Toast,
  ToastViewport,
} from "./index";

afterEach(cleanup);

describe("shared UI components", () => {
  it("renders all button variants as accessible 44px-minimum touch targets", () => {
    render(
      <div>
        <Button>Search homes</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Delete</Button>
      </div>,
    );

    for (const name of ["Search homes", "Secondary", "Outline", "Ghost", "Delete"]) {
      expect(screen.getByRole("button", { name })).toHaveClass("touch-target");
      expect(screen.getByRole("button", { name })).toHaveClass("focus-ring");
    }
  });

  it("disables a loading button and announces its progress", () => {
    render(<Button loading>Save listing</Button>);

    expect(screen.getByRole("button", { name: "Loading: Save listing" })).toBeDisabled();
    expect(screen.getByText("Loading")).toHaveClass("sr-only");
  });

  it("associates input labels, helper text, and validation errors", () => {
    render(
      <>
        <Input label="Email address" type="email" helperText="Use your account email." />
        <Input label="Password" type="password" error="Enter a valid password." />
      </>,
    );

    const email = screen.getByRole("textbox", { name: "Email address" });
    expect(email).toHaveAccessibleDescription("Use your account email.");

    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAccessibleDescription("Enter a valid password.");
  });

  it("renders a labelled native select with the selected option", async () => {
    const user = userEvent.setup();
    render(
      <Select label="District" defaultValue="cebu-city">
        <option value="cebu-city">Cebu City</option>
        <option value="mandaue">Mandaue</option>
      </Select>,
    );

    const select = screen.getByRole("combobox", { name: "District" });
    expect(select).toHaveValue("cebu-city");
    await user.selectOptions(select, "mandaue");
    expect(select).toHaveValue("mandaue");
    expect(select).toHaveClass("touch-target");
  });

  it("composes semantic card sections using theme tokens", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Rental details</CardTitle>
          <CardDescription>Choose a place to call home.</CardDescription>
        </CardHeader>
        <CardContent>Monthly rent is shown on each listing.</CardContent>
      </Card>,
    );

    const heading = screen.getByRole("heading", { name: "Rental details" });
    expect(heading).toBeInTheDocument();
    const card = heading.closest("[data-slot='card']");
    expect(card).toHaveClass("bg-card", "text-card-foreground", "border-border");
    expect(within(card as HTMLElement).getByText("Choose a place to call home.")).toBeInTheDocument();
  });

  it("exposes badge intent through semantic tokens", () => {
    render(
      <>
        <Badge>Available</Badge>
        <Badge variant="success">Verified</Badge>
        <Badge variant="warning">Pending</Badge>
        <Badge variant="destructive">Unavailable</Badge>
        <Badge variant="outline">Furnished</Badge>
      </>,
    );

    expect(screen.getByText("Available")).toHaveClass("bg-accent", "text-accent-foreground");
    expect(screen.getByText("Verified")).toHaveClass("bg-action", "text-action-foreground");
    expect(screen.getByText("Pending")).toHaveClass("bg-warning", "text-warning-foreground");
    expect(screen.getByText("Unavailable")).toHaveClass("bg-destructive", "text-destructive-foreground");
    expect(screen.getByText("Furnished")).toHaveClass("border-border", "text-foreground");
  });

  it("calls the dismiss callback when Escape requests the native dialog cancel action", () => {
    const onOpenChange = vi.fn();
    render(<Modal open onOpenChange={onOpenChange} title="Search settings">Filters</Modal>);

    const dialog = screen.getByRole("dialog", { name: "Search settings" });
    const cancelEvent = new Event("cancel", { cancelable: true });
    dialog.dispatchEvent(cancelEvent);

    expect(cancelEvent.defaultPrevented).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls the dismiss callback only when the modal backdrop itself is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Modal open onOpenChange={onOpenChange} title="Search settings">Filters</Modal>);

    const dialog = screen.getByRole("dialog", { name: "Search settings" });
    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    onOpenChange.mockClear();

    await user.click(dialog);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders dismissible status and alert toasts in a notification viewport", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <ToastViewport>
        <Toast open title="Filters saved" onDismiss={onDismiss} />
        <Toast open variant="error" title="Search failed" description="Try again." />
      </ToastViewport>,
    );

    const notifications = within(screen.getByRole("region", { name: "Notifications" }));
    expect(notifications.getByRole("status")).toHaveTextContent("Filters saved");
    expect(notifications.getByRole("alert")).toHaveTextContent("Try again.");
    await user.click(notifications.getByRole("button", { name: "Dismiss notification" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("renders skeletons as decorative placeholders hidden from assistive technology", () => {
    render(<Skeleton aria-label="Loading listing card" className="h-20 w-full" />);

    expect(screen.getByLabelText("Loading listing card")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByLabelText("Loading listing card")).toHaveClass("animate-pulse", "bg-muted");
  });
});
