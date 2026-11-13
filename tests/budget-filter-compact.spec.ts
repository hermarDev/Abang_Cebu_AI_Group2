import { test, expect } from "./fixtures";

const budgetNames = ["Any maximum", "Up to ₱5,000", "Up to ₱10,000", "Up to ₱15,000", "Up to ₱25,000"];

async function openBudget(page: import("@playwright/test").Page) {
  const budget = page.getByRole("button", { name: /^Budget/ });
  await budget.click();
  const popover = page.getByRole("dialog", { name: "Budget filter" });
  await expect(popover).toBeVisible();
  return { budget, popover };
}

async function assertCompactBudgetPopover(page: import("@playwright/test").Page, height: number) {
  const { popover } = await openBudget(page);
  const radios = popover.getByRole("radio");
  await expect(radios).toHaveCount(budgetNames.length);
  for (const [index, name] of budgetNames.entries()) {
    const radio = radios.nth(index);
    await radio.scrollIntoViewIfNeeded();
    await expect(radio).toHaveAccessibleName(name);
    expect(await radio.evaluate((input) => {
      const label = input.closest("label");
      const rect = label?.getBoundingClientRect();
      const hit = rect ? document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) : null;
      return { height: rect?.height ?? 0, hit: Boolean(label?.contains(hit)) };
    })).toEqual({ height: expect.any(Number), hit: true });
    expect(await radio.evaluate((input) => input.closest("label")?.getBoundingClientRect().height ?? 0)).toBeGreaterThanOrEqual(44);
  }

  const custom = popover.getByRole("spinbutton", { name: "Custom maximum monthly rent" });
  const apply = popover.getByRole("button", { name: "Apply budget" });
  await expect(custom).toBeVisible();
  await expect(apply).toBeVisible();
  const contents = await popover.evaluate((element) => {
    const fieldset = element.querySelector("fieldset");
    const popupRect = element.getBoundingClientRect();
    return {
      popup: { scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, top: popupRect.top, bottom: popupRect.bottom },
      fieldset: fieldset && { scrollHeight: fieldset.scrollHeight, clientHeight: fieldset.clientHeight, overflowY: getComputedStyle(fieldset).overflowY },
    };
  });
  expect(contents).toMatchObject({
    popup: { top: expect.any(Number), bottom: expect.any(Number) },
    fieldset: { scrollHeight: expect.any(Number), clientHeight: expect.any(Number), overflowY: "visible" },
  });

  const geometry = await popover.evaluate((element) => {
    const fieldset = element.querySelector("fieldset")!;
    const rect = element.getBoundingClientRect();
    return { popupScrolls: element.scrollHeight > element.clientHeight + 1, fieldsetScrolls: fieldset.scrollHeight > fieldset.clientHeight + 1, top: rect.top, bottom: rect.bottom };
  });
  expect(geometry.fieldsetScrolls).toBe(false);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(height + 1);

  await custom.scrollIntoViewIfNeeded();
  await apply.scrollIntoViewIfNeeded();
  for (const control of [custom, apply]) {
    expect(await control.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    })).toBe(true);
  }
}

for (const theme of ["light", "dark"] as const) {
  test(`compact budget presets apply and persist at desktop in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.addInitScript((value) => localStorage.setItem("abangcebu-theme", value), theme);
    await page.goto("/");
    await assertCompactBudgetPopover(page, 800);

    const popover = page.getByRole("dialog", { name: "Budget filter" });
    await popover.getByRole("radio", { name: "Up to ₱15,000" }).check();
    await popover.getByRole("button", { name: "Apply budget" }).click();
    const budget = page.getByRole("button", { name: "Budget, up to 15,000 pesos" });
    await expect(budget).toBeVisible();
    await budget.click();
    await expect(page.getByRole("radio", { name: "Up to ₱15,000" })).toBeChecked();
  });
}

test("custom budget values apply, persist, cancel on Escape, and reset to Any maximum", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/");
  for (const value of ["45000", "2500"]) {
    const { popover } = await openBudget(page);
    await popover.getByRole("spinbutton", { name: "Custom maximum monthly rent" }).fill(value);
    await popover.getByRole("button", { name: "Apply budget" }).click();
    await expect(page.getByRole("button", { name: `Budget, up to ${Number(value).toLocaleString("en-PH")} pesos` })).toBeVisible();
  }

  const { budget, popover } = await openBudget(page);
  await popover.getByRole("radio", { name: "Up to ₱15,000" }).check();
  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  await expect(budget).toBeFocused();
  await expect(budget).toHaveAccessibleName("Budget, up to 2,500 pesos");

  await budget.click();
  await expect(popover.getByRole("spinbutton", { name: "Custom maximum monthly rent" })).toHaveValue("2500");
  await popover.getByRole("radio", { name: "Any maximum" }).check();
  await popover.getByRole("button", { name: "Apply budget" }).click();
  await expect(page.getByRole("button", { name: "Budget, any maximum" })).toBeVisible();
});

test("budget radio keyboard controls apply an option", async ({ page }) => {
  await page.goto("/");
  const { popover } = await openBudget(page);
  const anyMaximum = popover.getByRole("radio", { name: "Any maximum" });
  await anyMaximum.focus();
  await page.keyboard.press("ArrowDown");
  await expect(popover.getByRole("radio", { name: "Up to ₱5,000" })).toBeChecked();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Budget, up to 5,000 pesos" })).toBeVisible();
});

for (const viewport of [{ width: 430, height: 932 }, { width: 320, height: 480 }, { width: 430, height: 400 }]) {
  test(`budget popover keeps one scroll owner and reachable controls at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await assertCompactBudgetPopover(page, viewport.height);
    const popover = page.getByRole("dialog", { name: "Budget filter" });
    await popover.getByRole("button", { name: "Apply budget" }).scrollIntoViewIfNeeded();
    await expect(popover.getByRole("button", { name: "Apply budget" })).toBeVisible();
  });
}
