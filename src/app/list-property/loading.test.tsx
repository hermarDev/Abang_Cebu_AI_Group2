import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ListPropertyLoading from "./loading";
import { ListPropertySkeleton } from "./ListPropertySkeleton";

describe("ListPropertyLoading", () => {
  const html = renderToStaticMarkup(<ListPropertyLoading />);

  it("is an accessible polite status region", () => {
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Loading property listing form…");
  });

  it("mirrors the workspace shell with Add property highlighted", () => {
    expect(html).toContain("Landlord workspace");
    expect(html).toContain("<aside");
    expect(html).toContain('data-skeleton="active-nav"');
    expect(html).toContain("lg:grid-cols-[248px_minmax(0,1fr)]");
  });

  it("renders a bounded stepper and step 1 skeleton without giant blocks", () => {
    expect(html).toContain("max-w-4xl");
    expect(html).toContain('data-skeleton="stepper"');
    expect(html).toContain('data-skeleton="step-1"');
    expect(html.match(/grid-cols-5/g)).toHaveLength(1);
    expect(html).not.toMatch(/h-(6[4-9]|[7-9]\d|\d{3})\b/);
    expect(html).toContain("motion-reduce:animate-none");
  });

  it("provides content-matched skeletons for all five wizard steps", () => {
    const step2 = renderToStaticMarkup(<ListPropertySkeleton step={1} />);
    expect(step2).toContain('data-skeleton="step-2"');
    expect(step2).toContain('data-skeleton="map-placeholder"');

    const step3 = renderToStaticMarkup(<ListPropertySkeleton step={2} />);
    expect(step3).toContain('data-skeleton="step-3"');
    expect(step3).toContain('data-skeleton="photo-upload"');
    expect(step3).toContain('data-skeleton="photo-previews"');

    const step4 = renderToStaticMarkup(<ListPropertySkeleton step={3} />);
    expect(step4).toContain('data-skeleton="step-4"');
    expect(step4).toContain('data-skeleton="document-upload"');
    expect(step4).toContain('data-skeleton="document-previews"');

    const step5 = renderToStaticMarkup(<ListPropertySkeleton step={4} />);
    expect(step5).toContain('data-skeleton="step-5"');
    expect(step5).toContain('data-skeleton="review-cards"');
    expect(step5).toContain('data-skeleton="listing-summary"');
    expect(step5).toContain('data-skeleton="review-photos"');
  });
});
