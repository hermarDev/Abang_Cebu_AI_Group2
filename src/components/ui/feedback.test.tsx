import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Alert } from "./Alert";
import { Empty } from "./Empty";
import { Field, FieldError } from "./Field";
import { FinderAssistant, buildAssistantReply } from "@/features/map/FinderAssistant";

const assistantTestState = vi.hoisted(() => ({ enabled: false, hookIndex: 0, error: null as string | null, messages: null as Array<{ role: "user" | "assistant"; content: string }> | null }));
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useState: (initial: unknown) => {
      const hookIndex = assistantTestState.hookIndex++;
      const [value, setValue] = react.useState(initial);
      if (assistantTestState.enabled && hookIndex === 0 && assistantTestState.messages) {
        return [assistantTestState.messages, setValue];
      }
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

  it("renders structured listings deterministically with above-budget delta and exact verification labels", () => {
    const content = buildAssistantReply({
      reply: "Hallucinated ₱1,000 palace [click](https://evil.example)",
      listings: {
        matches: [
          { id: "m1", unitId: "u1", title: "Mandaue Room", area: "Mandaue", monthlyPricePHP: 9000, propertyType: "room", verificationStatus: "property_verified", overBudgetPHP: 0 },
          { id: "m2", unitId: null, title: "Lahug Bed", area: "Cebu City", monthlyPricePHP: 8000, propertyType: "room", verificationStatus: "identity_verified", overBudgetPHP: 0 },
        ],
        alternatives: [
          { id: "a1", unitId: null, title: "IT Park Room", area: "Cebu City", monthlyPricePHP: 10001, propertyType: "room", verificationStatus: "unverified", overBudgetPHP: 1 },
        ],
        complete: false,
      },
    });
    expect(content).toBeTruthy();
    expect(content).not.toContain("Hallucinated");
    expect(content).not.toContain("https://evil.example");
    expect(content!.indexOf("Mandaue Room")).toBeLessThan(content!.indexOf("Above your budget"));
    expect(content).toContain("Mandaue Room — Mandaue · ₱9,000/mo · Verified property");
    expect(content).toContain("Lahug Bed — Cebu City · ₱8,000/mo");
    expect(content).not.toContain("Lahug Bed — Cebu City · ₱8,000/mo · Verified");
    expect(content).toContain("IT Park Room — Cebu City · ₱10,001/mo (₱1 over budget)");
    expect(content).not.toContain("IT Park Room — Cebu City · ₱10,001/mo (₱1 over budget) · Verified");
    expect(content).toContain("Some listings could not be checked; results may be incomplete.");
    expect(buildAssistantReply({ reply: "General Cebu rental reply" })).toBe("General Cebu rental reply");

    assistantTestState.enabled = true;
    assistantTestState.hookIndex = 0;
    assistantTestState.messages = [
      { role: "user", content: "list rooms under 10k" },
      { role: "assistant", content: content! },
    ];
    let html: string;
    try {
      html = render(<FinderAssistant open onOpenChange={() => undefined} onSearch={() => undefined} onFilters={() => undefined} onControlsTargetChange={() => undefined} />);
    } finally {
      assistantTestState.enabled = false;
      assistantTestState.messages = null;
    }
    expect(html.indexOf("Mandaue Room")).toBeLessThan(html.indexOf("Above your budget"));
    expect(html).toContain("₱1 over budget");
    expect(html).toContain("Verified property");
    expect(html).not.toContain("<a ");
  });

  it("renders empty-match headers when only alternatives exist and passes through clarify/unavailable replies when listings are empty", () => {
    const alt = { id: "a1", unitId: null, title: "IT Park Room", area: "Cebu City", monthlyPricePHP: 11000, propertyType: "room", verificationStatus: "unverified", overBudgetPHP: 1000 };

    expect(buildAssistantReply({
      reply: "Hallucinated fallback",
      listings: { matches: [], alternatives: [alt], complete: true },
    })).toBe("I could not find a matching rental in the current listings.\n\nAbove your budget:\n- IT Park Room — Cebu City · ₱11,000/mo (₱1,000 over budget)");

    expect(buildAssistantReply({
      reply: "Hallucinated incomplete fallback",
      listings: { matches: [], alternatives: [alt], complete: false },
    })).toBe("No matching rentals were found in the listings checked so far.\n\nAbove your budget:\n- IT Park Room — Cebu City · ₱11,000/mo (₱1,000 over budget)\n\nSome listings could not be checked; results may be incomplete.");

    expect(buildAssistantReply({
      reply: "Which Cebu area should I search?",
      listings: { matches: [], alternatives: [], complete: true },
    })).toBe("Which Cebu area should I search?");

    expect(buildAssistantReply({
      reply: "Live rental listings are temporarily unavailable, so I cannot check current properties right now. Please try again in a moment.",
      listings: { matches: [], alternatives: [], complete: false },
    })).toBe("Live rental listings are temporarily unavailable, so I cannot check current properties right now. Please try again in a moment.");
  });
});
