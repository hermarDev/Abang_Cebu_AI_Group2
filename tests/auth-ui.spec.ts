import { test, expect } from "./fixtures";

for (const width of [320, 430, 1280]) {
  for (const theme of ["light", "dark"] as const) {
    test(`authentication stays bounded and consistent at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      await page.addInitScript(value => localStorage.setItem("abangcebu-theme", value), theme);
      await page.goto("/");
      await page.getByRole("button", { name: "Open account dialog" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByLabel("Email Address", { exact: true })).toBeVisible();
      await expect(dialog.getByRole("radio", { name: /Renter/ })).toHaveCount(0);
      await expect(dialog.locator("svg.lucide-mail")).toHaveCount(1);
      await expect(dialog.locator("svg.lucide-lock-keyhole")).toHaveCount(1);
      for (const input of await dialog.locator("input").all()) {
        expect(await input.evaluate(e => parseFloat(getComputedStyle(e).paddingLeft))).toBeGreaterThanOrEqual(40);
      }
      const initial = await dialog.boundingBox();
      await dialog.getByLabel("Password", { exact: true }).fill("Example-password1");
      await dialog.getByRole("button", { name: "Show password", exact: true }).click();
      await expect(dialog.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
      await dialog.getByRole("button", { name: "Hide password", exact: true }).click();
      await expect(dialog.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
      await dialog.getByRole("button", { name: "Register", exact: true }).click();
      await expect(dialog.getByRole("radio", { name: /Renter/ })).toBeVisible();
      await expect(dialog.getByRole("radio", { name: /Landlord/ })).toBeVisible();
      await expect(dialog.getByLabel("Full Name", { exact: true })).toBeVisible();
      await expect(dialog.locator('input[type="password"]')).toHaveCount(1);
      await expect(dialog.locator('input[type="tel"]')).toHaveCount(0);
      const register = await dialog.boundingBox();
      expect(register!.height).toBeCloseTo(initial!.height, 0);
      expect(register!.width).toBeCloseTo(initial!.width, 0);
      await dialog.getByRole("button", { name: /Log in/i, exact: true }).first().click();
      await dialog.getByRole("button", { name: "Forgot password?" }).click();
      await expect(dialog.getByLabel("Email Address", { exact: true })).toBeVisible();
      const reset = await dialog.boundingBox();
      expect(reset!.height).toBeCloseTo(initial!.height, 0);
      expect(reset!.width).toBeCloseTo(initial!.width, 0);
      await page.setViewportSize({ width, height: 420 });
      const short = await dialog.boundingBox();
      expect(short!.y).toBeGreaterThanOrEqual(0);
      expect(short!.y + short!.height).toBeLessThanOrEqual(420);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    });
  }
}
