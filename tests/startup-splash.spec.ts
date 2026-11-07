import { test, expect } from "./fixtures";

function recordStartup(page: import("@playwright/test").Page) {
  return page.addInitScript(() => {
    const samples: string[] = [];
    Object.assign(window, { startupSamples: samples });
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      if (this === document.documentElement && name === "data-startup") samples.push(String(value));
      return originalSetAttribute.call(this, name, value);
    };
    const originalDataset = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "dataset")!;
    Object.defineProperty(HTMLElement.prototype, "dataset", {
      ...originalDataset,
      get() {
        const dataset = originalDataset.get!.call(this) as DOMStringMap;
        if (this !== document.documentElement) return dataset;
        return new Proxy(dataset, {
          set(target, key, value) {
            if (key === "startup") samples.push(String(value));
            return Reflect.set(target, key, value);
          },
        });
      },
    });
  });
}

test("initial document splash becomes visible before hydration and stays pending without app JS", async ({ page }) => {
  const splash = page.locator("[data-startup-splash]");
  await recordStartup(page);
  await page.route("**/_next/**/*.js*", (route) => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(splash).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-startup", "pending");
  expect(await page.evaluate(() => document.documentElement.dataset.startup)).toBe("pending");
});

test("pending splash surface stays opaque while only the logo enters", async ({ page }) => {
  const splash = page.locator("[data-startup-splash]");
  await page.route("**/_next/**/*.js*", (route) => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(splash).toBeVisible();
  await expect(splash).toHaveCSS("animation-name", "startup-splash-watchdog");
  await expect(splash.locator("img:visible")).toHaveCSS("animation-name", "startup-splash-enter");
});

test("ready dismisses without an artificial wait and does not reactivate on client navigation", async ({ page }) => {
  const splash = page.locator("[data-startup-splash]");
  await recordStartup(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-startup", "ready");
  await expect(splash).toBeHidden();
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Saved rentals" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Ffavorites/);
  await expect(page.locator("html")).toHaveAttribute("data-startup", "ready");
  expect(await page.evaluate(() => document.documentElement.dataset.startup)).toBe("ready");
});

test("reload creates a new initial cycle", async ({ page }) => {
  await recordStartup(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-startup", "ready");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-startup", "ready");
  await expect.poll(() => page.evaluate(() => (window as unknown as { startupSamples: string[] }).startupSamples)).toEqual(expect.arrayContaining(["pending", "ready"]));
  const samples = await page.evaluate(() => (window as unknown as { startupSamples: string[] }).startupSamples);
  expect(samples.indexOf("pending")).toBeLessThan(samples.indexOf("ready"));
});

test("JS disabled leaves the app usable because the splash is absent without inline bootstrap", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const splash = page.locator("[data-startup-splash]");
  await page.goto("/");
  await expect(splash).toBeHidden();
  await expect(page.locator("html")).not.toHaveAttribute("data-startup", /pending|ready/);
  await context.close();
});

test("failed app chunk still fails open through the CSS watchdog and does not block the page", async ({ page }) => {
  const splash = page.locator("[data-startup-splash]");
  await page.route("**/_next/**/*.js*", (route) => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-startup", "pending");
  await expect(splash).toBeVisible();
  await expect(splash).toBeHidden({ timeout: 10_000 });
  const hit = await page.evaluate(() => {
    const element = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return element?.closest("[data-startup-splash]") ? "splash" : "page";
  });
  expect(hit).toBe("page");
});

test("reduced motion still fails open when app chunks fail", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/_next/**/*.js*", (route) => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const splash = page.locator("[data-startup-splash]");
  await expect(page.locator("html")).toHaveAttribute("data-startup", "pending");
  await expect(splash).toBeVisible();
  await expect(splash).toHaveCSS("animation-name", "startup-splash-watchdog");
  await expect(splash).toBeHidden({ timeout: 10_000 });
});

test("reduced motion removes animation and hides immediately when ready", async ({ page }) => {
  const splash = page.locator("[data-startup-splash]");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-startup", "ready");
  await expect(splash).toBeHidden();
  await expect(splash).toHaveCSS("animation-name", "none");
});

test("guest login route becomes accessible and does not retain the splash", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("dialog", { name: "Account access" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-startup", "ready");
  await expect(page.locator("[data-startup-splash]")).toBeHidden();
});

test("guest account route redirects to login without retaining the splash", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
  await expect(page.getByRole("dialog", { name: "Account access" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-startup", "ready");
  await expect(page.locator("[data-startup-splash]")).toBeHidden();
});

test("rejected logo fetch leaves the opaque surface and accessible status intact", async ({ page }) => {
  await page.route("**/icons/main_Logo*.png", (route) => route.abort());
  await page.route("**/_next/**/*.js*", (route) => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const splash = page.locator("[data-startup-splash]");
  await expect(splash).toBeVisible();
  await expect(splash).toHaveCSS("background-color", /rgb/);
  await expect(splash.getByRole("status")).toHaveText("Loading AbangCebu…");
});

test("back-forward restoration does not reactivate the splash", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-startup", "ready");
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("data-startup", "ready");
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("data-startup", "ready");
  await expect(page.locator("[data-startup-splash]")).toBeHidden();
});

for (const theme of ["light", "dark"] as const) {
  for (const viewport of [{ width: 320, height: 568 }, { width: 430, height: 932 }, { width: 932, height: 430 }, { width: 1440, height: 900 }]) {
    test(`splash logo stays centered and uncropped in ${theme} at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      const splash = page.locator("[data-startup-splash]");
      await page.setViewportSize(viewport);
      await page.addInitScript((value) => localStorage.setItem("abangcebu-theme", value), theme);
      await page.route("**/_next/**/*.js*", (route) => route.abort());
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(splash).toBeVisible();
      const logo = page.locator('[data-startup-splash] img:visible').first();
      await expect(logo).toBeVisible();
      const box = await logo.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    });
  }
}
