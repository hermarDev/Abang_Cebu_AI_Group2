import { test, expect } from "./fixtures";

test("recovery mismatch stays visible until either value matches", async ({ page, context }) => {
  await context.addCookies([{ name: "abangcebu-password-reset", value: "1", url: "http://127.0.0.1:3218" }]);
  await page.goto("/reset-password");
  const dialog = page.getByRole("dialog");
  const password = dialog.getByLabel("New password", { exact: true });
  const confirm = dialog.getByLabel("Confirm new password", { exact: true });
  await password.fill("FirstPass1!");
  await confirm.fill("OtherPass1!");
  await dialog.getByRole("button", { name: "Update Password" }).click();
  await expect(confirm).toBeFocused();
  await expect(confirm).toHaveAttribute("aria-invalid", "true");
  await confirm.fill("StillWrong1!");
  await expect(confirm).toHaveAttribute("aria-invalid", "true");
  await password.fill("StillWrong1!");
  await expect(confirm).toHaveAttribute("aria-invalid", "false");
  await confirm.fill("Different1!");
  await expect(confirm).toHaveAttribute("aria-invalid", "true");
  await confirm.fill("StillWrong1!");
  await expect(confirm).toHaveAttribute("aria-invalid", "false");
});

test("recovery keeps submitted password fields stable while pending", async ({ page, context }) => {
  await context.addCookies([{ name: "abangcebu-password-reset", value: "1", url: "http://127.0.0.1:3218" }]);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/auth/reset-password/confirm", async route => {
    await held;
    await route.fulfill({ status: 422, json: { success: false, error: { code: "WEAK_PASSWORD", message: "Choose a stronger password." } } });
  });
  try {
    await page.goto("/reset-password");
    const dialog = page.getByRole("dialog");
    const password = dialog.getByLabel("New password", { exact: true });
    const confirm = dialog.getByLabel("Confirm new password", { exact: true });
    await password.fill("weakpassword");
    await confirm.fill("weakpassword");
    await dialog.getByRole("button", { name: "Update Password" }).click();
    await expect(dialog.getByRole("button", { name: "Updating password..." })).toBeDisabled();
    await expect(password).toHaveAttribute("readonly", "");
    await expect(confirm).toHaveAttribute("readonly", "");
    release();
    await expect(password).not.toHaveAttribute("readonly", "");
    await expect(confirm).not.toHaveAttribute("readonly", "");
    await expect(password).toHaveAttribute("aria-invalid", "true");
  } finally {
    release();
  }
});

test("recovery pending response retains values on service failure", async ({ page, context }) => {
  await context.addCookies([{ name: "abangcebu-password-reset", value: "1", url: "http://127.0.0.1:3218" }]);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/auth/reset-password/confirm", async route => {
    await held;
    await route.fulfill({ status: 500, json: { success: false, error: { code: "INTERNAL_AUTH_ERROR", message: "We could not update your password. Try again later." } } });
  });
  try {
    await page.goto("/reset-password");
    const dialog = page.getByRole("dialog");
    const password = dialog.getByLabel("New password", { exact: true });
    const confirm = dialog.getByLabel("Confirm new password", { exact: true });
    await password.fill("RecoveryPass1!");
    await confirm.fill("RecoveryPass1!");
    await dialog.getByRole("button", { name: "Update Password" }).click();
    await expect(password).toHaveAttribute("readonly", "");
    await expect(confirm).toHaveAttribute("readonly", "");
    release();
    await expect(dialog.getByRole("alert")).toHaveText("We could not update your password. Try again later.");
    await expect(password).not.toHaveAttribute("readonly", "");
    await expect(confirm).not.toHaveAttribute("readonly", "");
    await expect(password).toHaveValue("RecoveryPass1!");
    await expect(confirm).toHaveValue("RecoveryPass1!");
  } finally { release(); }
});

test("recovery pending response redirects after confirmed success", async ({ page, context }) => {
  await context.addCookies([{ name: "abangcebu-password-reset", value: "1", url: "http://127.0.0.1:3218" }]);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/auth/reset-password/confirm", async route => {
    await held;
    await route.fulfill({ status: 200, json: { success: true, message: "Password successfully updated. All previous sessions have been invalidated.", data: { redirectUrl: "/login?message=password_reset_success" } } });
  });
  try {
    await page.goto("/reset-password");
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("New password", { exact: true }).fill("RecoveryPass1!");
    await dialog.getByLabel("Confirm new password", { exact: true }).fill("RecoveryPass1!");
    await dialog.getByRole("button", { name: "Update Password" }).click();
    await expect(dialog.getByRole("button", { name: "Updating password..." })).toBeDisabled();
    release();
    await expect(page).toHaveURL(/\/login\?message=password_reset_success/);
    await expect(page.getByText("Your password has been reset. Sign in with your new password.")).toBeVisible();
  } finally { release(); }
});

for (const response of [
  { status: 401, code: "AUTH_PASSWORD_RESET_TOKEN_INVALID", message: "Your recovery session is invalid or expired. Request a new link." },
  { status: 502, code: "INTERNAL_AUTH_ERROR", message: "The password changed, but global session revocation failed. Contact support before continuing." },
]) {
  test(`recovery displays ${response.status} without claiming full success`, async ({ page, context }) => {
    await context.addCookies([{ name: "abangcebu-password-reset", value: "1", url: "http://127.0.0.1:3218" }]);
    await page.route("**/api/auth/reset-password/confirm", route => route.fulfill({ status: response.status, json: { success: false, error: { code: response.code, message: response.message } } }));
    await page.goto("/reset-password");
    const dialog = page.getByRole("dialog");
    const password = dialog.getByLabel("New password", { exact: true });
    const confirmation = dialog.getByLabel("Confirm new password", { exact: true });
    await password.fill("RecoveryPass1!");
    await confirmation.fill("RecoveryPass1!");
    await dialog.getByRole("button", { name: "Update Password" }).click();
    await expect(dialog.getByRole("alert")).toHaveText(response.message);
    await expect(password).toHaveValue("RecoveryPass1!");
    await expect(confirmation).toHaveValue("RecoveryPass1!");
    await expect(page).toHaveURL(/\/reset-password/);
    await expect(page.getByText("Your password has been reset. Sign in with your new password.")).toHaveCount(0);
  });
}

test("recovery retains values on a network rejection", async ({ page, context }) => {
  await context.addCookies([{ name: "abangcebu-password-reset", value: "1", url: "http://127.0.0.1:3218" }]);
  await page.route("**/api/auth/reset-password/confirm", route => route.abort("failed"));
  await page.goto("/reset-password");
  const dialog = page.getByRole("dialog");
  const password = dialog.getByLabel("New password", { exact: true });
  const confirmation = dialog.getByLabel("Confirm new password", { exact: true });
  await password.fill("RecoveryPass1!");
  await confirmation.fill("RecoveryPass1!");
  await dialog.getByRole("button", { name: "Update Password" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Password recovery is temporarily unavailable. Try again.");
  await expect(password).toHaveValue("RecoveryPass1!");
  await expect(confirmation).toHaveValue("RecoveryPass1!");
  await expect(dialog.getByRole("button", { name: "Update Password" })).toBeEnabled();
  await expect(page).toHaveURL(/\/reset-password/);
});

test("recovery weak password is associated with its input and retains values", async ({ page, context }) => {
  await context.addCookies([{ name: "abangcebu-password-reset", value: "1", url: "http://127.0.0.1:3218" }]);
  await page.route("**/api/auth/reset-password/confirm", route => route.fulfill({ status: 422, json: { success: false, error: { code: "WEAK_PASSWORD", message: "Choose a stronger password." } } }));
  await page.goto("/reset-password");
  const dialog = page.getByRole("dialog");
  const password = dialog.getByLabel("New password", { exact: true });
  const confirm = dialog.getByLabel("Confirm new password", { exact: true });
  await expect(password).toHaveAccessibleDescription(/at least three/);
  await password.fill("weakpassword");
  await confirm.fill("weakpassword");
  await dialog.getByRole("button", { name: "Update Password" }).click();
  await expect(password).toHaveAttribute("aria-invalid", "true");
  await expect(password).toBeFocused();
  await expect(password).toHaveAccessibleDescription(/at least three[\s\S]*Choose a stronger password/);
  await expect(password).toHaveValue("weakpassword");
  await expect(confirm).toHaveValue("weakpassword");
  await password.fill("BetterPass1!");
  await expect(password).toHaveAttribute("aria-invalid", "false");
  await expect(password).toHaveAccessibleDescription(/at least three/);
});
