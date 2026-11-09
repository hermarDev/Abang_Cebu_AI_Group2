import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("renders nothing when totalPages <= 1", () => {
    const html = renderToStaticMarkup(<Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(html).toBe("");
  });

  it("renders navigation with 44px touch targets and accessible labels", () => {
    const html = renderToStaticMarkup(
      <Pagination currentPage={2} totalPages={5} totalItems={50} pageSize={10} onPageChange={vi.fn()} />
    );

    expect(html).toContain('aria-label="Pagination"');
    expect(html).toContain('aria-label="Previous page"');
    expect(html).toContain('aria-label="Next page"');
    expect(html).toContain("min-h-11 min-w-11");
    expect(html).toContain('aria-label="Page 2"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Showing 11–20 of 50");
  });

  it("disables Prev on first page and Next on last page", () => {
    const firstPageHtml = renderToStaticMarkup(<Pagination currentPage={1} totalPages={3} onPageChange={vi.fn()} />);
    expect(firstPageHtml).toContain('aria-label="Previous page" disabled=""');
    expect(firstPageHtml).not.toContain('aria-label="Next page" disabled=""');

    const lastPageHtml = renderToStaticMarkup(<Pagination currentPage={3} totalPages={3} onPageChange={vi.fn()} />);
    expect(lastPageHtml).not.toContain('aria-label="Previous page" disabled=""');
    expect(lastPageHtml).toContain('aria-label="Next page" disabled=""');
  });

  it("renders ellipsis for large page count", () => {
    const html = renderToStaticMarkup(<Pagination currentPage={5} totalPages={10} onPageChange={vi.fn()} />);
    expect(html).toContain("…");
    expect(html).toContain('aria-label="Page 1"');
    expect(html).toContain('aria-label="Page 10"');
  });
});
