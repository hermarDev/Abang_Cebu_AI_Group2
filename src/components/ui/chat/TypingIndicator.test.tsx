import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TypingIndicator } from "./TypingIndicator";

describe("TypingIndicator", () => {
  it("renders with default user name", () => {
    const html = renderToStaticMarkup(<TypingIndicator />);
    expect(html).toContain("Someone is typing…");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-label="Someone is typing"');
  });

  it("renders with custom user name", () => {
    const html = renderToStaticMarkup(<TypingIndicator userName="Maria Santos" />);
    expect(html).toContain("Maria Santos is typing…");
    expect(html).toContain('aria-label="Maria Santos is typing"');
  });

  it("renders three animated dots", () => {
    const html = renderToStaticMarkup(<TypingIndicator />);
    // Three <i> elements for the dots
    const iCount = (html.match(/<i>/g) || []).length;
    expect(iCount).toBe(3);
  });

  it("applies correct CSS classes", () => {
    const html = renderToStaticMarkup(<TypingIndicator />);
    expect(html).toContain("dots");
    expect(html).toContain("label");
    expect(html).toContain("container");
  });
});