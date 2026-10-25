import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import Home from "./page";

it("renders the map-first finder without claiming unavailable rentals are live", () => {
  const html = renderToStaticMarkup(<Home />);

  expect(html).toContain("AbangCebu");
  expect(html).toContain('aria-label="Budget, any maximum"');
  expect(html).toContain('aria-label="Property type, Any"');
  expect(html).toContain('aria-label="Rental listings"');
  expect(html).toContain("Loading rentals…");
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain('aria-label="Open account dialog"');
  expect(html).not.toContain('aria-label="Ask AbangCebu"');
  expect(html).toContain("Show listings");
  expect(html).toContain("Loading the interactive map…");
  expect(html).not.toContain("Garden room in Lahug");
});
