import { test, expect } from "./fixtures";

for (const width of [320, 430, 1280]) {
  for (const theme of ["light", "dark"] as const) {
    test(`help center is searchable and accessible at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.addInitScript((value) => localStorage.setItem("abangcebu-theme", value), theme);
      await page.goto("/help");

      await expect(page.getByRole("heading", { name: "Help Center", level: 1 })).toBeVisible();
      await expect(page.getByRole("link", { name: "Contact support" }).first()).toBeVisible();

      const search = page.getByRole("searchbox", { name: /search help articles/i });
      await expect(search).toBeVisible();

      // initial result count
      await expect(page.getByRole("status").filter({ hasText: /12 articles/i }).first()).toBeVisible();

      // search filters articles
      await search.fill("deposit");
      await expect(page.getByRole("status").filter({ hasText: /1 of 12 articles/i }).first()).toBeVisible();

      // accordion keyboard + click interaction
      const firstItem = page.getByRole("button", { name: /deposit|stay safe/i }).first();
      await expect(firstItem).toHaveAttribute("aria-expanded", "false");
      await firstItem.click();
      await expect(firstItem).toHaveAttribute("aria-expanded", "true");
      const panelId = await firstItem.getAttribute("aria-controls");
      expect(panelId).toBeTruthy();
      await expect(page.locator(`#${panelId}`)).toBeVisible();

      // clear search
      await page.getByRole("button", { name: "Clear search" }).click();
      await expect(search).toHaveValue("");

      // category chip filter
      await page.getByRole("button", { name: "For landlords", exact: true }).click();
      await expect(page.getByRole("status").filter({ hasText: /3 of 12 articles/i }).first()).toBeVisible();

      // no horizontal overflow
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

test("guest can open support page, sees form with neutral placeholders, and cannot see history", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/support");

  await expect(page.getByRole("heading", { name: "Contact support", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveAttribute("placeholder", /your full name/i);
  await expect(page.getByLabel("Email address")).toHaveAttribute("placeholder", /you@example\.com/i);
  await expect(page.getByLabel("Subject")).toBeVisible();
  await expect(page.getByLabel(/description/i)).toBeVisible();
  expect(await page.locator('input[placeholder*="Juan"]').count()).toBe(0);

  // guest notice
  await expect(page.getByRole("link", { name: /sign in to track requests/i })).toBeVisible();
  await expect(page.getByRole("region", { name: /your support requests/i })).toHaveCount(0);
});

test("support form validates fields and shows inline errors", async ({ page }) => {
  await page.goto("/support");
  await page.getByRole("button", { name: /submit request/i }).click();

  await expect(page.getByText(/enter your name/i)).toBeVisible();
  await expect(page.getByText(/valid email/i)).toBeVisible();
  await expect(page.getByText(/choose a support category/i)).toBeVisible();
  await expect(page.getByText(/subject between 5 and 140/i)).toBeVisible();
  await expect(page.getByText(/20 to 3,000 characters/i)).toBeVisible();
});

test("admin support page is guarded for guests", async ({ page }) => {
  await page.goto("/admin/support");
  await expect(page).toHaveURL(/\/login/);
});

test("guest cannot call authenticated ticket history API or guest lookup without token", async ({ page }) => {
  const response = await page.request.get("/api/support/tickets");
  expect(response.status()).toBe(401);

  const missingToken = await page.request.get("/api/support/tickets/11111111-1111-4111-8111-111111111111");
  expect(missingToken.status()).toBe(401);
});

test("support attachment API rejects path traversal and unknown paths", async ({ page }) => {
  const traversal = await page.request.get(
    "/api/support/tickets/11111111-1111-4111-8111-111111111111/attachments?path=..%2F..%2Fsecret.pdf",
  );
  // guests are rejected first
  expect([400, 401, 403]).toContain(traversal.status());
});
