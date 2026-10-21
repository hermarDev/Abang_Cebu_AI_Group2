import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

function themeTokens(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  if (!match) throw new Error(`Missing theme selector: ${selector}`);
  return Object.fromEntries([...match[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, key, value]) => [key, value]));
}

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

const boundaryPairs = [
  ["input", "card"],
  ["border", "background"],
  ["input", "background"],
] as const;

const pairs = [
  ["action", "action-foreground"],
  ["primary", "primary-foreground"],
  ["accent", "accent-foreground"],
  ["destructive", "destructive-foreground"],
  ["warning", "warning-foreground"],
  ["card", "card-foreground"],
  ["background", "foreground"],
  ["muted", "muted-foreground"],
] as const;

const themes = [
  { name: "light", selector: ":root" },
  { name: "dark", selector: ".dark" },
  { name: "system dark", selector: ":root:not(.light)" },
] as const;

describe("SCRUM-153 semantic theme token contrast", () => {
  it.each(themes.flatMap((theme) => boundaryPairs.map(([boundary, surface]) => ({ theme, boundary, surface }))))(
    "passes WCAG AA non-text contrast for $theme.name $boundary/$surface boundaries",
    ({ theme, boundary, surface }) => {
      const tokens = themeTokens(theme.selector);
      expect(tokens[boundary]).toBeDefined();
      expect(tokens[surface]).toBeDefined();
      expect(contrastRatio(tokens[boundary], tokens[surface])).toBeGreaterThanOrEqual(3);
    },
  );

  it.each(themes.flatMap((theme) => pairs.map(([background, foreground]) => ({ theme, background, foreground }))))(
    "passes WCAG AA normal-text contrast for $theme.name $background/$foreground",
    ({ theme, background, foreground }) => {
      const tokens = themeTokens(theme.selector);
      expect(tokens[background]).toBeDefined();
      expect(tokens[foreground]).toBeDefined();
      expect(contrastRatio(tokens[background], tokens[foreground])).toBeGreaterThanOrEqual(4.5);
    },
  );
});
