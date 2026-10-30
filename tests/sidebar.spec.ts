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

for (const { width, height } of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 393, height: 852 }, { width: 768, height: 667 }, { width: 844, height: 390 }, { width: 1024, height: 768 }, { width: 1440, height: 932 }]) {
  test("assistant position and map controls adapt and restore at " + width + "x" + height, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const controls = page.getByRole("group", { name: "Map controls" });
    await expect(controls).toBeVisible();
    const originalPosition = await controls.boundingBox();
    expect(originalPosition).not.toBeNull();
    await expect(controls).toHaveCSS("position", "absolute");
    const zoomControls = controls.locator(":scope > div").first();
    await expect(zoomControls).toBeVisible();
    await expect(controls.getByRole("button", { name: "Zoom in" })).toBeVisible();
    await expect(controls.getByRole("button", { name: "Zoom out" })).toBeVisible();

    await page.getByRole("button", { name: "Open rental assistant" }).click();
    const assistant = page.getByRole("region", { name: "AbangCebu assistant" });
    await expect(assistant).toBeVisible();
    const backdrop = page.getByRole("button", { name: "Close AbangCebu assistant" });
    const launcher = page.getByRole("button", { name: "Open rental assistant" });
    await expect(launcher).toHaveCount(0);
    if (width <= 1023) {
      await expect(backdrop).toBeVisible();
      await expect(backdrop).toHaveCSS("backdrop-filter", "blur(3px)");
      const backdropPosition = await backdrop.boundingBox();
      expect(backdropPosition).not.toBeNull();
      expect(backdropPosition!.x).toBe(0);
      expect(backdropPosition!.y).toBe(0);
      expect(backdropPosition!.width).toBe(width);
      expect(backdropPosition!.height).toBe(height);
      await expect(controls).toBeHidden();
      await expect(controls.getByRole("button", { name: "Locate me" })).toBeHidden();
      await expect(controls.getByRole("button", { name: "Zoom in" })).toBeHidden();
      await expect(controls.getByRole("button", { name: "Zoom out" })).toBeHidden();
    } else {
      await expect(backdrop).toBeHidden();
      await expect(controls).toHaveCSS("position", "static");
      await expect(controls).toHaveCSS("flex-direction", "row");
      await expect(zoomControls).toHaveCSS("display", "flex");
      await expect(zoomControls).toHaveCSS("flex-direction", "row");
      await expect(controls.getByRole("button", { name: "Zoom in" })).toBeVisible();
      await expect(controls.getByRole("button", { name: "Zoom out" })).toBeVisible();
    }
    if (width > 1023) {
      const controlsAboveAssistant = await controls.boundingBox();
      const assistantPosition = await assistant.boundingBox();
      expect(controlsAboveAssistant).not.toBeNull();
      expect(assistantPosition).not.toBeNull();
      expect(controlsAboveAssistant!.x).toBeGreaterThanOrEqual(0);
      expect(controlsAboveAssistant!.y).toBeGreaterThanOrEqual(0);
      expect(controlsAboveAssistant!.x + controlsAboveAssistant!.width).toBeLessThanOrEqual(width);
      expect(controlsAboveAssistant!.y + controlsAboveAssistant!.height).toBeLessThanOrEqual(height);
      expect(controlsAboveAssistant!.width).toBeGreaterThan(originalPosition!.width);
      expect(Math.abs((controlsAboveAssistant!.x + controlsAboveAssistant!.width) - (originalPosition!.x + originalPosition!.width))).toBeLessThanOrEqual(1);
      expect(controlsAboveAssistant!.y + controlsAboveAssistant!.height).toBeLessThanOrEqual(assistantPosition!.y);
    }
    if (width <= 1023) {
      const assistantPosition = await assistant.boundingBox();
      const filtersPosition = await page.getByRole("group", { name: "Rental search filters" }).boundingBox();
      const listingsPosition = await page.getByRole("complementary", { name: "Rental listings" }).boundingBox();
      expect(assistantPosition).not.toBeNull();
      expect(filtersPosition).not.toBeNull();
      expect(listingsPosition).not.toBeNull();
      expect(assistantPosition!.y).toBeGreaterThanOrEqual(0);
      expect(Math.abs(assistantPosition!.x + assistantPosition!.width / 2 - width / 2)).toBeLessThanOrEqual(1);
      expect(assistantPosition!.y).toBeGreaterThanOrEqual(filtersPosition!.y + filtersPosition!.height);
      expect(assistantPosition!.y + assistantPosition!.height).toBeLessThanOrEqual(listingsPosition!.y);
    }

    await assistant.getByRole("button", { name: "Close chat" }).click();
    await expect(assistant).toHaveCount(0);
    await expect(launcher).toBeVisible();
    await expect(controls).toBeVisible();
    await expect(controls).toHaveCSS("position", "absolute");
    await expect(controls.getByRole("button", { name: "Zoom in" })).toBeVisible();
    await expect(controls.getByRole("button", { name: "Zoom out" })).toBeVisible();
    const restoredPosition = await controls.boundingBox();
    expect(restoredPosition).not.toBeNull();
    expect(Math.abs(restoredPosition!.x - originalPosition!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(restoredPosition!.y - originalPosition!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(restoredPosition!.width - originalPosition!.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(restoredPosition!.height - originalPosition!.height)).toBeLessThanOrEqual(1);
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
  await drawer.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute("data-theme", "dark");
  await expect(drawer.getByRole("link", { name: "Contact support" })).toHaveAttribute("href", "mailto:support@abangcebu.ai");
  await drawer.getByRole("link", { name: "Find rentals" }).click();
  await expect(drawer).toHaveCount(0);
});
