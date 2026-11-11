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
    await first.evaluate(async () => {
      const repo = new window.BrowserDraftIntentRepository();
      await repo.putPending({ id: "race", ownerId: "owner-c", operationId: "save", draftId: "draft", revision: 1, phase: "created", payload: {}, values: {}, createdAt: 1, files: [{ kind: "photo", operationId: "released-op", released: true, file: new File(["bytes"], "photo.jpg") }] });
    });
    const begin = page => page.evaluate(async () => {
      const repo = new window.BrowserDraftIntentRepository();
      const intent = (await repo.listPending("owner-c"))[0];
      await window.restartReleasedDraftUpload(intent, "released-op", repo);
      return intent.files[0].operationId;
    });
    const restarted = await Promise.allSettled([begin(first), begin(second)]);
    const successful = restarted.filter(item => item.status === "fulfilled");
    assert.equal(successful.length, 1, "Only one tab may replace a released operation");
    const stored = await first.evaluate(async () => (await new window.BrowserDraftIntentRepository().listPending("owner-c"))[0].files[0].operationId);
    assert.equal(stored, successful[0].value, "The single acknowledged operation must be durable");
    const staleIntent = await first.evaluate(async () => (await new window.BrowserDraftIntentRepository().listPending("owner-c"))[0]);
    await second.evaluate(async () => {
      const repo = new window.BrowserDraftIntentRepository();
      const item = (await repo.listPending("owner-c"))[0];
      item.files[0].operationId = "newer-op";
      await repo.putPending(item);
    });
    const staleRejected = await first.evaluate(async intent => {
      try { await new window.BrowserDraftIntentRepository().putPending(intent); return false; } catch { return true; }
    }, staleIntent);
    assert.equal(staleRejected, true, "A stale tab must not overwrite a newer upload operation");
    assert.equal(await first.evaluate(async () => (await new window.BrowserDraftIntentRepository().listPending("owner-c"))[0].files[0].operationId), "newer-op");
    const staleDeleteRejected = await first.evaluate(async intent => {
      try { await new window.BrowserDraftIntentRepository().deletePending(intent.ownerId, intent.id, intent.storageVersion); return false; } catch { return true; }
    }, staleIntent);
    assert.equal(staleDeleteRejected, true, "A stale tab must not delete a newer intent");
    assert.equal(await first.evaluate(async () => (await new window.BrowserDraftIntentRepository().listPending("owner-c"))[0].files[0].operationId), "newer-op");
    await second.evaluate(async () => {
      const repo = new window.BrowserDraftIntentRepository();
      const item = (await repo.listPending("owner-c"))[0];
      await repo.deletePending(item.ownerId, item.id, item.storageVersion);
    });
    const resurrectionRejected = await first.evaluate(async intent => {
      try { await new window.BrowserDraftIntentRepository().putPending(intent); return false; } catch { return true; }
    }, staleIntent);
    assert.equal(resurrectionRejected, true, "A stale versioned writer must not recreate a deleted intent");
    const legacyIntent = { ...staleIntent };
    delete legacyIntent.storageVersion;
    const legacyRejected = await first.evaluate(async intent => {
      try { await new window.BrowserDraftIntentRepository().putPending(intent); return false; } catch { return true; }
    }, legacyIntent);
    assert.equal(legacyRejected, true, "An unversioned old tab must not resurrect a completed intent");
    assert.equal(await first.evaluate(async () => (await new window.BrowserDraftIntentRepository().listPending("owner-c")).length), 0);
    await first.evaluate(async () => {
      const request = indexedDB.open("abangcebu-property-drafts", 1);
      await new Promise((resolve, reject) => { request.onsuccess = () => { request.result.close(); reject(new Error("old version unexpectedly opened")); }; request.onerror = () => resolve(); });
    });
    const legacyContext = await browser.newContext();
    const legacyPage = await legacyContext.newPage();
    const modernPage = await legacyContext.newPage();
    await Promise.all([legacyPage.goto(url), modernPage.goto(url)]);
    await legacyPage.evaluate(async () => {
      const request = indexedDB.open("abangcebu-property-drafts", 1);
      request.onupgradeneeded = () => { const db = request.result; db.createObjectStore("pending", { keyPath: "id" }).createIndex("ownerId", "ownerId"); db.createObjectStore("canonical", { keyPath: "ownerId" }); };
      window.legacyDb = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    });
    const legacyInput = await legacyPage.evaluate(async () => {
      const value = { id: "legacy-inflight", ownerId: "owner-old", operationId: "op-old", payload: {}, values: { title: "old content" }, files: [], createdAt: 1 };
      const tx = window.legacyDb.transaction("pending", "readwrite");
      tx.objectStore("pending").put(value);
      await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = reject; });
      return value;
    });
    const blockedUpgrade = await modernPage.evaluate(async () => {
      window.modernRepo = new window.BrowserDraftIntentRepository();
      try { await window.modernRepo.listPending("owner"); return false; } catch { return true; }
    });
    assert.equal(blockedUpgrade, true, "A held legacy connection must block the upgrade rather than permit unsafe writes");
    await legacyPage.evaluate(() => window.legacyDb.close());
    const recovered = await modernPage.evaluate(async () => {
      try { await window.modernRepo.listPending("owner"); return true; } catch { return false; }
    });
    assert.equal(recovered, true, "The same repository must recover after the old tab closes");
    await modernPage.evaluate(async () => {
      const repo = new window.BrowserDraftIntentRepository();
      const saved = (await repo.listPending("owner-old"))[0];
      saved.values.title = "new content";
      await repo.putPending(saved);
    });
    const oldWriterRejected = await legacyPage.evaluate(async value => {
      try {
        const tx = window.legacyDb.transaction("pending", "readwrite");
        tx.objectStore("pending").put(value);
        await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = reject; });
        return false;
      } catch { return true; }
    }, legacyInput);
    assert.equal(oldWriterRejected, true, "The old held connection cannot write after it closes");
    assert.equal(await modernPage.evaluate(async () => (await new window.BrowserDraftIntentRepository().listPending("owner-old"))[0].values.title), "new content");
    await legacyContext.close();
    await first.evaluate(async () => {
      const repo = new window.BrowserDraftIntentRepository();
      await repo.putPending({ id: "release-race", ownerId: "owner-d", operationId: "save", draftId: "draft", revision: 1, phase: "created", payload: {}, values: { title: "before" }, createdAt: 1, files: [{ kind: "photo", operationId: "file-op", file: new File(["bytes"], "photo.jpg") }] });
    });
    await first.evaluate(async () => {
      const repo = new window.BrowserDraftIntentRepository();
      const item = (await repo.listPending("owner-d"))[0];
      window.releaseStarted = new Promise(resolve => { window.notifyReleaseStarted = resolve; });
      window.releaseResult = window.releaseDraftUpload(item, "file-op", repo, async () => {
        window.notifyReleaseStarted();
        await new Promise(resolve => { window.releaseResponse = resolve; });
        return new Response(JSON.stringify({ state: "released" }), { status: 200 });
      });
    });
    await first.evaluate(() => window.releaseStarted);
    await second.evaluate(async () => {
      const repo = new window.BrowserDraftIntentRepository();
      const item = (await repo.listPending("owner-d"))[0];
      item.values.title = "newer edit";
      await repo.putPending(item);
    });
    await first.evaluate(() => window.releaseResponse());
    const releaseResult = await first.evaluate(async () => {
      try { await window.releaseResult; return "completed"; } catch { return "reload"; }
    });
    assert.equal(releaseResult, "completed", "A merged release acknowledgement must retain newer state");
    const afterRelease = await second.evaluate(async () => (await new window.BrowserDraftIntentRepository().listPending("owner-d"))[0]);
    assert.equal(afterRelease.values.title, "newer edit", "A late release acknowledgement must preserve newer edits");
    assert.equal(afterRelease.files[0].released, true);
    const releaseRetry = await first.evaluate(async () => {
      const repo = new window.BrowserDraftIntentRepository();
      const saved = (await repo.listPending("owner-d"))[0];
      await window.releaseDraftUpload(saved, "file-op", repo, async () => new Response(JSON.stringify({ state: "released" }), { status: 200 }));
      return { version: saved.storageVersion, released: saved.files[0].released };
    });
    assert.equal(releaseRetry.released, true);
    const afterRetry = await second.evaluate(async () => (await new window.BrowserDraftIntentRepository().listPending("owner-d"))[0]);
    assert.equal(releaseRetry.version, afterRetry.storageVersion, "An idempotent release retry must use the current version");
    const staleDeletion = await second.evaluate(async () => {
      const repo = new window.BrowserDraftIntentRepository();
      const item = (await repo.listPending("owner-d"))[0];
      await repo.deletePending(item.ownerId, item.id, item.storageVersion);
      return item;
    });
    const acknowledgementAfterDelete = await first.evaluate(async item => {
      try { await new window.BrowserDraftIntentRepository().markReleasedUpload(item.ownerId, item.id, "file-op"); return false; } catch { return true; }
    }, staleDeletion);
    assert.equal(acknowledgementAfterDelete, true, "A delayed acknowledgement must not recreate a completed intent");
    assert.equal(await second.evaluate(async () => (await new window.BrowserDraftIntentRepository().listPending("owner-d")).length), 0);
    await context.close();
    console.log("PASS: real IndexedDB owner isolation, concurrent claim, retry, cross-draft rejection and cross-page persistence");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
