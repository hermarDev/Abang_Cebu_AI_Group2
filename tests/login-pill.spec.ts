import { test, expect } from "./fixtures";

for (const theme of ["light", "dark"]) {
  test(`login pill has consistent action styling in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto("/");
    await page.evaluate(theme => { document.documentElement.classList.remove("light", "dark"); document.documentElement.classList.add(theme); }, theme);
    const login = page.getByRole("button", { name: "Open account dialog", exact: true });
    await expect(login).toHaveText("Log in");
    await expect(login.locator("svg.lucide-log-in")).toHaveAttribute("aria-hidden", "true");
    const geometry = await login.evaluate(el => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return { height: r.height, gap: s.gap }; });
    expect(geometry.height).toBeGreaterThanOrEqual(44);
    expect(geometry.gap).toBe("8px");
    await login.focus();
    await expect(login).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Account access" })).toBeVisible();
  });
}
