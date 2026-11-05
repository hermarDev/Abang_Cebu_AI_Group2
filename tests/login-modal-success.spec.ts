import { test, expect } from "./fixtures";

test("successful login closes the account dialog", async ({ page }) => {
  let tokenRequests = 0;
  let profileRequests = 0;
  await page.route(url => url.pathname === "/auth/v1/token", route => { tokenRequests++; return route.fulfill({ json: {
    access_token: "fixture-token", token_type: "bearer", expires_in: 3600, refresh_token: "fixture-refresh",
    user: { id: "00000000-0000-0000-0000-000000000001", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" },
  } }); });
  await page.route(url => url.pathname === "/rest/v1/profiles", route => { profileRequests++; return route.fulfill({ json: { role: "renter", is_suspended: false } }); });
  await page.goto("/");
  await page.getByRole("button", { name: "Open account dialog" }).click();
  const dialog = page.getByRole("dialog", { name: "Account access" });
  await dialog.getByLabel("Email Address", { exact: true }).fill("fixture@example.invalid");
  await dialog.getByLabel("Password", { exact: true }).fill("Fixture-password1!");
  await dialog.locator("form").getByRole("button", { name: "Log In", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(tokenRequests).toBe(1);
  expect(profileRequests).toBe(1);
});
