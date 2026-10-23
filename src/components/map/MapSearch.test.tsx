import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import MapSearch from "./MapSearch";

it("renders an accessible place-search combobox and submit control", () => {
  const html = renderToStaticMarkup(<MapSearch onSelect={() => undefined} disabled={false} />);

  expect(html).toContain('role="combobox"');
  expect(html).toContain('aria-label="Search places"');
  expect(html).toContain('type="submit"');
  expect(html).toContain('placeholder="Search places or an address"');
  expect(html).not.toContain("Metro Cebu");
  expect(html).toContain("Search");
});

it("supports placement inside the finder header without its floating wrapper", () => {
  const html = renderToStaticMarkup(<MapSearch onSelect={() => undefined} disabled={false} className="header-place-search" />);
  expect(html).toContain('class="header-place-search"');
});
