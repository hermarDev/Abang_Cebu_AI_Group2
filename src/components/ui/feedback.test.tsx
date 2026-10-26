import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Alert } from "./Alert";
import { Empty } from "./Empty";
import { Field, FieldError } from "./Field";
import { FinderAssistant } from "@/features/map/FinderAssistant";

const assistantState = vi.hoisted(() => ({ open: true }));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState: () => [assistantState.open, vi.fn()],
}));

const render = (node: ReactNode) => renderToStaticMarkup(node);

describe("shared feedback primitives", () => {
  it("keeps field errors linked by the caller-provided input description id", () => {
    const html = render(
      <Field data-testid="email-field">
        <label htmlFor="email">Email</label>
        <input id="email" aria-invalid="true" aria-describedby="email-error" />
        <FieldError id="email-error">Enter a valid email.</FieldError>
      </Field>,
    );

    expect(html).toContain('data-testid="email-field"');
    expect(html).toContain('aria-describedby="email-error"');
    expect(html).toContain('id="email-error"');
    expect(html).toContain("Enter a valid email.");
  });

  it("renders an alert role and preserves standard HTML attributes", () => {
    const html = render(<Alert id="service-alert" data-testid="alert">Service unavailable.</Alert>);

    expect(html).toContain('role="alert"');
    expect(html).toContain('id="service-alert"');
    expect(html).toContain('data-testid="alert"');
  });

  it("renders an empty-state wrapper without implying an error or live announcement", () => {
    const html = render(<Empty aria-labelledby="empty-title"><h2 id="empty-title">No saved rentals</h2></Empty>);

    expect(html).toContain('aria-labelledby="empty-title"');
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('role="status"');
    expect(html).toContain("No saved rentals");
  });

  it("uses shared Empty and Alert for the offline assistant without duplicate live regions", () => {
    const html = render(<FinderAssistant open onOpenChange={() => undefined} onSearch={() => undefined} onFilters={() => undefined} />);

    expect(html).toContain('data-slot="empty"');
    expect(html).toContain('data-slot="alert"');
    expect(html).toContain('role="alert"');
    expect(html.match(/role="alert"/g)).toHaveLength(1);
    expect(html).not.toContain('role="status"');
    expect(html).toContain("AI Assistant Not Connected");
    expect(html).toContain("Live recommendations are unavailable.");
  });
});
