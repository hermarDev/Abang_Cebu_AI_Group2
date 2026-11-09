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
});
