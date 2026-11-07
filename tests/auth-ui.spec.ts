import { test, expect } from "./fixtures";

for (const width of [320, 430, 1280]) {
  for (const theme of ["light", "dark"] as const) {
    test(`authentication stays bounded and consistent at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      await page.addInitScript(value => localStorage.setItem("abangcebu-theme", value), theme);
      await page.goto("/");
      await page.getByRole("button", { name: "Open account dialog" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByLabel("Email Address", { exact: true })).toBeVisible();
      await expect(dialog.getByRole("radio", { name: /Renter/ })).toHaveCount(0);
      await expect(dialog.locator("svg.lucide-mail")).toHaveCount(1);
      await expect(dialog.locator("svg.lucide-lock-keyhole")).toHaveCount(1);
      for (const input of await dialog.locator("input").all()) {
        expect(await input.evaluate(e => parseFloat(getComputedStyle(e).paddingLeft))).toBeGreaterThanOrEqual(40);
      }
      const initial = await dialog.boundingBox();
      await dialog.getByLabel("Password", { exact: true }).fill("Example-password1");
      await dialog.getByRole("button", { name: "Show password", exact: true }).click();
      await expect(dialog.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
      await dialog.getByRole("button", { name: "Hide password", exact: true }).click();
      await expect(dialog.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
      await dialog.getByRole("button", { name: "Register", exact: true }).click();
      await expect(dialog.getByRole("radio", { name: /Renter/ })).toBeVisible();
      await expect(dialog.getByRole("radio", { name: /Landlord/ })).toBeVisible();
      await expect(dialog.getByLabel("Full Name", { exact: true })).toBeVisible();
      await expect(dialog.locator('input[type="password"]')).toHaveCount(1);
      await expect(dialog.locator('input[type="tel"]')).toHaveCount(0);
      const register = await dialog.boundingBox();
      expect(register!.width).toBeCloseTo(initial!.width, 0);
      expect(register!.height).toBeGreaterThan(0);
      expect(register!.height).toBeLessThanOrEqual(740);
      await dialog.getByRole("button", { name: /Log in/i, exact: true }).first().click();
      await dialog.getByRole("button", { name: "Forgot password?" }).click();
      await expect(dialog.getByLabel("Email Address", { exact: true })).toBeVisible();
      const reset = await dialog.boundingBox();
      expect(reset!.width).toBeCloseTo(initial!.width, 0);
      expect(reset!.height).toBeGreaterThan(0);
      expect(reset!.height).toBeLessThanOrEqual(740);
      await page.setViewportSize({ width, height: 420 });
      const short = await dialog.boundingBox();
      expect(short!.y).toBeGreaterThanOrEqual(0);
      expect(short!.y + short!.height).toBeLessThanOrEqual(420);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    });
  }
}

test("login fields remain unchanged while authentication is pending", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let requests = 0;
  await page.route(url => url.pathname === "/auth/v1/token", async route => {
    requests += 1;
    await held;
    await route.fulfill({ status: 400, json: { code: "invalid_credentials", msg: "Invalid login credentials" } });
  });
  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Open account dialog" }).click();
    const dialog = page.getByRole("dialog");
    const email = dialog.getByLabel("Email Address", { exact: true });
    const password = dialog.getByLabel("Password", { exact: true });
    await email.fill("pending@example.invalid");
    await password.fill("Test-password1!");
    await dialog.getByRole("button", { name: "Log In", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Logging in…" })).toBeDisabled();
    await expect(email).toHaveAttribute("readonly", "");
    await expect(password).toHaveAttribute("readonly", "");
    expect(requests).toBe(1);
    release();
    await expect(dialog.getByRole("alert")).toContainText("Invalid email or password.");
    await expect(email).not.toHaveAttribute("readonly", "");
    await expect(password).not.toHaveAttribute("readonly", "");
  } finally {
    release();
  }
});

const challengeKeys = (value: unknown): string[] =>
  value && typeof value === "object"
    ? Object.entries(value).flatMap(([key, nested]) => [
        ...( /captcha|turnstile|verification/i.test(key) ? [key] : []),
        ...challengeKeys(nested),
      ])
    : [];

for (const width of [430, 1280]) {
  test(`auth submits and retries without verification at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const loginPayloads: Record<string, unknown>[] = [];
    const registrationPayloads: Record<string, unknown>[] = [];
    const recoveryPayloads: Record<string, unknown>[] = [];

    await page.route(url => url.pathname === "/auth/v1/token", async route => {
      if (new URL(route.request().url()).searchParams.get("grant_type") !== "password") return route.continue();
      loginPayloads.push(route.request().postDataJSON());
      await route.fulfill({ status: 400, json: { code: "invalid_credentials", msg: "Invalid login credentials" } });
    });
    await page.route(url => url.pathname === "/api/auth/register", async route => {
      registrationPayloads.push(route.request().postDataJSON());
      await route.fulfill({ status: 503, json: { success: false, error: { message: "Controlled registration failure." } } });
    });
    await page.route(url => url.pathname === "/api/auth/reset-password/request", async route => {
      recoveryPayloads.push(route.request().postDataJSON());
      await route.fulfill({ status: 503, json: { success: false, error: { message: "Controlled recovery failure." } } });
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Open account dialog" }).click();
    const dialog = page.getByRole("dialog");
    const challengeWidgets = dialog.locator('iframe[src*="captcha" i], iframe[src*="turnstile" i], [data-sitekey], input[name*="captcha" i], input[name*="turnstile" i]');
    await expect(challengeWidgets).toHaveCount(0);

    await dialog.getByLabel("Email Address", { exact: true }).fill("browser-test@example.invalid");
    await dialog.getByLabel("Password", { exact: true }).fill("Test-password1!");
    const loginForm = dialog.locator("form");
    await loginForm.getByRole("button", { name: "Log In", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Invalid email or password.");
    await expect(dialog.getByRole("alert").locator("svg.lucide-circle-alert[aria-hidden=true]")).toHaveCount(1);
    await expect(dialog.getByRole("alert")).toHaveClass(/border-destructive/);
    await expect(dialog.getByRole("alert")).toHaveClass(/bg-destructive/);
    await loginForm.getByRole("button", { name: "Log In", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Invalid email or password.");
    expect(loginPayloads).toHaveLength(2);
    for (const payload of loginPayloads) {
      expect(payload).toMatchObject({ email: "browser-test@example.invalid", password: "Test-password1!" });
      expect(challengeKeys(payload)).toEqual([]);
    }

    await dialog.getByRole("button", { name: "Register", exact: true }).click();
    await expect(challengeWidgets).toHaveCount(0);
    await dialog.getByLabel("Full Name", { exact: true }).fill("Browser Test");
    await dialog.getByLabel("Email Address", { exact: true }).fill("browser-register@example.invalid");
    await dialog.getByLabel("Password", { exact: true }).fill("Test-password1!");
    const registrationForm = dialog.locator("form");
    await registrationForm.getByRole("button", { name: "Register as Renter", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Controlled registration failure.");
    await registrationForm.getByRole("button", { name: "Register as Renter", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Controlled registration failure.");
    expect(registrationPayloads).toHaveLength(2);
    for (const payload of registrationPayloads) {
      expect(payload).toMatchObject({ fullName: "Browser Test", email: "browser-register@example.invalid", password: "Test-password1!", role: "renter" });
      expect(challengeKeys(payload)).toEqual([]);
    }

    await dialog.getByRole("button", { name: "Log in", exact: true }).click();
    await dialog.getByRole("button", { name: "Forgot password?" }).click();
    await expect(challengeWidgets).toHaveCount(0);
    await dialog.getByLabel("Email Address", { exact: true }).fill("browser-recovery@example.invalid");
    const recoveryForm = dialog.locator("form");
    await recoveryForm.getByRole("button", { name: "Send reset link", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Controlled recovery failure.");
    await recoveryForm.getByRole("button", { name: "Send reset link", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Controlled recovery failure.");
    expect(recoveryPayloads).toHaveLength(2);
    for (const payload of recoveryPayloads) {
      expect(payload).toEqual({ email: "browser-recovery@example.invalid" });
      expect(challengeKeys(payload)).toEqual([]);
    }
  });
}
