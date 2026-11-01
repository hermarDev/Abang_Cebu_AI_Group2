import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Alert } from "./Alert";
import { Empty } from "./Empty";
import { Field, FieldError } from "./Field";
import { FinderAssistant } from "@/features/map/FinderAssistant";

const assistantTestState = vi.hoisted(() => ({ enabled: false, hookIndex: 0, error: null as string | null }));
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useState: (initial: unknown) => {
      const hookIndex = assistantTestState.hookIndex++;
      const [value, setValue] = react.useState(initial);
      return assistantTestState.enabled && hookIndex === 7
        ? [assistantTestState.error, setValue]
        : [value, setValue];
    },
  };
});

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

  it("shows the connection-failure alert in the real assistant without duplicate live regions", () => {
    assistantTestState.enabled = true;
    assistantTestState.hookIndex = 0;
    assistantTestState.error = "The assistant could not connect just now. Check your connection and try again.";
    let html: string;
    try {
      html = render(<FinderAssistant open onOpenChange={() => undefined} onSearch={() => undefined} onFilters={() => undefined} onControlsTargetChange={() => undefined} />);
    } finally {
      assistantTestState.enabled = false;
      assistantTestState.error = null;
    }

    expect(html).toContain('aria-label="AbangCebu assistant"');
    expect(html).toContain("The assistant could not connect just now. Check your connection and try again.");
    expect(html.match(/role="alert"/g)).toHaveLength(1);
    expect(html).toContain('role="log" aria-live="polite"');
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain("AI Assistant Not Connected");
  });
});
