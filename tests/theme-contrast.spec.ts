import { test, expect } from "./fixtures";

test("light and dark semantic theme foregrounds meet WCAG AA", async ({ page }) => {
  await page.goto("/");
  const ratios = await page.evaluate(() => {
    const root = document.documentElement;
    const parseColor = (input: string) => {
      const value = input.trim();
      const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
      if (hex) {
        const digits = hex[1].length === 3 ? [...hex[1]].map((channel) => channel.repeat(2)).join("") : hex[1];
        return [0, 2, 4].map((offset) => Number.parseInt(digits.slice(offset, offset + 2), 16));
      }
      const rgb = value.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i);
      if (rgb) return rgb.slice(1, 4).map(Number);
      throw new Error(`Unsupported theme color token: ${value}`);
    };
    const luminance = (color: string) => {
      const channels = parseColor(color).map((channel) => channel / 255).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const contrast = (foreground: string, background: string) => {
      const levels = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
      return (levels[0] + 0.05) / (levels[1] + 0.05);
    };
    const sample = () => {
      const vars = getComputedStyle(root);
      return [
        ["--foreground", "--background"], ["--card-foreground", "--card"],
        ["--popover-foreground", "--popover"], ["--muted-foreground", "--muted"],
      ].map(([fg, bg]) => contrast(vars.getPropertyValue(fg), vars.getPropertyValue(bg)));
    };
    root.classList.remove("dark");
    root.classList.add("light");
    const light = sample();
    root.classList.remove("light");
    root.classList.add("dark");
    const dark = sample();
    return { light, dark };
  });
  for (const ratio of [...ratios.light, ...ratios.dark]) expect(ratio).toBeGreaterThanOrEqual(4.5);
});

test("dark theme retains visible labels, controls, and muted text on finder surfaces", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  const app = page.locator("main");
  const surfaceStyles = await app.evaluate((element) => ({
    color: getComputedStyle(element).color,
    background: getComputedStyle(element).backgroundColor,
  }));
  expect(surfaceStyles.color).not.toBe("rgb(71, 85, 105)");

  await page.getByRole("button", { name: "Open account dialog" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const inputStyles = await dialog.getByRole("textbox", { name: "Email Address", exact: true }).evaluate((element) => ({
    color: getComputedStyle(element).color,
    background: getComputedStyle(element).backgroundColor,
  }));
  expect(inputStyles.color).not.toBe("rgb(24, 52, 77)");
  await page.keyboard.press("Escape");
});
