import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
        <Button variant="destructive">Delete</Button>
      </div>,
    );

    for (const name of ["Search homes", "Secondary", "Delete"]) {
      expect(screen.getByRole("button", { name })).toHaveClass("touch-target");
    }
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("focus-ring");
  });

  it("retains a contrasting outline border on accent hover", () => {
    render(<Button variant="outline">Outline search</Button>);
    const outlineButton = screen.getByRole("button", { name: "Outline search" });
    expect(outlineButton).toHaveClass(
      "border-input",
      "hover:bg-accent",
      "hover:border-accent-foreground",
      "hover:text-accent-foreground",
    );
    expect(outlineButton).not.toHaveClass("hover:border-transparent");
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

  it("preserves caller-provided aria-invalid when helper errors are absent", () => {
    render(
      <>
        <Input aria-label="Email" aria-invalid="true" />
        <Select aria-label="District" aria-invalid="true"><option value="">Choose</option></Select>
      </>,
    );

    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("combobox", { name: "District" })).toHaveAttribute("aria-invalid", "true");
  });

  it("preserves caller descriptions alongside input helper text", () => {
    render(
      <>
        <p id="email-hint">Use a work email.</p>
        <Input label="Email address" helperText="We will not share it." aria-describedby="email-hint" />
      </>,
    );

    const email = screen.getByRole("textbox", { name: "Email address" });
    expect(email.getAttribute("aria-describedby")).toContain("email-hint");
    expect(email.getAttribute("aria-describedby")).toContain("description");
  });

  it("preserves caller descriptions alongside select validation errors", () => {
    render(
      <>
        <p id="district-hint">Choose your preferred area.</p>
        <Select label="District" error="Select a valid district." aria-describedby="district-hint">
          <option value="">Choose a district</option>
        </Select>
      </>,
    );

    const district = screen.getByRole("combobox", { name: "District" });
    expect(district.getAttribute("aria-describedby")).toContain("district-hint");
    expect(district.getAttribute("aria-describedby")).toContain("description");
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

  it("opens through the native modal API before handling the Escape cancel action", () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    const onOpenChange = vi.fn();
    render(<Modal open onOpenChange={onOpenChange} title="Search settings">Filters</Modal>);

    const dialog = screen.getByRole("dialog", { name: "Search settings" });
    expect(showModal).toHaveBeenCalledOnce();
    const cancelEvent = new Event("cancel", { cancelable: true });
    dialog.dispatchEvent(cancelEvent);

    expect(cancelEvent.defaultPrevented).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes an open native dialog before unmount removes it", () => {
    const close = vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (this: HTMLDialogElement) {
      expect(this.isConnected).toBe(true);
      this.removeAttribute("open");
    });
    const view = render(<Modal open onOpenChange={vi.fn()} title="Search settings">Filters</Modal>);

    view.unmount();

    expect(close).toHaveBeenCalledOnce();
  });

  it("restores focus to the opener when an open dialog unmounts", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const view = render(<Modal open onOpenChange={vi.fn()} title="Search settings">Filters</Modal>);

    view.unmount();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("closes only for click events originating from the dialog backdrop", () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} title="Search settings">
        <div>Interior padding</div>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog", { name: "Search settings" });
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({
      x: 100, y: 100, width: 500, height: 400, top: 100, right: 600, bottom: 500, left: 100,
      toJSON: () => ({}),
    });
    fireEvent.click(dialog, { clientX: 101, clientY: 101 });
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.click(dialog, { clientX: 50, clientY: 50 });
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
