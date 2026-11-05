import { test, expect } from "./fixtures";

for (const theme of ["light", "dark"] as const) {
  test(`registration role selection is distinct in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.addInitScript(value => localStorage.setItem("abangcebu-theme", value), theme);
    await page.goto("/");
    await page.getByRole("button", { name: "Open account dialog" }).click();
    const dialog = page.getByRole("dialog", { name: "Account access" });
    await dialog.getByRole("button", { name: "Register", exact: true }).click();
    const renter = dialog.getByRole("radio", { name: /Renter/ });
    const landlord = dialog.getByRole("radio", { name: /Landlord/ });
    await expect(renter).toBeChecked();
    await expect(renter.locator("svg.lucide-check")).toHaveCount(0);
    await expect(landlord.locator("svg.lucide-check")).toHaveCount(0);
    expect(await renter.evaluate(e => getComputedStyle(e).backgroundColor)).not.toBe(await landlord.evaluate(e => getComputedStyle(e).backgroundColor));
    await renter.focus();
    await page.keyboard.press("ArrowRight");
    await expect(landlord).toBeFocused();
    await page.keyboard.press("Space");
    await expect(landlord).toBeChecked();
    await expect(landlord.locator("svg.lucide-check")).toHaveCount(0);
    await expect(renter.locator("svg.lucide-check")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Register as Landlord" })).toBeVisible();
  });
}
