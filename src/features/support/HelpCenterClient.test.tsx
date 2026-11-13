import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HelpCenterClient } from "./HelpCenterClient";
import { HELP_FAQ_CATEGORIES, HELP_FAQ_ITEMS } from "@/lib/support/constants";

describe("HelpCenterClient", () => {
  it("renders header with back link, backLabel, and Contact Support link to /support", () => {
    const html = renderToStaticMarkup(
      <HelpCenterClient backHref="/" backLabel="Back to map" />
    );

    expect(html).toContain('href="/"');
    expect(html).toContain("Back to map");
    expect(html).toContain('href="/support"');
    expect(html).toContain("Contact support");
  });

  it("contains no inline mailto links anywhere in the rendered markup", () => {
    const html = renderToStaticMarkup(
      <HelpCenterClient backHref="/" backLabel="Back to map" />
    );

    expect(html).not.toContain("mailto:");
  });

  it("renders searchable FAQ input with leading search icon, clear button markup, and aria-live polite count", () => {
    const html = renderToStaticMarkup(
      <HelpCenterClient backHref="/landlord/dashboard" backLabel="Back to workspace" />
    );

    expect(html).toContain('placeholder="Search guides, questions, or keywords…');
    expect(html).toContain('aria-label="Search help articles"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain(`${HELP_FAQ_ITEMS.length} articles`);
  });

  it("renders category filter chips from HELP_FAQ_CATEGORIES with aria-pressed state", () => {
    const html = renderToStaticMarkup(
      <HelpCenterClient backHref="/" backLabel="Back to map" />
    );

    for (const cat of HELP_FAQ_CATEGORIES) {
      expect(html).toContain(cat.label.replace(/&/g, "&amp;"));
    }

    // Default category 'all' should be pressed
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>All topics<\/button>/);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Finding rentals<\/button>/);
  });

  it("renders accessible accordion list with proper native aria attributes", () => {
    const html = renderToStaticMarkup(
      <HelpCenterClient backHref="/" backLabel="Back to map" />
    );

    for (const faq of HELP_FAQ_ITEMS) {
      const triggerId = `faq-trigger-${faq.id}`;
      const panelId = `faq-panel-${faq.id}`;

      expect(html).toContain(`id="${triggerId}"`);
      expect(html).toContain(`aria-controls="${panelId}"`);
      expect(html).toContain(`aria-expanded="false"`);
      expect(html).toContain(`id="${panelId}"`);
      expect(html).toContain(`aria-labelledby="${triggerId}"`);
      expect(html).toContain('role="region"');
      expect(html).toContain(faq.question);
    }
  });

  it("renders Expand all toggle button", () => {
    const html = renderToStaticMarkup(
      <HelpCenterClient backHref="/" backLabel="Back to map" />
    );

    expect(html).toContain("Expand all");
  });

  it("renders concise Quick Guidance cards for Renters and Landlords", () => {
    const html = renderToStaticMarkup(
      <HelpCenterClient backHref="/" backLabel="Back to map" />
    );

    expect(html).toContain("For Renters");
    expect(html).toContain("For Landlords");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/list-property"');
  });

  it("applies landlord mobile safe-area bottom clearance when isLandlordMobile is true", () => {
    const landlordHtml = renderToStaticMarkup(
      <HelpCenterClient
        backHref="/landlord/dashboard"
        backLabel="Back to workspace"
        userRole="landlord"
        isLandlordMobile={true}
      />
    );

    expect(landlordHtml).toContain("pb-[calc(5rem+env(safe-area-inset-bottom))]");

    const defaultHtml = renderToStaticMarkup(
      <HelpCenterClient backHref="/" backLabel="Back to map" isLandlordMobile={false} />
    );

    expect(defaultHtml).not.toContain("pb-[calc(5rem+env(safe-area-inset-bottom))]");
    expect(defaultHtml).toContain("pb-16");
  });
});
