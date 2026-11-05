/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node browser harness. */
// Synthetic account actions; this does not contact an authentication or storage provider.
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");
const { build } = require(require.resolve("esbuild", { paths: [require.resolve("vitest/package.json")] }));
const root = path.resolve(__dirname, "../..");
const mock = path.join(__dirname, "next-mock.jsx");

async function main() {
  const bundle = await build({
    stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {AccountSettingsForm} from './src/app/account/AccountSettingsForm'; import {AppToaster} from './src/components/ui/AppToaster'; createRoot(document.getElementById('root')).render(<><AppToaster /><AccountSettingsForm profile={{fullName:'Test User',phoneNumber:null,email:'test@example.invalid',role:'renter',avatarUrl:'/photo.png'}} /></>);`, resolveDir: root, loader: "tsx" },
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic", loader: { ".module.css": "empty" }, nodePaths: [path.join(root, "node_modules")], alias: { "@": path.join(root, "src") },
    plugins: [{ name: "test-stubs", setup(builder) {
      builder.onResolve({ filter: /^\.\/actions$/ }, args => args.resolveDir === path.join(root, "src/app/account") ? { path: "actions", namespace: "fixture" } : null);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: `export const removeAccountAvatar = () => window.removePhoto(); export const updateAccountAvatar = () => window.uploadPhoto(); export const updateAccountProfile = () => {}; export const updateAccountPassword = () => {};`, loader: "js" }));
      builder.onResolve({ filter: /^next\/(image|link)$/ }, args => ({ path: mock, namespace: args.path === "next/link" ? "mock-link" : "file" }));
      builder.onLoad({ filter: /.*/, namespace: "mock-link" }, () => ({ contents: `export { MockLink as default } from ${JSON.stringify(mock)}`, loader: "jsx", resolveDir: root }));
    } }],
  });
  const server = http.createServer((req, res) => { if (req.url === "/bundle.js") { res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }); res.end(bundle.outputFiles[0].contents); } else { res.writeHead(200, { "content-type": "text/html" }); res.end('<!doctype html><html><body><div id="root"></div><script src="/bundle.js"></script></body></html>'); } });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on("pageerror", error => console.error("Browser error:", error));
    await page.addInitScript(() => { window.removePhoto = () => Promise.reject(new Error("Network failure")); });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.getByRole("button", { name: "Remove photo" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Remove photo" }).click();
    const alert = page.getByRole("alert");
    await alert.waitFor();
    assert.equal(await alert.innerText(), "We couldn’t confirm whether your photo was removed. Check your profile before trying again.");
    assert.equal(await page.getByRole("button", { name: "View profile photo" }).isVisible(), true);
    assert.equal(await page.locator("[data-sonner-toast]").count(), 0, "Rejection must not show success");
    await page.evaluate(() => { window.removePhoto = () => new Promise(resolve => { window.resolveRemoval = resolve; }); });
    await page.getByRole("button", { name: "Remove photo" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Remove photo" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Removing…" }).waitFor();
    assert.equal(await page.locator("[data-sonner-toast]").count(), 0, "Pending removal must not show success");
    await page.evaluate(() => window.resolveRemoval({ success: true, message: "Your profile photo was removed.", avatarUrl: null }));
    await page.locator("[data-sonner-toast]").filter({ hasText: "Your profile photo was removed." }).waitFor({ timeout: 3000 });
    assert.equal(await page.getByRole("button", { name: "View profile photo" }).count(), 0);
    assert.equal(await page.locator("p[role=status]").filter({ hasText: "Your profile photo was removed." }).count(), 0, "Success must not be duplicated inline");
    await page.evaluate(() => { window.uploadPhoto = () => new Promise(resolve => { window.resolveUpload = resolve; }); });
    const image = Buffer.from(await page.evaluate(() => { const canvas = document.createElement("canvas"); canvas.width = 2; canvas.height = 2; return canvas.toDataURL("image/png").split(",")[1]; }), "base64");
    await page.getByLabel("Choose a profile photo").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: image });
    await page.getByRole("button", { name: "Upload photo" }).click();
    await page.waitForFunction(() => typeof window.resolveUpload === "function");
    assert.equal(await page.locator("[data-sonner-toast]").filter({ hasText: "Your profile photo was updated." }).count(), 0, "Pending upload must not show success");
    await page.evaluate(() => window.resolveUpload({ success: true, message: "Your profile photo was updated.", avatarUrl: "/new-photo.png" }));
    await page.locator("[data-sonner-toast]").filter({ hasText: "Your profile photo was updated." }).waitFor();
    assert.equal(await page.locator("p[role=status]").filter({ hasText: "Your profile photo was updated." }).count(), 0, "Upload success must not be duplicated inline");
    assert.equal(await page.getByRole("button", { name: "View profile photo" }).isVisible(), true);
    console.log("PASS: removal rejection, pending, confirmed success and no duplicate feedback; upload pending and success (mock actions)");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
