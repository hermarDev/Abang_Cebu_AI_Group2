import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LandlordPropertiesLoading, { LandlordPropertiesSkeleton } from "./loading";

describe("LandlordPropertiesLoading & LandlordPropertiesSkeleton", () => {
  it("renders accessible loading container with status and polite announcement", () => {
    const html = renderToStaticMarkup(<LandlordPropertiesLoading />);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Loading properties"');
    expect(html).toContain("Loading properties…");
  });

  it("renders Area 1: Page Header, subtitle, and primary action button", () => {
    const html = renderToStaticMarkup(<LandlordPropertiesSkeleton />);

    // Area 1: Header block with title, subtitle, and Add property button
    expect(html).toContain('data-skeleton="header"');
    expect(html).toContain('data-skeleton="header-title"');
    expect(html).toContain('data-skeleton="header-subtitle"');
    expect(html).toContain('data-skeleton="header-action"');
  });

  it("renders Area 2: Filter navigation chips with divider", () => {
    const html = renderToStaticMarkup(<LandlordPropertiesSkeleton />);

    // Area 2: Filter chips (pills)
    expect(html).toContain('data-skeleton="filters"');
    expect(html).toContain('data-skeleton="filter-chip"');
    expect(html).toContain("border-b");
  });

  it("renders Area 3: exactly 2 realistic content-matched property card skeletons", () => {
    const html = renderToStaticMarkup(<LandlordPropertiesSkeleton />);

    // Area 3: Exactly 2 cards matching wireframe and real loaded layout
    const cardMatches = html.match(/data-skeleton="property-card"/g);
    expect(cardMatches).toHaveLength(2);

    // Each card must contain: thumbnail, title, status pill, address line, price line, and action buttons
    expect(html).toContain('data-skeleton="card-thumbnail"');
    expect(html).toContain('data-skeleton="card-title"');
    expect(html).toContain('data-skeleton="card-status"');
    expect(html).toContain('data-skeleton="card-address"');
    expect(html).toContain('data-skeleton="card-price"');
    expect(html).toContain('data-skeleton="card-actions"');
    expect(html).toContain('data-skeleton="card-action-btn"');
  });

  it("includes motion-reduce:animate-none for accessibility and reduced motion", () => {
    const html = renderToStaticMarkup(<LandlordPropertiesSkeleton />);

    expect(html).toContain("motion-reduce:animate-none");
  });
});
