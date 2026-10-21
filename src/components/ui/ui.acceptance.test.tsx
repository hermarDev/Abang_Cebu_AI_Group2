import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button, Card, Input, Select } from "./index";

const contrastPairs = [
  { mode: "light", name: "primary CTA", background: "#047857", foreground: "#ffffff" },
  { mode: "light", name: "brand button", background: "#0f2742", foreground: "#ffffff" },
  { mode: "light", name: "accent and chip text", background: "#f0fdfc", foreground: "#0f766e" },
  { mode: "light", name: "muted card metadata", background: "#f3efe8", foreground: "#675a3e" },
  { mode: "light", name: "destructive button", background: "#e11d48", foreground: "#ffffff" },
  { mode: "light", name: "warning action", background: "#b45309", foreground: "#ffffff" },
  { mode: "dark", name: "primary CTA", background: "#10b981", foreground: "#022c22" },
  { mode: "dark", name: "brand button", background: "#518ec3", foreground: "#09182a" },
  { mode: "dark", name: "accent and chip text", background: "#115e59", foreground: "#99f6ee" },
  { mode: "dark", name: "muted card metadata", background: "#173b5f", foreground: "#b9d0e7" },
  { mode: "dark", name: "destructive button", background: "#fb7185", foreground: "#4c0519" },
  { mode: "dark", name: "warning action", background: "#fbbf24", foreground: "#451a03" },
];

function relativeLuminance(hex: string) {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(background: string, foreground: string) {
  const [lighter, darker] = [relativeLuminance(background), relativeLuminance(foreground)].sort(
    (left, right) => right - left,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

describe("SCRUM-153 UI acceptance", () => {
  it.each(contrastPairs)("passes AA normal-text contrast for $mode $name", ({ background, foreground }) => {
    expect(contrastRatio(background, foreground)).toBeGreaterThanOrEqual(4.5);
  });

  it("sizes buttons and form controls for the 44px pointer target guideline", () => {
    const markup = renderToStaticMarkup(
      <>
        <Button>Find rentals</Button>
        <Input aria-label="Location" />
        <Select aria-label="Bedrooms"><option value="studio">Studio</option></Select>
      </>,
    );

    for (const className of ["<button", "<input", "<select"]) {
      const start = markup.indexOf(className);
      const end = markup.indexOf(">", start);
      expect(markup.slice(start, end)).toContain("touch-target");
    }
  });

  it("styles shared cards exclusively with semantic theme classes", () => {
    const markup = renderToStaticMarkup(<Card>Rental search panel</Card>);

    expect(markup).toContain("border-border");
    expect(markup).toContain("bg-card");
    expect(markup).toContain("text-card-foreground");
    expect(markup).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
