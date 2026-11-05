/* eslint-disable @typescript-eslint/no-require-imports -- This standalone harness uses Node CommonJS. */
// Isolated component test: actions are synthetic; no authentication or provider calls.
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");
const root = path.resolve(__dirname, "../..");
const { build } = require(require.resolve("esbuild", { paths: [require.resolve("vitest/package.json")] }));
const mock = path.join(__dirname, "next-mock.jsx");

async function main() {
  const bundle = await build({
    entryPoints: [path.join(__dirname, "account-entry.tsx")], bundle: true, write: false,
    format: "iife", platform: "browser", jsx: "automatic", loader: { ".module.css": "empty" }, nodePaths: [path.join(root, "node_modules")],
    alias: { "@": path.join(root, "src") }, plugins: [{ name: "test-stubs", setup(builder) {
      builder.onResolve({ filter: /^\.\/actions$/ }, args => args.resolveDir === path.join(root, "src/app/account") ? { path: path.join(__dirname, "account-actions.js") } : null);
      builder.onResolve({ filter: /^next\/(image|link)$/ }, args => ({ path: mock, namespace: args.path === "next/link" ? "mock-link" : "file" }));
      builder.onLoad({ filter: /.*/, namespace: "mock-link" }, () => ({ contents: `export { MockLink as default } from ${JSON.stringify(mock)}`, loader: "jsx", resolveDir: root }));
    } }],
  });
  const server = http.createServer((req, res) => {
    if (req.url === "/bundle.js") { res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }); res.end(bundle.outputFiles[0].contents); }
    else { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>'); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const legacyPage = await browser.newPage();
    await legacyPage.goto(`http://127.0.0.1:${server.address().port}/?phone=%2B14155552671`);
    await legacyPage.getByLabel("Full name").fill("Updated User");
    assert.equal(await legacyPage.getByRole("button", { name: "Save changes" }).isEnabled(), true, "An unchanged international phone permits name updates");
    await legacyPage.close();
    const page = await browser.newPage({ viewport: { width: 320, height: 720 } });
    await page.addInitScript(() => {
      window.calls = [];
      window.testAction = (kind, data) => { window.calls.push({ kind, data }); return new Promise((resolve, reject) => { window.resolveAction = resolve; window.rejectAction = reject; }); };
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.getByLabel("Full name").fill("Updated User");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForFunction(() => window.calls.length === 1);
    assert.equal(await page.locator("[data-sonner-toast]").count(), 0, "No toast while profile action is pending");
    assert.equal(await page.getByLabel("Full name").isDisabled(), true, "Pending save prevents overwriting newer name edits");
    assert.equal(await page.getByLabel("Phone number").isDisabled(), true, "Pending save prevents overwriting newer phone edits");
    await page.evaluate(() => window.resolveAction({ success: true, message: "Profile updated.", profile: { fullName: "Updated User", phoneNumber: null } }));
    await page.locator("[data-sonner-toast]").filter({ hasText: "Profile updated." }).waitFor();
    assert.equal(await page.locator("p[role=status]").filter({ hasText: "Profile updated." }).count(), 0, "No duplicate inline profile success");
    await page.getByLabel("Full name").fill("Another Name");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForFunction(() => window.calls.length === 2);
    await page.evaluate(() => window.resolveAction({ success: false, message: "We could not save your details." }));
    await page.getByRole("alert").getByText("We could not save your details.").waitFor();
    assert.equal(await page.getByLabel("Full name").inputValue(), "Another Name");
    assert.equal(await page.locator("[data-sonner-toast]").count(), 1, "Failure must not create another toast");
    await page.getByRole("button", { name: "Change password" }).click();
    const dialog = page.getByRole("dialog");
    const emptyCurrent = dialog.getByLabel("Current password", { exact: true });
    await emptyCurrent.focus();
    await emptyCurrent.blur();
    assert.equal(await emptyCurrent.getAttribute("aria-invalid"), "true", "Touched empty current password is invalid");
    assert.equal(await dialog.locator("#account-current-error").innerText(), "Enter your current password.");
    assert.equal(await emptyCurrent.getAttribute("aria-describedby"), "account-current-error");
    await emptyCurrent.fill("Temporary1!");
    assert.equal(await emptyCurrent.getAttribute("aria-invalid"), "false", "Typing clears required current-password error");
    assert.equal(await dialog.locator("#account-current-error").count(), 0);
    const emptyConfirmation = dialog.getByLabel("Confirm new password", { exact: true });
    await emptyConfirmation.focus();
    await emptyConfirmation.blur();
    assert.equal(await emptyConfirmation.getAttribute("aria-invalid"), "true", "Touched empty confirmation is invalid even when both fields are empty");
    assert.equal(await emptyConfirmation.getAttribute("aria-describedby"), "password-mismatch");
    assert.equal(await dialog.locator("#password-mismatch").innerText(), "Confirm your new password.");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Change password" }).click();
    assert.equal(await emptyCurrent.inputValue(), "", "Cancel clears entered values");
    assert.equal(await emptyCurrent.getAttribute("aria-invalid"), "false", "Reopened current field is untouched");
    assert.equal(await emptyConfirmation.getAttribute("aria-invalid"), "false", "Reopened confirmation field is untouched");
    assert.equal(await dialog.locator("#password-mismatch").count(), 0, "Reopened dialog has no stale error");
    const newPassword = dialog.getByLabel("New password", { exact: true });
    assert.equal(await dialog.getByText("Passwords match.").count(), 0);
    await emptyCurrent.fill("SamePassword1!");
    await newPassword.fill("SamePassword1!");
    await emptyConfirmation.fill("SamePassword1!");
    assert.equal(await dialog.getByText("Choose a different password.").count(), 1);
    assert.equal(await dialog.getByRole("button", { name: "Update password" }).isDisabled(), true);
    assert.equal(await dialog.getByText("Passwords match.").count(), 1);
    await newPassword.fill("Different1!");
    assert.equal(await dialog.getByText("Choose a different password.").count(), 0);
    assert.equal(await dialog.getByText("Passwords match.").count(), 0);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await page.getByRole("button", { name: "Change password" }).click();
    await newPassword.fill("weak");
    assert.equal(await newPassword.getAttribute("aria-invalid"), "false", "Do not mark the field invalid while initially typing");
    await newPassword.blur();
    assert.equal(await newPassword.getAttribute("aria-invalid"), "true", "Weak new password is invalid after blur");
    await newPassword.fill("");
    assert.equal(await newPassword.getAttribute("aria-invalid"), "true", "A cleared touched password remains invalid");
    assert.match(await dialog.locator("#password-requirements").innerText(), /Enter a new password/);
    await newPassword.fill("NewSample2!");
    assert.equal(await newPassword.getAttribute("aria-invalid"), "false", "Valid new password has aria-invalid=false");
    await dialog.getByLabel("Current password", { exact: true }).fill("CurrentSample1!");
    const confirmation = dialog.getByLabel("Confirm new password", { exact: true });
    await confirmation.fill("New");
    await dialog.getByRole("button", { name: "Show confirm new password" }).click();
    assert.equal(await confirmation.getAttribute("aria-invalid"), "false", "Visibility toggle must not validate an unfinished confirmation");
    await confirmation.focus();
    assert.equal(await confirmation.getAttribute("aria-invalid"), "false", "Do not show mismatch while initially typing");
    assert.equal(await dialog.getByText("Passwords do not match.").count(), 0);
    await confirmation.blur();
    assert.equal(await confirmation.getAttribute("aria-invalid"), "true", "Mismatch is invalid after blur");
    assert.equal(await confirmation.getAttribute("aria-describedby"), "password-mismatch");
    assert.equal(await dialog.locator("#password-mismatch").innerText(), "Passwords do not match.");
    await confirmation.fill("");
    assert.equal(await confirmation.getAttribute("aria-invalid"), "true", "A cleared touched confirmation remains invalid");
    assert.equal(await dialog.locator("#password-mismatch").innerText(), "Confirm your new password.");
    await confirmation.fill("NewSample2!");
    assert.equal(await confirmation.getAttribute("aria-invalid"), "false", "Correcting confirmation clears the mismatch");
    await dialog.getByRole("button", { name: "Update password" }).click();
    await page.waitForFunction(() => window.calls.length === 3);
    assert.equal(await page.getByText("Your password was updated.").count(), 0, "No password success while pending");
    await page.evaluate(() => window.resolveAction({ success: false, field: "currentPassword", message: "Current password is incorrect." }));
    await dialog.getByRole("alert").getByText("Current password is incorrect.").waitFor();
    const currentPassword = dialog.getByLabel("Current password", { exact: true });
    assert.equal(await currentPassword.getAttribute("aria-invalid"), "true", "Incorrect current password is marked invalid");
    assert.equal(await currentPassword.evaluate(element => element === document.activeElement), true, "Invalid current password receives focus");
    const description = await currentPassword.getAttribute("aria-describedby");
    assert.ok(description, "Current password error must be associated with the field");
    assert.match(await dialog.locator(`#${description}`).innerText(), /Current password is incorrect/);
    assert.equal(await currentPassword.inputValue(), "CurrentSample1!");
    await currentPassword.fill("CorrectedSample2!");
    assert.equal(await currentPassword.getAttribute("aria-invalid"), "false", "Editing clears the old server error");
    await dialog.getByRole("button", { name: "Update password" }).click();
    await page.waitForFunction(() => window.calls.length === 4);
    await page.evaluate(() => window.resolveAction({ success: false, message: "Password service is unavailable." }));
    await dialog.getByRole("alert").getByText("Password service is unavailable.").waitFor();
    assert.equal(await currentPassword.getAttribute("aria-invalid"), "false", "Non-field failures must not blame the password");
    await dialog.getByRole("button", { name: "Update password" }).click();
    await page.waitForFunction(() => window.calls.length === 5);
    await page.evaluate(() => window.rejectAction(new Error("Network failure")));
    await dialog.getByRole("alert").getByText("We couldn’t confirm whether your password was updated. Check before trying again.").waitFor();
    assert.equal(await currentPassword.inputValue(), "CorrectedSample2!", "Password input is retained after an uncertain response");
    assert.equal(await page.locator("[data-sonner-toast]").filter({ hasText: "Your password was updated." }).count(), 0, "An uncertain response must not show success");
    await dialog.getByRole("button", { name: "Update password" }).click();
    await page.waitForFunction(() => window.calls.length === 6);
    await page.evaluate(() => window.resolveAction({ success: true, message: "Your password was updated." }));
    await page.locator("[data-sonner-toast]").filter({ hasText: "Your password was updated." }).waitFor();
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForFunction(() => window.calls.length === 7);
    await page.evaluate(() => window.rejectAction(new Error("Network failure")));
    await page.getByRole("alert").getByText("We couldn’t confirm whether your changes were saved. Check your profile before trying again.").waitFor({ timeout: 3000 });
    assert.equal(await page.getByLabel("Full name").inputValue(), "Another Name");
    assert.equal(await page.getByRole("button", { name: "Save changes" }).isEnabled(), true, "Retry remains available");
    const image = Buffer.from(await page.evaluate(() => { const canvas = document.createElement("canvas"); canvas.width = 2; canvas.height = 2; return canvas.toDataURL("image/png").split(",")[1]; }), "base64");
    await page.getByLabel("Choose a profile photo").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: image });
    await page.getByRole("button", { name: "Upload photo" }).click();
    await page.waitForFunction(() => window.calls.length === 8, { timeout: 5000 });
    await page.evaluate(() => window.rejectAction(new Error("Network failure")));
    await page.getByRole("alert").getByText("We couldn’t confirm whether your photo was updated. Check your profile before trying again.").waitFor();
    assert.equal(await page.getByRole("button", { name: "Upload photo" }).isEnabled(), true, "Photo remains available for retry");
    assert.equal(await page.locator("p[role=status]").filter({ hasText: "Your password was updated." }).count(), 0, "No duplicate inline password success");
    console.log("PASS: profile and password pending, success, failure, retained input, no duplicate inline success (mocked actions)");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
