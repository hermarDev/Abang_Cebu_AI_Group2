import { test, expect } from "./fixtures";

for (const viewport of [
  { width: 320, height: 568 },
  { width: 320, height: 700 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 430, height: 932 },
]) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test("sheet pointer drag advances state and cancellation leaves it unchanged", async ({ page }) => {
      await page.goto("/");
      const slider = page.getByRole("slider", { name: "Adjust results sheet" });
      await expect(slider).toBeVisible();
      const box = await slider.boundingBox();
      expect(box).not.toBeNull();
      const x = box!.x + box!.width / 2;
      const y = box!.y + box!.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y - 60, { steps: 5 });
      await page.mouse.up();
      await expect(slider).toHaveAttribute("aria-valuetext", "half");
      const panel = page.getByRole("complementary", { name: "Rental listings" });
      const halfBox = await panel.boundingBox();
      const handle = await slider.boundingBox();
      const dragX = handle!.x + handle!.width / 2;
      const dragY = handle!.y + handle!.height / 2;
      await page.mouse.move(dragX, dragY);
      await page.mouse.down();
      await page.mouse.move(dragX, dragY + 60, { steps: 5 });
      await page.mouse.up();
      await expect(slider).toHaveAttribute("aria-valuetext", "collapsed");
      const collapsedBox = await panel.boundingBox();
      expect(collapsedBox!.height).toBeLessThanOrEqual(100);
      expect(collapsedBox!.y).toBeGreaterThan(halfBox!.y + 100);
      await slider.press("ArrowUp");
      const nextBox = await slider.boundingBox();
      expect(nextBox).not.toBeNull();
      await page.mouse.move(nextBox!.x + nextBox!.width / 2, nextBox!.y + nextBox!.height / 2);
      await page.mouse.down();
      await slider.dispatchEvent("pointercancel", { pointerId: 1 });
      await page.mouse.move(x, nextBox!.y - 60, { steps: 5 });
      await page.mouse.up();
      await expect(slider).toHaveAttribute("aria-valuetext", "half");
    });

    test("sheet slider supports keyboard state changes and bounds", async ({ page }) => {
      await page.goto("/");
      const slider = page.getByRole("slider", { name: "Adjust results sheet" });
      await slider.focus();
      for (const [key, value, state] of [
        ["End", "2", "expanded"],
        ["ArrowUp", "2", "expanded"],
        ["ArrowDown", "1", "half"],
        ["Home", "0", "collapsed"],
        ["ArrowDown", "0", "collapsed"],
        ["ArrowUp", "1", "half"],
      ]) {
        await slider.press(key);
        await expect(slider).toHaveAttribute("aria-valuenow", value);
        await expect(slider).toHaveAttribute("aria-valuetext", state);
        await expect(page.locator("main[data-sheet-position]")).toHaveAttribute("data-sheet-position", state);
      }
    });

    test("sheet states preserve viewport, controls and source credits", async ({ page }) => {
      await page.goto("/");
      const shell = page.locator("main[data-sheet-position]");
      const slider = page.getByRole("slider", { name: "Adjust results sheet" });
      for (const [key, state] of [
        ["Home", "collapsed"],
        ["ArrowUp", "half"],
        ["End", "expanded"],
      ]) {
        await slider.press(key);
        await expect(shell).toHaveAttribute("data-sheet-position", state);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        for (const control of state === "expanded" ? [] : ["Locate me"]) {
          const button = page.getByRole("button", { name: control, exact: true });
          await expect(button).toBeVisible();
          const box = await button.boundingBox();
          expect(box).not.toBeNull();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.y).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
          expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
          await button.click({ trial: true, position: { x: box!.width / 2, y: box!.height / 2 } });
        }
        if (state === "expanded") {
          await expect(page.getByRole("group", { name: "Rental search filters" })).toBeHidden();
          await expect(page.getByRole("button", { name: "Open rental assistant" })).toBeHidden();
        }
        if (state !== "expanded") {
          for (const target of [page.getByRole("button", { name: "Open menu", exact: true }), page.getByRole("button", { name: /^Filters/ })]) {
            await expect(target).toBeVisible();
            await target.click({ trial: true });
          }
        }
        const attributionToggle = page.locator(".maplibregl-ctrl-attrib-button");
        const attribution = page.locator("details.maplibregl-ctrl-attrib");
        if (!(await attribution.evaluate(e => e.hasAttribute("open")))) await attributionToggle.click();
        for (const credit of ["OpenFreeMap", "© OpenMapTiles", "© OpenStreetMap contributors"]) {
          const link = page.getByRole("link", { name: credit, exact: true });
          await expect(link).toHaveCount(1);
          await expect(link).toBeVisible();
        }
      }
    });
  });
}
