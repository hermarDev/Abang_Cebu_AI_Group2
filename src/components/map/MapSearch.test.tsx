import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import MapSearch from "./MapSearch";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/map/MapSearch.tsx", "utf8");
const styles = readFileSync("src/components/map/MapSearch.module.css", "utf8");

it("renders an accessible place-search combobox and submit control", () => {
  const html = renderToStaticMarkup(<MapSearch onSelect={() => undefined} disabled={false} />);

  expect(html).toContain('role="combobox"');
  expect(html).toContain('aria-label="Search places"');
  expect(html).toContain('type="submit"');
  expect(html).toContain('placeholder="Search places or an address"');
  expect(html).not.toContain("Metro Cebu");
  expect(html).toContain("Search");
});

it("adds IME-safe keyboard controls, clearing, and retry for place lookup errors", () => {
  expect(source).toContain("onCompositionStart");
  expect(source).toContain("onCompositionEnd");
  expect(source).toContain("composingRef.current || event.nativeEvent.isComposing");
  expect(source).toContain("aria-expanded={showOptions}");
  expect(source).toContain("aria-activedescendant");
  expect(source).toContain('event.key === "Escape"');
  expect(source).toContain('event.key === "ArrowDown"');
  expect(source).toContain('event.key === "ArrowUp"');
  expect(source).toContain("onClick={() => void search(query)}");
  expect(source).toContain("No matching places in Cebu");
  expect(styles).toContain(".clearButton");
  expect(styles).toContain(".retryButton");
});

it("supports placement inside the finder header without its floating wrapper", () => {
  const html = renderToStaticMarkup(<MapSearch onSelect={() => undefined} disabled={false} className="header-place-search" />);
  expect(html).toContain('class="header-place-search"');
});
