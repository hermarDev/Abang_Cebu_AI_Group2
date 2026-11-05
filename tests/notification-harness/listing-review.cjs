/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser harness. */
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");
const root = path.resolve(__dirname, "../..");
const { build } = require(require.resolve("esbuild", { paths: [require.resolve("vitest/package.json")] }));

async function main() {
  const bundle = await build({
    entryPoints: [path.join(__dirname, "listing-review-entry.tsx")], bundle: true, write: false,
    format: "iife", platform: "browser", jsx: "automatic", loader: { ".module.css": "empty" },
    nodePaths: [path.join(root, "node_modules")], alias: { "@": path.join(root, "src") },
    plugins: [{ name: "search-fixture", setup(builder) {
      builder.onResolve({ filter: /^@\/components\/map\/MapSearch$/ }, () => ({ path: "search", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: 'import React from "react"; export default function MapSearch({onSelect}) { return <button type="button" onClick={() => onSelect({id:"fixture",label:"Fixture address",latitude:10,longitude:123})}>Choose fixture location</button> }', loader: "jsx", resolveDir: root }));
    } }],
  });
  const server = http.createServer((req, res) => {
    if (req.url === "/bundle.js") { res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }); res.end(bundle.outputFiles[0].contents); }
    else { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end('<!doctype html><html><body><div id="root"></div><script src="/bundle.js"></script></body></html>'); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('[name="title"]').fill("Test listing");
    await page.locator('[name="description"]').fill("A suitable fictional description for testing.");
    await page.locator('[name="propertyType"]').selectOption("private_room");
    await page.locator('[name="price"]').fill("5000");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Choose fixture location" }).click();
    await page.locator('[name="address"]').fill("Fixture address");
    await page.getByRole("button", { name: "Continue" }).click();
    const photos = page.locator('input[type="file"][multiple]');
    await photos.setInputFiles({ name: "valid.jpg", mimeType: "image/jpeg", buffer: Buffer.from("test") });
    await page.getByText("valid.jpg").waitFor();
    await photos.setInputFiles({ name: "large.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
    assert.equal(await page.getByText("valid.jpg").count(), 0, "Invalid replacement must clear previous photos");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator('[name="permitApplicability"]').selectOption("not_required");
    await page.locator('[name="permitNotRequiredConfirmed"]').check();
    await page.getByRole("button", { name: "Continue" }).click();
    const review = page.locator('[data-step-panel="4"]');
    assert.match(await review.innerText(), /Private room/);
    assert.doesNotMatch(await review.innerText(), /private_room/);
    console.log("PASS: mocked-location listing preview clears invalid photos and displays unit label");
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
