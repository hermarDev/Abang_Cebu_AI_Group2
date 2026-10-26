import { test, expect } from "./fixtures";

for (const width of [320, 430, 1440]) {
  test(`listings panel actions stay synchronized at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    if (width < 1024) await page.getByRole("slider", { name: "Adjust results sheet" }).press("End");
    const panel = page.getByRole("complementary", { name: "Rental listings" });
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "Expand search", exact: true }).click();
    await expect(panel.getByText("Search area: 5 km radius", { exact: true })).toBeVisible();
    await panel.getByRole("button", { name: "Use sample data", exact: true }).click();
    await expect(panel.getByText("Sample data is on", { exact: true })).toBeVisible();
    await panel.getByRole("button", { name: "Return to live data", exact: true }).click();
    await expect(panel.getByText("Sample data is on", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width >= 1024) {
      const openPanelBox = await panel.boundingBox();
      await panel.getByRole("button", { name: "Collapse listings", exact: true }).click();
      await expect(panel).toBeHidden();
      const reopen = page.getByRole("button", { name: "Show listings", exact: true });
      const closedButtonBox = await reopen.boundingBox();
      expect(openPanelBox).not.toBeNull();
      expect(closedButtonBox).not.toBeNull();
      expect(Math.abs(closedButtonBox!.y - openPanelBox!.y)).toBeLessThanOrEqual(1);
      await reopen.click();
      await expect(panel).toBeVisible();
      await expect(panel.getByText("Search area: 5 km radius", { exact: true })).toBeVisible();
    }
  });
}
