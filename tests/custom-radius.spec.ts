import { test, expect } from "./fixtures";

for (const theme of ["light", "dark"]) {
  test(`custom radius validates and preserves apply/cancel/reset in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 740 });
    await page.addInitScript(value => localStorage.setItem("abangcebu-theme", value), theme);
    await page.goto("/");
    const trigger = page.getByRole("button", { name: /^Filters/ });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Filters" });
    const radius = dialog.getByRole("spinbutton", { name: "Search radius", exact: true });
    const apply = dialog.getByRole("button", { name: /^(Apply filters|Show \d+ rentals)$/ });
    for (const value of ["", "0", "51", "2.5"]) {
      await radius.fill(value);
      await expect(radius).toHaveAttribute("aria-invalid", "true");
      await expect(apply).toBeDisabled();
    }
    await radius.fill("50");
    await expect(apply).toBeEnabled();
    await radius.fill("17");
    await page.keyboard.press("Escape");
    await trigger.click();
    await expect(radius).toHaveValue("2");
    await radius.fill("17");
    await apply.click();
    await trigger.click();
    await expect(radius).toHaveValue("17");
    await dialog.getByRole("button", { name: "10 km", exact: true }).click();
    await expect(radius).toHaveValue("10");
    await dialog.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(radius).toHaveValue("2");
  });
}
