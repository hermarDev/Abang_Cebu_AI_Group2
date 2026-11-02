import { test, expect } from "./fixtures";

test("rental popup uses the dark card surface", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => localStorage.setItem("abangcebu-theme", "dark"));
  await page.route("**/api/rentals*", (route) => route.fulfill({ json: { rentals: [{
    id: "popup-rental", title: "Synthetic popup rental", locality: "Cebu City", coordinates: [123.8854, 10.3157], type: "studio", propertyType: "studio", basis: "room", amenities: [], description: "Synthetic test record", area: 0, tone: "blue", available: true, distanceMeters: null, price: 4000,
  }] } }));
  await page.goto("/");
  await page.evaluate(() => { document.documentElement.classList.add("dark"); });
  const marker = page.locator(".rental-map-marker");
  await expect(marker).toHaveCount(1);
  await marker.click();
  const popup = page.locator(".maplibregl-popup-content");
  await expect(popup).toBeVisible();
  const colors = await popup.evaluate((element) => ({ background: getComputedStyle(element).backgroundColor, card: getComputedStyle(document.documentElement).getPropertyValue("--card").trim(), foreground: getComputedStyle(element).color }));
  const expected = await page.evaluate((card) => { const el = document.createElement("span"); el.style.backgroundColor = card; document.body.append(el); const value = getComputedStyle(el).backgroundColor; el.remove(); return value; }, colors.card);
  expect(colors.background).toBe(expected);
});
