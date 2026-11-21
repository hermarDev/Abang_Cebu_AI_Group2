import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FinderAssistant } from "./FinderAssistant";

const assistantSource = readFileSync("src/features/map/FinderAssistant.tsx", "utf8");
const shellSource = readFileSync("src/features/map/RestoredFinderShell.tsx", "utf8");
const shellCss = readFileSync("src/features/map/RestoredFinderShell.module.css", "utf8");

describe("FinderAssistant", () => {
  it("renders accessible region, log, close control, and composer markup when open", () => {
    const html = renderToStaticMarkup(
      <FinderAssistant
        open
        onOpenChange={() => undefined}
        onSearch={() => undefined}
        onFilters={() => undefined}
        onControlsTargetChange={() => undefined}
      />,
    );

    expect(html).toContain('aria-label="AbangCebu assistant"');
    expect(html).toContain('role="log"');
    expect(html).toContain('aria-label="Message the AbangCebu assistant"');
    expect(html).toContain('aria-label="Close chat"');
    expect(html).not.toContain("Jump to latest");
  });

  it("guards Enter submission during IME composition", () => {
    expect(assistantSource).toContain("onCompositionStart");
    expect(assistantSource).toContain("onCompositionEnd");
    expect(assistantSource).toContain("isComposing");
    expect(assistantSource).toContain("229");
  });

  it("preserves scroll position with a Jump to latest control and respects reduced motion", () => {
    expect(assistantSource).toContain("stickToBottomRef");
    expect(assistantSource).toContain("Jump to latest");
    expect(assistantSource).toContain("prefers-reduced-motion: reduce");
    expect(shellCss).toMatch(/\.chatJumpLatest\s*\{[^}]*position:\s*sticky;/);
  });

  it("supports Escape dismissal and mobile Tab focus wrapping", () => {
    expect(assistantSource).toContain('"Escape"');
    expect(assistantSource).toContain("(max-width: 1023px)");
  });

  it("restores focus when closing the assistant from RestoredFinderShell", () => {
    expect(shellSource).toContain("wasHelpOpenRef");
    expect(shellSource).toContain('button[aria-label="Open rental assistant"]');
  });
});
