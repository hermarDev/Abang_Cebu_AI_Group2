import { test, expect } from "./fixtures";

test("login and registration update validation errors as fields are corrected", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open account dialog" }).click();
  const dialog = page.getByRole("dialog");
  const email = dialog.getByLabel("Email Address", { exact: true });
  const password = dialog.getByLabel("Password", { exact: true });
  await dialog.locator("form").getByRole("button", { name: "Log In", exact: true }).click();
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await email.fill("bad");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await email.fill("test@example.invalid");
  await expect(email).toHaveAttribute("aria-invalid", "false");
  await password.fill("something");
  await expect(password).toHaveAttribute("aria-invalid", "false");

  await dialog.getByRole("button", { name: "Register", exact: true }).click();
  const name = dialog.getByLabel("Full Name", { exact: true });
  await dialog.locator("form").getByRole("button", { name: "Register as Renter" }).click();
  await expect(name).toBeFocused();
  await name.fill("A");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await name.fill("Test User");
  await expect(name).toHaveAttribute("aria-invalid", "false");
  await email.fill("test@example.invalid");
  await expect(email).toHaveAttribute("aria-invalid", "false");
  await password.fill("StrongPass1!");
  await expect(password).toHaveAttribute("aria-invalid", "false");
});

test("registration retains and corrects a server field error", async ({ page }) => {
  await page.route("**/api/auth/register", route => route.fulfill({ status: 422, json: { success: false, error: { message: "Check your details.", details: { email: "This email is invalid." } } } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Open account dialog" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Register", exact: true }).click();
  const name = dialog.getByLabel("Full Name", { exact: true });
  const email = dialog.getByLabel("Email Address", { exact: true });
  const password = dialog.getByLabel("Password", { exact: true });
  await name.fill("Test User");
  await email.fill("first@example.invalid");
  await password.fill("StrongPass1!");
  await dialog.getByRole("button", { name: "Register as Renter" }).click();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(dialog.getByText("This email is invalid.")).toBeVisible();
  await expect(email).toBeFocused();
  await expect(email).toHaveAccessibleDescription("This email is invalid.");
  await email.fill("bad");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await email.fill("second@example.invalid");
  await expect(email).toHaveAttribute("aria-invalid", "false");
  await expect(name).toHaveValue("Test User");
  await expect(password).toHaveValue("StrongPass1!");
  await expect(dialog.getByText("Check your details.")).toBeVisible();
});
