import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Alert } from "./Alert";

describe("Alert", () => {
  it("defaults to the warning variant", () => {
    const html = renderToStaticMarkup(<Alert>Hi</Alert>);
    expect(html).toContain('data-variant="warning"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('data-slot="alert"');
    expect(html).toContain("border-warning/40 bg-warning/10");
  });

  it.each([
    ["error", "border-destructive/40 bg-destructive/10"],
    ["success", "border-emerald-500/30 bg-emerald-500/10"],
    ["info", "border-action/30 bg-action/10"],
  ] as const)("renders the %s variant", (variant, classes) => {
    const html = renderToStaticMarkup(<Alert variant={variant}>Hi</Alert>);
    expect(html).toContain(`data-variant="${variant}"`);
    expect(html).toContain(classes);
  });
});
