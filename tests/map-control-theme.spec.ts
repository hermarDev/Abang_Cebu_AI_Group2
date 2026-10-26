import { test, expect } from "./fixtures";

for (const width of [430, 1440]) {
  test(`search area control stays themed and clickable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 932 });
    await page.addInitScript(() => localStorage.setItem("abangcebu-theme", "dark"));
    await page.goto("/");
    const canvas = page.locator("canvas.maplibregl-canvas");
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    await page.mouse.move(box!.x + box!.width * .8, 350);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width * .8 - 100, 380, { steps: 8 });
    await page.mouse.up();
    const button = page.getByRole("button", { name: "Search this area", exact: true });
    await expect(button).toBeVisible();
    const style = await button.evaluate(el => {
      const s = getComputedStyle(el); const r = el.getBoundingClientRect();
      return { background: s.backgroundColor, height: r.height, hit: el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) };
    });
    expect(style.background).toBe("rgb(22, 30, 40)");
    expect(style.height).toBeGreaterThanOrEqual(44);
    expect(style.hit).toBe(true);
    if (width === 430) {
      const slider = page.getByRole("slider", { name: "Adjust results sheet" });
      await slider.press("ArrowUp");
      await expect(button).toBeVisible();
      await slider.press("End");
      await expect(button).toBeHidden();
      await slider.press("Home");
      await expect(button).toBeVisible();
    }
    await button.click();
    await expect(button).toBeHidden();
  });
}
