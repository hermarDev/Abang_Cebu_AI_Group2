/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser harness. */
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");
const { build } = require(require.resolve("esbuild", { paths: [require.resolve("vitest/package.json")] }));

async function main() {
  const bundle = await build({ entryPoints: [path.join(__dirname, "draft-indexeddb-entry.ts")], bundle: true, write: false, format: "iife", platform: "browser" });
  const server = http.createServer((req, res) => {
    if (req.url === "/bundle.js") { res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }); res.end(bundle.outputFiles[0].contents); }
    else { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end('<script src="/bundle.js"></script>'); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const first = await context.newPage();
    const second = await context.newPage();
    const url = `http://127.0.0.1:${server.address().port}/`;
    await Promise.all([first.goto(url), second.goto(url)]);
    const result = await first.evaluate(async () => {
      const Repository = window.BrowserDraftIntentRepository;
      const a = new Repository();
      const b = new Repository();
      const item = (id, ownerId) => ({ id, ownerId, operationId: id, payload: { property: {}, unit: {} }, values: {}, files: [], createdAt: 1 });
      await a.putPending(item("a", "owner-a"));
      await b.putPending(item("b", "owner-b"));
      const owners = (await a.listPending("owner-a")).map(value => value.id);
      const claims = await Promise.all([a.claimCreate("owner-a", "op-a"), b.claimCreate("owner-a", "op-b")]);
      const winner = claims[0] ? "op-a" : "op-b";
      const retry = await a.claimCreate("owner-a", winner);
      await a.completeDraft("owner-a", "draft-a", 1);
      let rejected = false;
      try { await b.completeDraft("owner-a", "draft-b", 1); } catch { rejected = true; }
      return { owners, claims, retry, rejected, canonical: await a.getCanonicalDraft("owner-a") };
    });
    assert.deepEqual(result.owners, ["a"]);
    assert.equal(result.claims.filter(Boolean).length, 1);
    assert.equal(result.retry, true);
    assert.equal(result.rejected, true);
    assert.equal(result.canonical.draftId, "draft-a");
    const acrossPage = await second.evaluate(async () => (await new window.BrowserDraftIntentRepository().listPending("owner-b")).map(value => value.id));
    assert.deepEqual(acrossPage, ["b"]);
    await context.close();
    console.log("PASS: real IndexedDB owner isolation, concurrent claim, retry, cross-draft rejection and cross-page persistence");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
