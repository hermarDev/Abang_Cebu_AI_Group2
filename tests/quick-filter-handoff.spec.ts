import { test, expect } from "./fixtures";

test("keeps only one quick-filter popover open", async ({ page }) => {
  await page.goto("/");
  const filters = page.getByRole("group", { name: "Rental search filters" });
  const budget = filters.getByRole("button", { name: /^Budget/ });
  const propertyType = filters.getByRole("button", { name: /^Property type/ });
  const budgetPopover = page.getByRole("dialog", { name: "Budget filter" });
  const typePopover = page.getByRole("dialog", { name: "Property type filter" });

  await budget.focus();
  await page.keyboard.press("Enter");
  await expect(budgetPopover).toBeVisible();
  await propertyType.focus();
  await page.keyboard.press("Enter");
  await expect(typePopover).toBeVisible();
  await expect(budgetPopover).toBeHidden();
  await expect(page.getByRole("dialog")).toHaveCount(1);
});

test("dismisses quick filters before opening advanced Filters and preserves applied values", async ({ page }) => {
  await page.goto("/");
  const filters = page.getByRole("group", { name: "Rental search filters" });
  const budget = filters.getByRole("button", { name: /^Budget/ });
  const propertyType = filters.getByRole("button", { name: /^Property type/ });
  const advancedTrigger = filters.getByRole("button", { name: /^Filters/ });
  const budgetPopover = page.getByRole("dialog", { name: "Budget filter" });
  const typePopover = page.getByRole("dialog", { name: "Property type filter" });

  await propertyType.focus();
  await page.keyboard.press("Enter");
  await typePopover.getByRole("checkbox", { name: "Private room", exact: true }).check();
  await typePopover.getByRole("button", { name: "Apply types" }).click();
  await budget.focus();
  await page.keyboard.press("Enter");
  await expect(budgetPopover).toBeVisible();
  await page.getByRole("radio", { name: "Up to ₱2,500", exact: true }).check();
  await page.getByRole("button", { name: "Apply budget" }).click();
  await propertyType.focus();
  await page.keyboard.press("Enter");
  await expect(typePopover).toBeVisible();
  await advancedTrigger.click();

  const advancedDialog = page.getByRole("dialog", { name: "Filters" });
  await expect(advancedDialog).toBeVisible();
  await expect(typePopover).toBeHidden();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(advancedDialog.getByLabel("Maximum monthly budget (₱)")).toHaveValue("2500");
  await expect(advancedDialog.getByLabel("Private room", { exact: true })).toBeChecked();
  await expect.poll(() => advancedDialog.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);

  await page.keyboard.press("Escape");
  await expect(advancedDialog).toBeHidden();
  await expect(typePopover).toBeHidden();
});
