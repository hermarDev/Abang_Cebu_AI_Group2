import { test, expect } from "./fixtures";

test("mobile listings peek is readable and actionable", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Show listings (0)", exact: true });
  await expect(trigger).toBeVisible();
  const box = await trigger.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.y + box!.height).toBeLessThanOrEqual(932);
  await trigger.click();
  const back = page.getByRole("button", { name: "Back to map", exact: true });
  await expect(back).toBeVisible();
  await back.click();
  await expect(trigger).toBeVisible();
});

test("short-screen empty results actions remain reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await page.getByRole("button", { name: "Show listings (0)", exact: true }).click();
  const expand = page.getByRole("button", { name: /Expand search/i });
  await expand.scrollIntoViewIfNeeded();
  await expand.click({ trial: true });
  const box = await expand.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(568);
});

test("account handoff returns keyboard focus to the stable menu trigger", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open menu" });
  await trigger.click();
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("navigation places appearance after support", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open menu" });
  await trigger.click();
  const appearance = page.getByRole("group", { name: "Appearance", exact: true });
  await expect(appearance).toBeVisible();
  await expect(appearance.getByRole("radio", { name: "System", exact: true })).toBeVisible();
  const support = await page.getByRole("link", { name: "Contact support" }).boundingBox();
  const settings = await appearance.boundingBox();
  expect(settings!.y).toBeGreaterThan(support!.y);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
