/* eslint-disable @typescript-eslint/no-require-imports -- This standalone harness uses Node CommonJS. */
// Component fixture: mocked favorites and Next primitives; not a live signed-in page.
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");
const { build } = require(require.resolve("esbuild", { paths: [require.resolve("vitest/package.json")] }));
const root = path.resolve(__dirname, "../..");
const mock = path.join(__dirname, "next-mock.jsx");

async function main() {
  const chunks = path.join(root, ".next/static/chunks");
  const cssPath = fs.readdirSync(chunks).filter(name => name.endsWith(".css")).map(name => path.join(chunks, name))
    .find(file => { const text = fs.readFileSync(file, "utf8"); return text.includes("overscroll-contain") && text.includes(".sticky"); });
  assert.ok(cssPath, "Build application CSS before running this harness");
  const css = fs.readFileSync(cssPath);
  const bundle = await build({
    entryPoints: [path.join(__dirname, "toast-entry.tsx")], bundle: true, write: false,
    format: "iife", platform: "browser", jsx: "automatic", nodePaths: [path.join(root, "node_modules")],
    alias: { "@": path.join(root, "src") }, plugins: [{ name: "next-stubs", setup(builder) {
      builder.onResolve({ filter: /^next\/(image|link)$/ }, args => ({ path: mock, namespace: args.path === "next/link" ? "mock-link" : "file" }));
      builder.onLoad({ filter: /.*/, namespace: "mock-link" }, () => ({ contents: `export { MockLink as default } from ${JSON.stringify(mock)}`, loader: "jsx", resolveDir: root }));
      builder.onResolve({ filter: /\/account\/AccountMapBackground$/ }, () => ({ path: mock, namespace: "mock-background" }));
      builder.onLoad({ filter: /.*/, namespace: "mock-background" }, () => ({ contents: "export function AccountMapBackground() { return null; }", loader: "jsx" }));
    } }],
  });
  const server = http.createServer((req, res) => {
    if (req.url === "/bundle.js") { res.writeHead(200, { "content-type": "text/javascript" }); return res.end(bundle.outputFiles[0].contents); }
    if (req.url === "/app.css") { res.writeHead(200, { "content-type": "text/css" }); return res.end(css); }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const [width, height] of [[320, 720], [568, 320], [1440, 720]]) for (const theme of ["light", "dark"]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
      await page.addInitScript(value => { localStorage.setItem("abangcebu-theme", value); document.documentElement.classList.add(value); }, theme);
      await page.route("**/api/favorites", route => route.request().method() === "GET"
        ? route.fulfill({ json: { favorites: [{ id: "fixture", title: "Fixture rental", description: "", price: 1, propertyType: "studio", address: "", city: "", imageUrls: [], isAvailable: true }] } })
        : route.fulfill({ json: { saved: false } }));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.getByRole("button", { name: "Remove Fixture rental from saved rentals" }).click();
      const toast = page.locator("[data-sonner-toast]");
      await toast.waitFor({ state: "visible" });
      await page.waitForFunction(() => { const t = document.querySelector("[data-sonner-toast]"); return t && t.getAttribute("data-mounted") === "true" && Math.abs(t.getBoundingClientRect().top - 112) < 1; });
      const t = await toast.boundingBox();
      const h = await page.locator("header").boundingBox();
      assert.ok(t && h && t.x >= 0 && t.y >= 0 && t.x + t.width <= width && t.y + t.height <= height, "Toast must fit viewport");
      assert.ok(!(t.x < h.x + h.width && t.x + t.width > h.x && t.y < h.y + h.height && t.y + t.height > h.y), "Toast must not cover header");
      const back = await page.getByRole("link", { name: "Back to map" }).boundingBox();
      const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("a")?.textContent, { x: back.x + back.width / 2, y: back.y + back.height / 2 });
      assert.match(hit || "", /Back to map/, "Back link must remain clickable");
      assert.equal(await page.locator("[data-sonner-toaster]").getAttribute("data-sonner-theme"), theme);
      const close = toast.getByRole("button", { name: /close/i });
      await page.getByRole("link", { name: "Back to map" }).focus();
      let reached = false;
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press("Tab");
        if (await close.evaluate(element => element === document.activeElement)) { reached = true; break; }
      }
      assert.equal(reached, true, "Close button must be reachable with Tab");
      await page.keyboard.press("Enter");
      await toast.waitFor({ state: "detached" });
      for (const type of ["success", "info", "warning", "error", "loading"]) {
        await page.getByRole("button", { name: `Show ${type}` }).click();
        const variant = page.locator(`[data-sonner-toast][data-type="${type}"]`);
        await variant.waitFor({ state: "visible" });
        assert.match(await variant.innerText(), new RegExp(`${type} notice`));
        assert.equal(await page.locator('[aria-live="polite"]').count(), 1, "Toast live region must be polite");
        await page.getByRole("button", { name: `Show ${type}` }).click();
        assert.equal(await page.locator("[data-sonner-toast]").count(), 1, "Repeated operation must not stack duplicate toasts");
        if (type === "loading") {
          await page.getByRole("button", { name: "Show success" }).click();
          const completed = page.locator('[data-sonner-toast][data-type="success"]');
          await completed.waitFor({ state: "visible" });
          assert.equal(await page.locator("[data-sonner-toast]").count(), 1, "Completion must replace loading");
          await completed.getByRole("button", { name: /close/i }).click();
          await completed.waitFor({ state: "detached" });
        } else {
          await variant.getByRole("button", { name: /close/i }).click();
          await variant.waitFor({ state: "detached" });
        }
      }
      await page.close();
      console.log(`PASS ${width}x${height} ${theme}: bounds, header, Back link, theme`);
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
