import { test, expect } from "./fixtures";

for (const width of [430, 1440]) {
  test(`loading listing cards fill the content width at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 932 });
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/api/rentals", async route => {
      await pending;
      await route.fulfill({ json: { rentals: [] } });
    });
    try {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      if (width < 1024) await page.getByRole("slider", { name: "Adjust results sheet" }).press("End");
      const skeletons = page.getByTestId("rental-loading-skeletons");
      await expect(skeletons).toBeVisible();
      await expect(skeletons.locator(":scope > div")).toHaveCount(3);
      const geometry = await skeletons.evaluate(element => ({
        width: element.getBoundingClientRect().width,
        parentWidth: element.parentElement!.getBoundingClientRect().width,
        cardWidths: Array.from(element.children, child => child.getBoundingClientRect().width),
      }));
      expect(geometry.width).toBeGreaterThan(geometry.parentWidth * 0.9);
      for (const cardWidth of geometry.cardWidths) expect(cardWidth).toBeGreaterThan(geometry.width * 0.95);
      release();
      await expect(skeletons).toHaveCount(0);
      await expect(page.getByText("No rentals found", { exact: true })).toBeVisible();
    } finally {
      release();
    }
  });
}
