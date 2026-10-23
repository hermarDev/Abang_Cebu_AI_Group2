import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Card, CardTitle } from "./Card";
import { Input } from "./Input";
import { Select } from "./Select";
import { Skeleton } from "./Skeleton";
import { cn as uiCn } from "./cn";
import { cn as sharedCn } from "@/lib/utils";

const render = (node: React.ReactNode) => renderToStaticMarkup(node);

describe("UI primitives semantics", () => {
  it("reuses the canonical shared class-name utility", () => {
    expect(uiCn).toBe(sharedCn);
    expect(uiCn("px-2", "px-4")).toBe("px-4");
  });

  it("renders a named native button with a 44px minimum target and visible focus token", () => {
    const html = render(<Button aria-label="Save listing">Save</Button>);
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="Save listing"');
    expect(html).toContain("min-h-11");
    expect(html).toContain("min-w-11");
    expect(html).toContain("focus-visible:outline-ring");
  });

  it("preserves form input validation and accessible name attributes", () => {
    const html = render(<Input aria-label="Email address" aria-invalid="true" required />);
    expect(html).toContain('aria-label="Email address"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("aria-[invalid=true]:border-destructive");
  });

  it("renders a labelled native select with a 44px minimum target", () => {
    const html = render(<Select aria-label="Neighborhood"><option>Cebu City</option></Select>);
    expect(html).toContain('aria-label="Neighborhood"');
    expect(html).toContain("<option>Cebu City</option>");
    expect(html).toContain("min-h-11");
    expect(html).toContain("focus-visible:outline-ring");
  });

  it("keeps card headings semantic and uses semantic color tokens", () => {
    const html = render(<Card><CardTitle>Listing</CardTitle></Card>);
    expect(html).toContain("<h3");
    expect(html).toContain("bg-card");
    expect(html).toContain("text-card-foreground");
  });

  it("renders secondary badges with a high-contrast muted surface token", () => {
    const html = render(<Badge variant="secondary">Available</Badge>);
    expect(html).toContain("bg-muted");
    expect(html).toContain("text-foreground");
    expect(html).not.toContain("bg-secondary");
  });

  it("exposes a status badge and hides decorative skeletons from assistive technology", () => {
    const badge = render(<Badge variant="warning">Pending review</Badge>);
    const skeleton = render(<Skeleton className="h-4 w-full" />);
    expect(badge).toContain("bg-warning");
    expect(badge).toContain("Pending review");
    expect(skeleton).toContain('aria-hidden="true"');
    expect(skeleton).toContain("motion-reduce:animate-none");
  });
});
