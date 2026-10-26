import { test, expect } from "./fixtures";

for (const error of ["expired_recovery_link", "invalid_recovery_link"]) {
  test(`recovery callback notice is visible for ${error}`, async ({ page }) => {
    await page.goto(`/login?error=${error}`);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("This password reset link is invalid or expired. Request a new link using Forgot password.")).toBeVisible();
    await dialog.getByRole("button", { name: /forgot password/i }).click();
    await expect(dialog.getByRole("button", { name: /send.*link/i })).toBeVisible();
  });
}

test("unknown recovery error is not reflected", async ({ page }) => {
  await page.goto("/login?error=untrusted_notice");
  await expect(page.getByText("untrusted_notice", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/This password reset link is invalid/)).toHaveCount(0);
});
