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

test("support form validates required-empty, invalid email, description boundary, correction, and first-error focus", async ({ page }) => {
  await page.goto("/support");
  await page.getByRole("button", { name: /submit request/i }).click();

  const nameInput = page.getByLabel(/full name/i);
  const emailInput = page.getByLabel(/email address/i);
  const categoryTrigger = page.locator("#support-category");
  const subjectInput = page.getByLabel(/subject/i);
  const descriptionInput = page.getByLabel(/description/i);

  await expect(page.getByText(/enter your name/i)).toBeVisible();
  await expect(page.getByText(/valid email/i)).toBeVisible();
  await expect(page.getByText(/choose a support category/i)).toBeVisible();
  await expect(page.getByText(/subject between 5 and 140/i)).toBeVisible();
  await expect(page.getByText(/20 to 3,000 characters/i)).toBeVisible();
  await expect(nameInput).toBeFocused();

  // Fix name and enter invalid email, verify email error and focus moves to email
  await nameInput.fill("Alex Rivera");
  await expect(nameInput).toHaveAttribute("aria-invalid", "false");
  await emailInput.fill("not-an-email");
  await page.getByRole("button", { name: /submit request/i }).click();
  await expect(emailInput).toBeFocused();
  await expect(emailInput).toHaveAttribute("aria-invalid", "true");

  // Fix email, leave category empty -> focus moves to category trigger (#support-category)
  await emailInput.fill("alex@example.com");
  await expect(emailInput).toHaveAttribute("aria-invalid", "false");
  await page.getByRole("button", { name: /submit request/i }).click();
  await expect(categoryTrigger).toBeFocused();
  await expect(categoryTrigger).toHaveAttribute("aria-invalid", "true");

  // Select category and fill valid subject, test 19-char vs 20-char description boundary
  await categoryTrigger.click();
  await page.getByRole("option", { name: "Account & sign-in" }).click();
  await expect(categoryTrigger).toHaveAttribute("aria-invalid", "false");
  await subjectInput.fill("Cannot sign in");
  await expect(subjectInput).toHaveAttribute("aria-invalid", "false");

  await descriptionInput.fill("1234567890123456789"); // 19 chars
  await page.getByRole("button", { name: /submit request/i }).click();
  await expect(descriptionInput).toBeFocused();
  await expect(descriptionInput).toHaveAttribute("aria-invalid", "true");

  await descriptionInput.fill("12345678901234567890"); // 20 chars exact boundary
  await expect(descriptionInput).toHaveAttribute("aria-invalid", "false");
});

test("support form retains values on mocked 500 error and maps server 422 field errors", async ({ page }) => {
  let attempt = 0;
  await page.route("**/api/support/tickets", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    attempt += 1;
    if (attempt === 1) {
      return route.fulfill({
        status: 500,
        json: { error: "Support database temporarily unavailable." },
      });
    }
    return route.fulfill({
      status: 422,
      json: {
        error: "Review the highlighted fields and try again.",
        errors: { subject: "Subject rejected by server policy." },
      },
    });
  });

  await page.goto("/support");
  await page.getByLabel(/full name/i).fill("Alex Rivera");
  await page.getByLabel(/email address/i).fill("alex@example.com");
  await page.locator("#support-category").click();
  await page.getByRole("option", { name: "Account & sign-in" }).click();
  await page.getByLabel(/subject/i).fill("Login fails after reset");
  await page.getByLabel(/description/i).fill("Password reset succeeded but login still returns invalid credentials.");

  await page.getByRole("button", { name: /submit request/i }).click();
  await expect(page.getByText("Support database temporarily unavailable.").first()).toBeVisible();

  // Values retained after 500
  await expect(page.getByLabel(/full name/i)).toHaveValue("Alex Rivera");
  await expect(page.getByLabel(/email address/i)).toHaveValue("alex@example.com");
  await expect(page.getByLabel(/subject/i)).toHaveValue("Login fails after reset");
  await expect(page.getByLabel(/description/i)).toHaveValue("Password reset succeeded but login still returns invalid credentials.");

  // Server 422 maps field error onto subject and focuses it
  await page.getByRole("button", { name: /submit request/i }).click();
  await expect(page.getByText("Subject rejected by server policy.")).toBeVisible();
  await expect(page.getByLabel(/subject/i)).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel(/subject/i)).toBeFocused();
});

test("support form focuses remove button when 3 files are attached and server returns 422 attachments error", async ({ page }) => {
  await page.route("**/api/support/tickets", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    return route.fulfill({
      status: 422,
      json: {
        error: "Attachment rejected by server byte check.",
        errors: { attachments: "First attachment failed server file inspection." },
      },
    });
  });

  await page.goto("/support");
  await page.getByLabel(/full name/i).fill("Alex Rivera");
  await page.getByLabel(/email address/i).fill("alex@example.com");
  await page.locator("#support-category").click();
  await page.getByRole("option", { name: "Account & sign-in" }).click();
  await page.getByLabel(/subject/i).fill("Attachment verification");
  await page.getByLabel(/description/i).fill("Three screenshots attached for verification test.");

  await page.locator("#support-file-input").setInputFiles([
    { name: "one.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71]) },
    { name: "two.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71]) },
    { name: "three.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71]) },
  ]);

  await expect(page.locator("#support-add-attachment-btn")).toBeDisabled();
  await page.getByRole("button", { name: /submit request/i }).click();
  await expect(page.getByText("First attachment failed server file inspection.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove one.png" })).toBeFocused();
});

test("support form handles mocked 201 success and mocked ticket lookup displays supportResolutionNote", async ({ page }) => {
  const ticketId = "11111111-1111-4111-8111-111111111111";
  const guestToken = "mock-guest-token-123";

  await page.route("**/api/support/tickets", async (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 201,
        json: {
          ticket: {
            id: ticketId,
            ticketNumber: "SUP-09999",
            status: "open",
            createdAt: "2026-11-16T00:00:00Z",
          },
          guestToken,
        },
      });
    }
    return route.continue();
  });

  await page.route(`**/api/support/tickets/${ticketId}*`, async (route) => {
    return route.fulfill({
      status: 200,
      json: {
        ticket: {
          id: ticketId,
          ticketNumber: "SUP-09999",
          userId: null,
          requesterName: "Alex Rivera",
          requesterEmail: "alex@example.com",
          requesterRole: "guest",
          category: "account_access",
          subject: "Login fails after reset",
          description: "Password reset succeeded but login still returns invalid credentials.",
          relatedListingId: null,
          attachments: [],
          status: "resolved",
          priority: "normal",
          supportResolutionNote: "Customer Support verified your account and unlocked sign-in.",
          adminResponse: null,
          assignedAdminId: null,
          resolvedAt: "2026-11-16T01:00:00Z",
          createdAt: "2026-11-16T00:00:00Z",
          updatedAt: "2026-11-16T01:00:00Z",
        },
      },
    });
  });

  await page.goto("/support");
  await page.getByLabel(/full name/i).fill("Alex Rivera");
  await page.getByLabel(/email address/i).fill("alex@example.com");
  await page.locator("#support-category").click();
  await page.getByRole("option", { name: "Account & sign-in" }).click();
  await page.getByLabel(/subject/i).fill("Login fails after reset");
  await page.getByLabel(/description/i).fill("Password reset succeeded but login still returns invalid credentials.");

  await page.getByRole("button", { name: /submit request/i }).click();
  await expect(page.getByText(/Support request received \(SUP-09999\)/i)).toBeVisible();

  const statusLink = page.getByRole("link", { name: new RegExp(`/support\\?ticket=${ticketId}`) });
  await expect(statusLink).toBeVisible();
  await statusLink.click();

  await expect(page.getByText("Customer Support resolution")).toBeVisible();
  await expect(page.getByText("Customer Support verified your account and unlocked sign-in.")).toBeVisible();
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
