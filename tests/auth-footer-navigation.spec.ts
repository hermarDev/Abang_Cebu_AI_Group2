import { test, expect } from "./fixtures";

for (const width of [320, 430, 1280]) {
  for (const theme of ["light", "dark"] as const) {
    test(`account footer switches modes at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      await page.addInitScript(value => localStorage.setItem("abangcebu-theme", value), theme);
      await page.goto("/");
      const trigger = page.getByRole("button", { name: "Open account dialog" });
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "Account access" });
      const initial = await dialog.boundingBox();
      await expect(dialog.getByText("Don’t have an account?", { exact: false })).toHaveCount(1);
      await expect(dialog.getByRole("group", { name: "Account access" })).toHaveCount(0);
      const register = dialog.getByRole("button", { name: "Register", exact: true });
      const browse = dialog.getByRole("button", { name: "Continue browsing map" });
      const footer = browse.locator("xpath=..");
      const footerBounds = await footer.boundingBox();
      const registerBounds = await register.boundingBox();
      expect(registerBounds!.width).toBeGreaterThanOrEqual(44);
      expect(registerBounds!.height).toBeGreaterThanOrEqual(44);
      await expect(browse).toHaveCSS("border-top-width", "0px");
      await expect(browse).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      const browseBounds = await browse.boundingBox();
      expect(browseBounds!.width).toBeLessThan(footerBounds!.width - 30);
      await register.focus();
      await page.keyboard.press("Enter");
      await expect(dialog.getByRole("heading", { name: "Create your account" })).toBeFocused();
      await expect(dialog.getByRole("radio", { name: /Landlord/ })).toBeVisible();
      await expect(dialog.getByText("Already have an account?", { exact: false })).toHaveCount(1);
      const registration = await dialog.boundingBox();
      expect(registration!.height).toBeCloseTo(initial!.height, 0);
      expect(registration!.width).toBeCloseTo(initial!.width, 0);
      const login = dialog.getByRole("button", { name: "Log in", exact: true });
      const loginBounds = await login.boundingBox();
      await expect(login).toHaveCSS("min-width", "44px");
      const registrationFooter = await footer.boundingBox();
      expect(loginBounds!.width).toBeGreaterThanOrEqual(44);
      expect(loginBounds!.height).toBeGreaterThanOrEqual(44);
      expect(registrationFooter!.y).toBeCloseTo(footerBounds!.y, 0);
      expect(registrationFooter!.height).toBeCloseTo(footerBounds!.height, 0);
      await login.focus();
      await page.keyboard.press("Space");
      await expect(dialog.getByRole("heading", { name: "Welcome back" })).toBeFocused();
      await expect(dialog.getByRole("radio", { name: /Landlord/ })).toHaveCount(0);
      await dialog.getByRole("button", { name: "Forgot password?" }).click();
      await expect(dialog.getByLabel("Email Address", { exact: true })).toBeVisible();
      await browse.click();
      await expect(dialog).toBeHidden();
      await trigger.click();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    });
  }
}
