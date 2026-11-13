import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("not-found page", () => {
  it("links visitors to the map without a restricted dashboard link", () => {
    const html = renderToStaticMarkup(<NotFound />);
    expect(html).toContain('href="/"');
    expect(html).toContain("Explore Map");
    expect(html).not.toContain('href="/admin/dashboard"');
  });
});
