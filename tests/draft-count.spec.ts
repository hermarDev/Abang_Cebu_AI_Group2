import { test, expect } from "./fixtures";

for (const viewport of [{ width: 1440, height: 900 }, { width: 360, height: 800 }, { width: 430, height: 932 }]) {
test(`draft count and marker selection at ${viewport.width}px`, async ({ page }) => {
  await page.setViewportSize(viewport);
  const base = { locality: "Cebu City", coordinates: [123.8854, 10.3157], type: "studio", propertyType: "studio", basis: "room", amenities: [], description: "Synthetic test record", area: 0, tone: "blue", available: true, distanceMeters: null };
  await page.route("**/api/rentals*", (route) => route.fulfill({ json: { rentals: [
    { ...base, id: "draft-cheap", title: "Synthetic affordable studio", price: 4000 },
    { ...base, id: "draft-costly", title: "Synthetic premium studio", price: 9000 },
  ] } }));
  await page.goto("/");
  await expect(page.getByText("2 listings found", { exact: true })).toBeVisible();
  const marker = page.locator('.rental-map-marker');
  await expect(marker).toHaveCount(1);
  await expect(marker).toHaveAttribute("aria-pressed", "false");
  if (viewport.width < 1024) {
    await page.getByRole("slider").focus();
    await page.keyboard.press("ArrowUp");
  }
  await page.getByRole("button", { name: "Synthetic affordable studio", exact: true }).click();
  await expect(marker).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Synthetic affordable studio", exact: true })).toHaveAttribute("aria-pressed", "true");
  if (viewport.width < 1024) {
    await page.getByRole("slider").focus();
    await page.keyboard.press("ArrowDown");
  }
  await marker.click();
  const premiumOption = page.getByRole("option", { name: /Synthetic premium studio/ });
  await expect(premiumOption).toBeVisible();
  const affordableOption = page.getByRole("option", { name: /Synthetic affordable studio/ });
  await expect(affordableOption).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(premiumOption).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox", { name: "Choose a rental" })).toHaveCount(0);
  await expect(marker).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(affordableOption).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(premiumOption).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox", { name: "Choose a rental" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Synthetic premium studio", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Synthetic affordable studio", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(marker).toHaveAttribute("aria-pressed", "true");
  const trigger = page.getByRole("button", { name: /^Filters/ });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Filters" });
  await expect(dialog.getByRole("button", { name: "Show 2 rentals", exact: true })).toBeVisible();
  await dialog.getByLabel("Maximum monthly budget (₱)").fill("5000");
  await expect(dialog.getByRole("button", { name: "Show 1 rentals", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("2 listings found", { exact: true })).toBeVisible();
  await expect(marker).toHaveAttribute("aria-pressed", "true");
  await trigger.click();
  await expect(dialog.getByRole("button", { name: "Show 2 rentals", exact: true })).toBeVisible();
  await dialog.getByLabel("Maximum monthly budget (₱)").fill("5000");
  await dialog.getByRole("button", { name: "Show 1 rentals", exact: true }).click();
  await expect(page.getByText("1 listing found", { exact: true })).toBeVisible();
});
}
