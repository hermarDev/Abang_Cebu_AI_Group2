import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

function themeTokens(selector: string, systemDark = false) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  if (!match) throw new Error(`Missing theme selector: ${selector}`);
  const declarations = [...match[1].matchAll(/--([\w-]+):\s*([^;]+)\s*;/g)];
  const tokens = Object.fromEntries(declarations.map(([, key, value]) => [key, value.trim()]));
  if (systemDark) {
    const mediaBlock = css.match(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{[\s\S]*?\n\s*:root:not\(\.light\)\s*\{([^}]+)\}/);
    if (!mediaBlock) throw new Error("Missing system-dark theme tokens");
    for (const [, key, value] of mediaBlock[1].matchAll(/--([\w-]+):\s*([^;]+)\s*;/g)) {
      tokens[key] = value.trim();
    }
  }
  return tokens;
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
  ["accent-foreground", "accent-hover"],
] as const;

const pairs = [
  ["action", "action-foreground"],
  ["primary", "primary-foreground"],
  ["accent", "accent-foreground"],
  ["accent-hover", "accent-foreground"],
  ["destructive", "destructive-foreground"],
  ["destructive-hover", "destructive-hover-foreground"],
  ["background", "destructive"],
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
  it("uses a semantic modal backdrop token for every theme", () => {
    expect(css).not.toContain("--modal-backdrop: initial");
    for (const selector of [":root", ".dark", ":root:not(.light)"]) {
      expect(themeTokens(selector)["modal-backdrop"]).toBeDefined();
    }
  });

  it.each(themes.flatMap((theme) => boundaryPairs.map(([boundary, surface]) => ({ theme, boundary, surface }))))(
    "passes WCAG AA non-text contrast for $theme.name $boundary/$surface boundaries",
    ({ theme, boundary, surface }) => {
      const tokens = themeTokens(theme.selector);
      expect(tokens[boundary]).toBeDefined();
      expect(tokens[surface]).toBeDefined();
      expect(contrastRatio(tokens[boundary], tokens[surface])).toBeGreaterThanOrEqual(3);
    },
  );

  it("uses the light root token block and merges system-dark overrides", () => {
    expect(themeTokens(":root").input).toBe("#83734e");
    expect(themeTokens(".dark").input).toBe("#518ec3");
    expect(themeTokens(":root:not(.light)", true).input).toBe("#518ec3");
    expect(themeTokens(":root:not(.light)", true)["accent-hover"]).toBe("#134e4a");
  });

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
