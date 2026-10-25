import { test, expect } from "./fixtures";

test("mobile map controls stay compact and attribution can expand", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 800 });
  await page.goto("/");
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom in", exact: true })).toBeHidden();
  const locate = page.getByRole("button", { name: "Locate me", exact: true });
  await expect(locate).toBeVisible();
  const attribution = page.locator(".maplibregl-ctrl-attrib");
  await expect(attribution).toHaveClass(/maplibregl-compact/);
  await page.locator(".maplibregl-ctrl-attrib-button").click();
  await expect(page.getByRole("link", { name: "OpenFreeMap", exact: true })).toBeVisible();
  await page.getByRole("slider", { name: "Adjust results sheet" }).press("End");
  await expect(locate).toBeHidden();
});
