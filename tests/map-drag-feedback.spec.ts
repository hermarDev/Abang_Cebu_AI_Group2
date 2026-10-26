import { test, expect } from "./fixtures";

for (const width of [430, 1440]) {
  test(`map explains drag and pending radius search at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 932 });
    await page.goto("/");
    const canvas = page.locator("canvas.maplibregl-canvas");
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    const x = box!.x + box!.width * .8;
    const button = page.getByRole("button", { name: "Search this area", exact: true });
    for (let i = 0; i < 2; i++) {
      await page.mouse.move(x, 350);
      await page.mouse.down();
      await page.mouse.move(x - 90, 390, { steps: 8 });
      await expect(page.getByText("Move map to choose an area", { exact: true })).toBeVisible();
      await expect(page.locator('[data-map-drag-target]')).toBeVisible();
      await expect(button).toBeHidden();
      await page.mouse.up();
      await expect(page.getByText("Move map to choose an area", { exact: true })).toBeHidden();
      await expect(button).toBeVisible();
      await expect(button.locator("svg")).toHaveCount(1);
      await expect(button).toContainText("2 km radius");
      const buttonBox = await button.boundingBox();
      await page.mouse.click(buttonBox!.x + buttonBox!.width / 2, buttonBox!.y + buttonBox!.height / 2);
      await expect(button).toBeHidden();
      await page.waitForTimeout(1200); // Allow MapLibre drag inertia to finish before checking it stays applied.
      await expect(button).toBeHidden();
    }
  });
}
