import { test, expect } from "./fixtures";

for (const width of [320, 430, 768, 1024, 1440]) {
  test(`search suggestions stay readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.route("**/api/places*", route => route.fulfill({ json: { places: Array.from({ length: 8 }, (_, i) => ({ id: String(i), name: `Cebu place ${i}`, category: "Landmark", detail: "Cebu City, a long address for wrapping", coordinates: [123.9, 10.3] })) } }));
    await page.goto("/");
    await page.getByRole("combobox", { name: "Search places" }).fill("cebu");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const list = page.getByRole("listbox", { name: "Place search results" });
    await expect(list).toBeVisible();
    const box = await list.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(700);
    expect(await list.locator("..").evaluate(e => parseFloat(getComputedStyle(e).borderRadius))).toBeLessThanOrEqual(16);
    const first = list.getByRole("option").first();
    await expect(first).toBeInViewport();
    expect(await first.evaluate(e => { const r = e.getBoundingClientRect(); return e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
    await list.getByRole("option").last().scrollIntoViewIfNeeded();
    await expect(list.getByRole("option").last()).toBeInViewport();
    await page.getByRole("combobox", { name: "Search places" }).focus();
    await page.keyboard.press("Escape");
    await expect(list).toHaveCount(0);
  });
}
