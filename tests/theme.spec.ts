import { test, expect } from "./fixtures";

test("theme control switches between light and dark modes and persists preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => localStorage.setItem("abangcebu-theme", "light"));
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: "Open menu" }).click();
  const themeButton = page.getByRole("radio", { name: "Dark", exact: true });
  await expect(themeButton).toBeVisible();
  await themeButton.click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("html")).not.toHaveClass(/light/);
  expect(await page.evaluate(() => localStorage.getItem("abangcebu-theme"))).toBe("dark");

  await page.getByRole("radio", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem("abangcebu-theme"))).toBe("light");
});

test("explicit dark preference applies dark tokens when the operating system is light", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => localStorage.setItem("abangcebu-theme", "dark"));
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect.poll(() => page.locator("html").evaluate((element) => getComputedStyle(element).getPropertyValue("--background").trim())).toBe("#09182a");
});

test("System appearance follows OS changes and persists across reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("radio", { name: "Dark", exact: true }).click();
  await page.getByRole("radio", { name: "System", exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("main")).toHaveAttribute("data-theme", "dark");
  await expect.poll(() => page.locator("html").evaluate(e => getComputedStyle(e).colorScheme)).toBe("dark");
  await page.reload();
  await expect(page.locator("main")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("abangcebu-theme"))).toBe("system");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("main")).toHaveAttribute("data-theme", "light");
});

test("dark theme updates the finder logo asset", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("abangcebu-theme", "dark"));
  await page.goto("/");
  await expect(page.locator('header img[alt="AbangCebu"]')).toHaveAttribute("src", /main_Logo_Light\.png/);
});
