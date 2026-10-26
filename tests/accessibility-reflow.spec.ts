import { test, expect } from "./fixtures";

for (const viewport of [{ width: 360, height: 800 }, { width: 430, height: 932 }]) {
  test(`reduced-motion and dark account reflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => localStorage.setItem("abangcebu-theme", "dark"));
    await page.goto("/login");
    await expect(page.locator("main")).toHaveAttribute("data-theme", "dark");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const theme = await dialog.evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
      token: getComputedStyle(document.documentElement).getPropertyValue("--card").trim(),
      font: getComputedStyle(element).fontFamily,
      bodyFont: getComputedStyle(document.body).fontFamily,
    }));
    expect(theme.background).not.toBe("rgb(255, 255, 255)");
    expect(theme.token).toBeTruthy();
    expect(theme.font).toBe(theme.bodyFont);
    await page.evaluate(() => document.documentElement.style.fontSize = "200%");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(dialog.getByRole("textbox", { name: "Email Address", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  });
}
