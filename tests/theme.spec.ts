import { test, expect } from "./fixtures";

for (const width of [430, 1440]) {
  test(`one-tap appearance toggle and System persist at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 932 });
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const appearance = page.getByRole("group", { name: "Appearance", exact: true });
    const toggle = appearance.getByRole("button", { name: /Switch to (light|dark) mode/ });
    const system = appearance.getByRole("button", { name: "System", exact: true });
    await expect(appearance.getByRole("button")).toHaveCount(2);
    await expect(appearance.getByRole("combobox")).toHaveCount(0);
    await expect(system).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveText("Light");
    await toggle.click();
    await expect(toggle).toHaveText("Dark");
    await expect(system).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem("abangcebu-theme"))).toBe("dark");
    await page.emulateMedia({ colorScheme: "dark" });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveText("Light");
    await expect(page.locator("html")).toHaveClass(/light/);
    expect(await page.evaluate(() => localStorage.getItem("abangcebu-theme"))).toBe("light");
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/light/);
    await page.getByRole("button", { name: "Open menu" }).click();
    await system.click();
    await expect(system).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveText("Dark");
    await expect(page.locator("main")).toHaveAttribute("data-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("main")).toHaveAttribute("data-theme", "light");
    await expect(toggle).toHaveText("Light");
    await page.reload();
    expect(await page.evaluate(() => localStorage.getItem("abangcebu-theme"))).toBe("system");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("main")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Open menu" }).click();
    await toggle.click();
    await expect(page.locator("main")).toHaveAttribute("data-theme", "light");
    await expect(system).toHaveAttribute("aria-pressed", "false");
    for (const button of [toggle, system]) {
      const bounds = await button.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    }
    await page.screenshot({ path: `/home/hrmr/.hermes/cache/scratch/appearance-one-tap-${width}.png` });
  });
}

for (const mode of ["animated", "reduced", "unsupported"] as const) {
  test(`circle theme transition: ${mode}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: mode === "reduced" ? "reduce" : "no-preference" });
    if (mode === "unsupported") await page.addInitScript(() => Object.defineProperty(document, "startViewTransition", { value: undefined }));
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator("main")).toHaveAttribute("data-theme", "dark");
    if (mode === "animated") {
      await expect.poll(() => page.evaluate(() => document.getAnimations().some(animation =>
        animation.effect instanceof KeyframeEffect && animation.effect.getKeyframes().some(frame => String(frame.clipPath).includes("circle("))
      ))).toBe(true);
    } else {
      expect(await page.evaluate(() => document.getAnimations().some(animation => animation.effect instanceof KeyframeEffect && animation.effect.getKeyframes().some(frame => String(frame.clipPath).includes("circle("))))).toBe(false);
    }
    await expect(page.getByRole("dialog", { name: "AbangCebu Menu" })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("abangcebu-theme"))).toBe("dark");
  });
}

test("explicit dark preference applies dark tokens when the operating system is light", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => localStorage.setItem("abangcebu-theme", "dark"));
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect.poll(() => page.locator("html").evaluate((element) => getComputedStyle(element).getPropertyValue("--background").trim())).toBe("#10151c");
});

test("dark theme updates the finder logo asset", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("abangcebu-theme", "dark"));
  await page.goto("/");
  await expect(page.locator('header img[alt="AbangCebu"]')).toHaveAttribute("src", /main_Logo_Light\.png/);
});
