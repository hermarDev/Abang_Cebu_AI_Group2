import { test, expect } from "./fixtures";

test("inventory failure offers retry and recovers to genuine empty state", async ({ page }) => {
  let unavailable = true;
  await page.route("**/api/rentals", (route) => {
    return unavailable
      ? route.fulfill({ status: 503, json: { error: "Unavailable" } })
      : route.fulfill({ json: { rentals: [] } });
  });
  await page.goto("/");
  await expect(page.getByRole("alert").filter({ hasText: "Couldn’t load rentals" })).toBeVisible();
  unavailable = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("No rentals found", { exact: true })).toBeVisible();
});

test("desktop results and navigation reopen without remounting map or losing radius", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Filters/ }).click();
  const radius = page.getByRole("spinbutton", { name: "Search radius", exact: true });
  await radius.fill("5");
  await page.getByRole("button", { name: /^(Apply filters|Show \d+ rentals)$/ }).click();
  const canvas = page.locator("canvas.maplibregl-canvas");
  await expect(canvas).toBeVisible();
  const original = await canvas.elementHandle();
  await page.getByRole("button", { name: "Collapse listings", exact: true }).click();
  await page.getByRole("button", { name: "Show listings", exact: true }).click();
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.getByText("Search area: 5 km radius", { exact: true })).toBeVisible();
  expect(await canvas.evaluate((node, before) => node === before, original)).toBe(true);
  await expect(page.getByRole("button", { name: "Open menu", exact: true })).toBeFocused();
});
