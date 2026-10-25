import { test, expect } from "./fixtures";

for (const width of [360, 430]) {
  test(`inventory failure recovers without sample offers at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 932 });
    let failed = true;
    await page.route("**/api/rentals*", (route) => failed
      ? route.fulfill({ status: 503, json: { error: "Service unavailable" } })
      : route.fulfill({ json: { rentals: [] } }));
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Listings unavailable", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Use sample data" })).toHaveCount(0);
    const handle = page.getByRole("slider");
    await handle.focus();
    await page.keyboard.press("ArrowUp");
    failed = false;
    await page.getByRole("button", { name: /retry|try again/i }).click();
    await expect(page.getByText("0 listings found", { exact: true })).toBeVisible();
    await expect(page.getByText("Listings unavailable", { exact: true })).toHaveCount(0);
  });
}
