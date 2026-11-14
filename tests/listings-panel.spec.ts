import { test, expect } from "./fixtures";

for (const width of [320, 430, 1440]) {
  test(`listings panel actions stay synchronized at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    if (width < 1024) await page.getByRole("slider", { name: "Adjust results sheet" }).press("End");
    const panel = page.getByRole("complementary", { name: "Rental listings" });
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "Expand search", exact: true }).click();
    await expect(panel.getByText("Search area: 3 km radius", { exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Use sample data" })).toHaveCount(0);
    await panel.getByRole("button", { name: "Expand search", exact: true }).click();
    await expect(panel.getByText("Search area: 5 km radius", { exact: true })).toBeVisible();
    if (width >= 1024) {
      const collapse = panel.getByRole("button", { name: "Collapse listings", exact: true });
      const reopen = page.getByRole("button", { name: "Show listings" });
      const openPanelBox = await panel.boundingBox();
      await collapse.click();
      await expect(panel).toBeHidden();
      await expect(reopen).toBeVisible();
      const closedButtonBox = await reopen.boundingBox();
      expect(closedButtonBox).not.toBeNull();
      expect(openPanelBox).not.toBeNull();
      expect(Math.abs(closedButtonBox!.y - openPanelBox!.y)).toBeLessThanOrEqual(1);
      await reopen.click();
      await expect(panel).toBeVisible();
      await expect(panel.getByText("Search area: 5 km radius", { exact: true })).toBeVisible();
    }
  });
}
