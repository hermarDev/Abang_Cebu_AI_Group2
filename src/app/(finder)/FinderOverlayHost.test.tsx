import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/",
  segment: null as string | null,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useSelectedLayoutSegment: () => mocks.segment,
}));

import { FinderOverlayHost } from "./FinderOverlayHost";

beforeEach(() => {
  mocks.pathname = "/";
  mocks.segment = null;
});

describe("FinderOverlayHost", () => {
  it("renders background map interactively on / even when slot reports __PAGE__", () => {
    mocks.pathname = "/";
    mocks.segment = "__PAGE__";
    const html = renderToStaticMarkup(
      <FinderOverlayHost overlay={<div>Overlay</div>}>
        <main>Map</main>
      </FinderOverlayHost>,
    );
    expect(html).toContain("<main>Map</main>");
    expect(html).not.toContain("data-finder-overlay");
    expect(html).not.toContain("aria-hidden");
    expect(html).not.toContain("inert");
  });

  it("renders background map interactively on /map when slot reports map", () => {
    mocks.pathname = "/map";
    mocks.segment = "map";
    const html = renderToStaticMarkup(
      <FinderOverlayHost overlay={<div>Overlay</div>}>
        <main>Map</main>
      </FinderOverlayHost>,
    );
    expect(html).not.toContain("data-finder-overlay");
    expect(html).not.toContain("inert");
  });

  it("keeps background map mounted but inert and hidden when overlay segment is active", () => {
    mocks.pathname = "/messages";
    mocks.segment = "(.)messages";
    const html = renderToStaticMarkup(
      <FinderOverlayHost overlay={<main>Messages</main>}>
        <main>Map</main>
      </FinderOverlayHost>,
    );
    expect(html).toContain("<main>Map</main>");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("inert");
    expect(html).toContain('data-finder-overlay="(.)messages"');
    expect(html).toContain("<main>Messages</main>");
  });
});
