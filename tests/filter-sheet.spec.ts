import { test, expect } from "./fixtures";

test("keeps search radius available in the filter drawer and applies edits only on Apply", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: /^Filters/ });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Filters" });
  const radius = dialog.getByRole("combobox", { name: "Search radius", exact: true });
  await expect(radius).toHaveValue("2");
  await radius.selectOption("5");
  await page.keyboard.press("Escape");
  await trigger.click();
  await expect(dialog.getByRole("combobox", { name: "Search radius", exact: true })).toHaveValue("2");
  await dialog.getByRole("combobox", { name: "Search radius", exact: true }).selectOption("5");
  await dialog.getByRole("button", { name: /^(Apply filters|Show \d+ rentals)$/ }).click();
  await expect(dialog).toBeHidden();
  await trigger.click();
  await expect(dialog.getByRole("combobox", { name: "Search radius", exact: true })).toHaveValue("5");
});

for (const viewport of [{ width: 360, height: 800 }, { width: 430, height: 932 }, { width: 1440, height: 900 }]) {
  test(`filter surface preserves drafts and reachable actions at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const trigger = page.getByRole("button", { name: /^Filters/ });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Filters" });
    const apply = dialog.getByRole("button", { name: /^(Apply filters|Show \d+ rentals)$/ });
    await expect(apply).toBeVisible();
    await apply.click({ trial: true });
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
    if (viewport.width < 640) expect(Math.abs(box!.y + box!.height - viewport.height)).toBeLessThanOrEqual(1);
    const propertyTypeSummary = dialog.locator("summary").filter({ hasText: "Property type" });
    await expect(dialog.getByLabel("Private room")).toBeHidden();
    await propertyTypeSummary.click();
    await expect(dialog.getByLabel("Private room")).toBeVisible();
    const minimum = dialog.getByLabel("Minimum monthly budget (₱)");
    const maximum = dialog.getByLabel("Maximum monthly budget (₱)");
    await minimum.fill("9000");
    await maximum.fill("5000");
    await expect(minimum).toHaveAttribute("aria-invalid", "true");
    await expect(apply).toBeDisabled();
    await page.keyboard.press("Escape");
    await trigger.click();
    await expect(minimum).toHaveValue("");
    await maximum.fill("5000");
    await apply.click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Budget, up to 5,000 pesos" })).toBeVisible();
    await trigger.click();
    await expect(maximum).toHaveValue("5000");
    await dialog.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(maximum).toHaveValue("");
    await apply.click();
    await expect(page.getByRole("button", { name: "Budget, any maximum" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
