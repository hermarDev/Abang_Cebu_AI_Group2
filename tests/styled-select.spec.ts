import { test, expect } from "./fixtures";

for (const width of [430, 1440]) {
  test(`filter dropdowns are anchored and fully readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 568 });
    await page.goto("/");
    await page.getByRole("button", { name: /^Filters/ }).click();
    const dialog = page.getByRole("dialog", { name: "Filters" });
    // Exercise the actual Finder CSS cascade; never lower the dialog layer in this test.
    const modalLayer = await dialog.evaluate(el => Number(getComputedStyle(el).zIndex));
    for (const [label, section, option] of [["Bathroom", "Essentials", "Private"], ["Curfew", "Policies", "Conditional curfew"]]) {
      if (section) await dialog.locator("summary").filter({ hasText: section }).click();
      const trigger = dialog.getByRole("combobox", { name: label, exact: true });
      await trigger.scrollIntoViewIfNeeded();
      const anchor = await trigger.boundingBox();
      await trigger.click();
      const menu = page.getByRole("listbox");
      await expect(menu).toBeVisible();
      const popupLayer = await menu.evaluate(el => Number(getComputedStyle(el.closest('[data-select-layer]')!).zIndex));
      expect(popupLayer).toBeGreaterThan(modalLayer);
      for (const row of await menu.getByRole("option").all()) {
        expect(await row.evaluate(el => { const r = el.getBoundingClientRect(); return r.height >= 40 && el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
      }
      const item = page.getByRole("option", { name: option, exact: true });
      await expect(item).toBeVisible();
      const box = await menu.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(569);
      expect(Math.abs(box!.x - anchor!.x)).toBeLessThan(10);
      const hit = await item.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); });
      expect(hit).toBe(true);
      await item.click();
      await expect(trigger).toContainText(option);
      await expect(menu).toHaveCount(0);
    }
  });
}
