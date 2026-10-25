import { test, expect } from "./fixtures";

for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
  test(`compact search and filters at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const queries: string[] = [];
    await page.route("**/api/places?**", route => {
      queries.push(new URL(route.request().url()).searchParams.get("q") ?? "");
      return route.fulfill({ json: { places: [] } });
    });
    await page.goto("/");
    const search = page.getByRole("search");
    const input = page.getByRole("combobox", { name: "Search places" });
    const submit = search.getByRole("button", { name: "Search", exact: true });
    await expect(submit.locator("svg.lucide-search")).toHaveCount(1);
    await expect(search.locator("svg.lucide-search")).toHaveCount(1);
    await expect(search.getByRole("button", { name: "Clear search" })).toHaveCount(0);
    await input.fill("Mandaue");
    await submit.click();
    await expect.poll(() => queries.length).toBe(1);
    await input.fill("Lahug");
    await input.press("Enter");
    await expect.poll(() => queries.length).toBe(2);
    expect(queries).toEqual(["Mandaue", "Lahug"]);
    await search.getByRole("button", { name: "Clear search" }).click();
    await expect(input).toHaveValue("");
    await expect(input).toBeFocused();
    const filters = page.getByRole("group", { name: "Rental search filters" });
    const searchBox = await search.boundingBox();
    const filterBox = await filters.boundingBox();
    expect(filterBox!.y).toBeGreaterThanOrEqual(searchBox!.y + searchBox!.height);
    expect(filterBox!.y - searchBox!.y - searchBox!.height).toBeLessThanOrEqual(24);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const button of await filters.getByRole("button").all()) {
      await button.scrollIntoViewIfNeeded();
      await button.click({ trial: true });
      const box = await button.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await filters.getByRole("button", { name: /^Budget/ }).click();
    await page.getByRole("radio", { name: "Up to ₱2,500", exact: true }).check();
    await page.getByRole("button", { name: "Apply budget" }).click();
    await filters.getByRole("button", { name: /^Property type/ }).click();
    await page.getByRole("checkbox", { name: "Private room", exact: true }).check();
    await page.getByRole("button", { name: "Apply types" }).click();
    await expect(filters.getByRole("button", { name: "Filters, 2 active filter categories", exact: true })).toBeVisible();
    expect(await filters.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
    const bounds = await filters.boundingBox();
    for (const button of await filters.getByRole("button").all()) {
      const box = await button.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(bounds!.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
    }
    await page.setViewportSize({ width, height: 480 });
    await input.fill("Mandaue");
    await input.press("Enter");
    await expect(page.getByText("No matching places in Cebu. Try a nearby landmark.")).toBeVisible();
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("radio", { name: "Dark", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page.locator("main")).toHaveAttribute("data-theme", "dark");
    await expect(submit).toBeVisible();
  });
}
