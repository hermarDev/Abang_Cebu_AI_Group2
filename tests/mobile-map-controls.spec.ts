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
  const chat = await page.getByRole("button", { name: "Open rental assistant" }).boundingBox();
  const info = await page.locator(".maplibregl-ctrl-attrib-button").boundingBox();
  expect(chat!.width).toBe(56);
  const location = await locate.boundingBox();
  expect(Math.abs(location!.x + location!.width / 2 - info!.x - info!.width / 2)).toBeLessThanOrEqual(2);
  expect(location!.y - info!.y - info!.height).toBeGreaterThanOrEqual(12);
  await page.locator(".maplibregl-ctrl-attrib-button").click();
  await expect(page.getByRole("link", { name: "OpenFreeMap", exact: true })).toBeVisible();
  await page.getByRole("slider", { name: "Adjust results sheet" }).press("End");
  await expect(locate).toBeHidden();
});
