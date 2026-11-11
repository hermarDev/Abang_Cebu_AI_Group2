import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandLogo, ChatbotAvatar, LogoMark } from "./index";

describe("Brand Components Suite", () => {
  it("renders BrandLogo with accessible role and title in auto theme", () => {
    const html = renderToStaticMarkup(<BrandLogo className="h-8 w-auto" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="AbangCebu"');
    expect(html).toContain("<title>AbangCebu</title>");
    expect(html).toContain('class="h-8 w-auto"');
    // In auto theme, both light and dark images are present with responsive utility classes
    expect(html).toContain("block dark:hidden");
    expect(html).toContain("hidden dark:block");
  });

  it("renders BrandLogo in explicit dark theme", () => {
    const html = renderToStaticMarkup(<BrandLogo theme="dark" />);
    expect(html).toContain('role="img"');
    expect(html).not.toContain("block dark:hidden");
    expect(html).toContain("<image");
  });

  it("renders BrandLogo in explicit light theme", () => {
    const html = renderToStaticMarkup(<BrandLogo theme="light" />);
    expect(html).toContain('role="img"');
    expect(html).not.toContain("hidden dark:block");
    expect(html).toContain("<image");
  });

  it("renders LogoMark with accessible role and title", () => {
    const html = renderToStaticMarkup(<LogoMark size={40} />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="AbangCebu Logo Mark"');
    expect(html).toContain('width="40"');
    expect(html).toContain('height="40"');
  });

  it("renders ChatbotAvatar with accessible role and title", () => {
    const html = renderToStaticMarkup(<ChatbotAvatar size={56} className="h-14 w-14" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="AbangCebu Rental Assistant"');
    expect(html).toContain('width="56"');
    expect(html).toContain('height="56"');
    expect(html).toContain('class="h-14 w-14"');
  });
});
