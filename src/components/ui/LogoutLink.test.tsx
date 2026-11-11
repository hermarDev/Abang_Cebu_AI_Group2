import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LogoutLink } from "./LogoutLink";

describe("LogoutLink", () => {
  it("links to /auth/logout with a log-out icon and destructive, focusable styling", () => {
    const html = renderToStaticMarkup(<LogoutLink />);
    expect(html).toContain('href="/auth/logout"');
    expect(html).toContain("lucide-log-out");
    expect(html).toContain("Log out");
    expect(html).toContain("text-destructive");
    expect(html).toContain("hover:bg-destructive/10");
    expect(html).toContain("focus-visible:outline-2");
    expect(html).toContain("min-h-11");
  });

  it("merges a custom className", () => {
    const html = renderToStaticMarkup(<LogoutLink className="w-full" />);
    expect(html).toContain("w-full");
    expect(html).toContain("text-destructive");
  });
});
