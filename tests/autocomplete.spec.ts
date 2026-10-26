import { test, expect } from "./fixtures";

test("autocomplete waits for a pause, caches repeats, and cancels cleared queries", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => { if (request.url().includes("/api/places?")) requests.push(new URL(request.url()).searchParams.get("q")!); });
  await page.goto("/");
  const input = page.getByRole("combobox", { name: "Search places" });
  await input.pressSequentially("Cebu IT Park", { delay: 30 });
  expect(requests).toHaveLength(0);
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toBe("Cebu IT Park");
  await page.getByRole("button", { name: "Clear search" }).click();
  await input.fill("Cebu IT Park");
  await page.waitForTimeout(800);
  expect(requests).toHaveLength(1);
  await input.fill("Mandaue");
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.waitForTimeout(800);
  expect(requests).toHaveLength(1);
});

test("explicit search bypasses debounce without duplicate and Escape cancels", async ({ page }) => {
  let count = 0;
  page.on("request", request => { if (request.url().includes("/api/places?")) count++; });
  await page.goto("/");
  const input = page.getByRole("combobox", { name: "Search places" });
  await input.fill("Cebu");
  await input.press("Enter");
  await expect.poll(() => count).toBe(1);
  await page.waitForTimeout(800);
  expect(count).toBe(1);
  await input.fill("Mandaue");
  await input.press("Escape");
  await page.waitForTimeout(800);
  expect(count).toBe(1);
});
