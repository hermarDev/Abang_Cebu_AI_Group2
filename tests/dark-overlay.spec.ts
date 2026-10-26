import { test, expect } from "./fixtures";

for (const width of [430, 1440]) {
  test(`navigation and auth use a dark scrim at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 932 });
    await page.addInitScript(() => localStorage.setItem("abangcebu-theme", "dark"));
    await page.goto("/");
    const assertScrim = async () => {
      const overlay = page.locator('[data-slot="dialog-overlay"]');
      await expect(overlay).toBeVisible();
      await expect(overlay).toHaveCSS("background-color", /^(rgba\(0, 0, 0, 0\.5\)|oklab\(0 0 0 \/ 0\.5\))$/);
    };
    await page.getByRole("button", { name: "Open menu" }).click();
    await assertScrim();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Open account dialog" }).click();
    await assertScrim();
    const dialog = page.getByRole("dialog", { name: "Account access" });
    await dialog.getByRole("button", { name: "Register", exact: true }).click();
    await assertScrim();
    await dialog.getByRole("button", { name: "Log in", exact: true }).first().click();
    await dialog.getByRole("button", { name: "Forgot password?" }).click();
    await assertScrim();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
  });
}
