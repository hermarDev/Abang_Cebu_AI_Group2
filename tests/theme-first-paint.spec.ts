import { test, expect } from "./fixtures";

const cases = [
  { preference: "light", os: "dark", expected: "light" },
  { preference: "dark", os: "light", expected: "dark" },
  { preference: "system", os: "dark", expected: "dark" },
  { preference: "system", os: "light", expected: "light" },
  { preference: null, os: "dark", expected: "dark" },
  { preference: "invalid", os: "light", expected: "light" },
  { preference: "denied", os: "dark", expected: "dark" },
] as const;

for (const { preference, os, expected } of cases) {
  test(`pre-hydration ${preference} on ${os} OS paints ${expected}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: os });
    await page.addInitScript((value) => {
      if (value === "denied") {
        Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Denied", "SecurityError"); } });
      } else if (value !== null) localStorage.setItem("abangcebu-theme", value);
    }, preference);
    // Keep inline initialization, but prevent React from masking the initial palette.
    await page.route("**/_next/**/*.js*", (route) => route.abort());
    for (const reload of [false, true]) {
      if (reload) await page.reload({ waitUntil: "load" });
      else await page.goto("/", { waitUntil: "load" });
      await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${expected}\\b`));
      await expect(page.locator("html")).toHaveCSS("color-scheme", expected);
      await expect(page.locator("body")).toHaveCSS("background-color", expected === "dark" ? "rgb(16, 21, 28)" : "rgb(255, 255, 255)");
    }
  });
}

for (const preference of ["light", "dark"] as const) {
  test(`hydration never rolls saved ${preference} back`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: preference === "light" ? "dark" : "light" });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error" && /hydrat/i.test(message.text())) errors.push(message.text()); });
    await page.addInitScript((theme) => {
      localStorage.setItem("abangcebu-theme", theme);
      const samples: string[] = [];
      Object.assign(window, { themeSamples: samples });
      new MutationObserver((records) => {
        for (const record of records) {
          if (record.target === document.documentElement && record.attributeName === "class") {
            if (record.oldValue) samples.push(record.oldValue);
            samples.push(document.documentElement.className);
          }
        }
      }).observe(document, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ["class"] });
    }, preference);
    for (const reload of [false, true]) {
      if (reload) await page.reload(); else await page.goto("/");
      await expect(page.locator("main")).toHaveAttribute("data-theme", preference);
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.getByRole("button", { name: `Switch to ${preference === "light" ? "dark" : "light"} mode` })).toBeVisible();
      expect(await page.evaluate(() => (window as Window & { themeSamples?: string[] }).themeSamples)).not.toContain(preference === "light" ? "dark" : "light");
      expect(errors).toEqual([]);
    }
  });
}
