import { test, expect } from "./fixtures";

test("browser fixture isolates reads and blocks mutations and external requests", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const places = await fetch("/api/places?q=Cebu").then((response) => response.json());
    const rentals = await fetch("/api/rentals").then((response) => response.json());
    const mutationBlocked = await fetch("/api/auth/register", { method: "POST", body: "{}" }).then(() => false, () => true);
    const externalBlocked = await fetch("https://example.com/").then(() => false, () => true);
    return { places, rentals, mutationBlocked, externalBlocked };
  });
  expect(result).toEqual({ places: { places: [] }, rentals: { rentals: [] }, mutationBlocked: true, externalBlocked: true });
});

for (const viewport of [{ width: 360, height: 800 }, { width: 430, height: 932 }]) {
  test(`registration keyboard containment and submit reachability at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "Open account dialog" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Register", exact: true }).click();
    for (let index = 0; index < 40; index += 1) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    }
    const submit = dialog.getByRole("button", { name: "Register as Renter", exact: true });
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeVisible();
    expect(await submit.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return Boolean(target?.closest('[role="dialog"]'));
    })).toBe(true);
    const bounds = await submit.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open account dialog" })).toBeFocused();
  });
}

test("login validation links inline errors and focuses the first invalid field", async ({ page }) => {
  await page.goto("/login");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Log In", exact: true }).last().click();
  const email = dialog.getByRole("textbox", { name: "Email Address", exact: true });
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  const errorId = await email.getAttribute("aria-describedby");
  expect(errorId).toBeTruthy();
  await expect(page.locator(`[id="${errorId}"]`)).toHaveText("Enter your email address.");
});

test("login route opens without a renter or landlord role selector", async ({ page }) => {
  await page.goto("/login");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("group", { name: "Account access" })).toBeVisible();
  await expect(dialog.getByRole("radiogroup", { name: "Account type" })).toHaveCount(0);
  await expect(dialog.getByRole("radio", { name: /Renter/ })).toHaveCount(0);
  await expect(dialog.getByRole("radio", { name: /Landlord/ })).toHaveCount(0);
  await expect(dialog.getByRole("textbox", { name: "Email Address", exact: true })).toBeVisible();
});

test("guest can open account access, switch modes and dismiss with Escape", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open account dialog" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("radiogroup", { name: "Account type" })).toHaveCount(0);
  await expect(dialog.getByRole("radio", { name: /Renter/ })).toHaveCount(0);
  await expect(dialog.getByRole("radio", { name: /Landlord/ })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Register", exact: true }).click();
  await expect(dialog.getByRole("radiogroup", { name: "Account type" })).toBeVisible();
  await expect(dialog.getByRole("radio", { name: /Renter Find rentals/ })).toBeVisible();
  await expect(dialog.getByRole("radio", { name: /Landlord List properties/ })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Register as Renter", exact: true })).toBeVisible();
  await dialog.getByRole("group", { name: "Account access" }).getByRole("button", { name: "Log In", exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: "Email Address", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Open account dialog" })).toBeFocused();
});
