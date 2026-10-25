import { test, expect } from "./fixtures";

for (const width of [320, 375, 390, 430, 768, 1440]) {
  test(`sidebar fits ${width}px and hands off to existing assistant`, async ({ page }) => {
    await page.setViewportSize({ width, height: 668 });
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Open menu" });
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "AbangCebu Menu" });
    await expect(drawer.getByText("Find your next home in Cebu")).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Map", exact: true })).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Close dialog" })).toHaveCount(0);
    expect(await drawer.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
    await drawer.evaluate(e => Promise.all(e.getAnimations().map(animation => animation.finished)));
    const box = await drawer.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await drawer.getByRole("button", { name: "Help & FAQ" }).click();
    await expect(drawer.getByText("Use Budget, Property type, or Filters to narrow your search.")).toBeVisible();
    await drawer.getByRole("button", { name: "Help finding a rental" }).click();
    await expect(drawer).toHaveCount(0);
    const chat = page.getByRole("region", { name: "AbangCebu assistant" });
    await expect(chat).toHaveCount(1);
    await expect(chat.getByRole("button", { name: "Close chat" })).toBeFocused();
    await chat.getByRole("button", { name: "Close chat" }).click();
    await trigger.click();
    await drawer.getByRole("button", { name: "Map", exact: true }).click();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await trigger.click();
    await drawer.evaluate(e => Promise.all(e.getAnimations().map(animation => animation.finished)));
    await page.mouse.click(width - 8, 300);
    await expect(drawer).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

test("short drawer scroll keeps account and appearance reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const drawer = page.getByRole("dialog");
  for (const name of ["Saved rentals", "List your property", "Log in"]) {
    const action = drawer.getByRole("button", { name, exact: true });
    await action.scrollIntoViewIfNeeded();
    await action.click();
    await expect(page.getByRole("dialog", { name: "Account access" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Open menu" }).click();
  }
  await drawer.getByRole("radio", { name: "Dark", exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute("data-theme", "dark");
  await expect(drawer.getByRole("link", { name: "Contact support" })).toHaveAttribute("href", "mailto:support@abangcebu.ai");
  await drawer.getByRole("link", { name: "Find rentals" }).click();
  await expect(drawer).toHaveCount(0);
});
