import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandlordSubmissionsList } from "./LandlordSubmissionsList";

describe("LandlordSubmissionsList", () => {
  const items = Array.from({ length: 15 }, (_, i) => ({
    id: `prop-${i + 1}`,
    title: `Property ${i + 1}`,
    status: i % 2 === 0 ? "pending" : "approved",
  }));

  it("renders page 1 items and pagination when items exceed pageSize", () => {
    const html = renderToStaticMarkup(
      <LandlordSubmissionsList
        submissions={items}
        availableIds={["prop-2"]}
        feedback={{}}
        correctionTargets={{}}
        linkClass="test-link"
        pageSize={10}
      />
    );

    expect(html).toContain("Property 1");
    expect(html).toContain("Property 10");
    expect(html).not.toContain("Property 11");
    expect(html).toContain('aria-label="Pagination"');
    expect(html).toContain("Showing 1–10 of 15");
  });

  it("renders without pagination when items are within pageSize", () => {
    const html = renderToStaticMarkup(
      <LandlordSubmissionsList
        submissions={items.slice(0, 5)}
        availableIds={[]}
        feedback={{}}
        correctionTargets={{}}
        linkClass="test-link"
        pageSize={10}
      />
    );

    expect(html).toContain("Property 1");
    expect(html).toContain("Property 5");
    expect(html).not.toContain('aria-label="Pagination"');
  });

  it("renders location, property type and rent metadata", () => {
    const html = renderToStaticMarkup(
      <LandlordSubmissionsList
        submissions={[{ id: "p1", title: "Metro flat", status: "pending", street_address: "12 Colon St", city: "Cebu City", property_type: "apartment", monthly_rent: 12500 }]}
        availableIds={[]}
        feedback={{}}
        correctionTargets={{}}
        linkClass="test-link"
      />
    );
    expect(html).toContain("12 Colon St, Cebu City · apartment · ₱12,500/mo");
  });
});
