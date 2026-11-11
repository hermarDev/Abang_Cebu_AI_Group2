/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser harness. */
// Mounted MessagingInbox in real Chromium. FIXTURE-BACKED: every /api/messages/** and /api/blocks response is
// synthesized by page.route (no Next server, auth or database); it proves client thread-switch behavior only.
// Run: node tests/notification-harness/messaging-inbox-switch.cjs
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");
const root = path.resolve(__dirname, "../..");
const { build } = require(require.resolve("esbuild", { paths: [require.resolve("vitest/package.json")] }));
const mock = path.join(__dirname, "next-mock.jsx");

const user = "u1";
const thread = (id, listing, name) => ({
  id, listingId: `l-${id}`, listingTitle: listing, listingPrice: 8500, listingStatus: "published", listingAvailable: true,
  counterpart: { id: `c-${id}`, fullName: name, avatarUrl: null, role: "landlord" }, unreadCount: 0, isArchived: false, isBlocked: false,
  blockedByViewer: false, canSend: true, lastMessagePreview: "hi", lastMessageAt: "2026-11-09T01:00:00Z",
});
const THREADS = { A: thread("A", "Listing A", "Maria A"), B: thread("B", "Listing B", "Ben B"), C: thread("C", "Listing C", "Cara C"), Z: { ...thread("Z", "Listing Z", "Zed Z"), isArchived: true } };
const SEEDED = [THREADS.A, THREADS.B];
const msg = (id, conversationId, body, createdAt) => ({ id, conversationId, senderId: "c-" + conversationId, operationId: id, body, createdAt });
const deferred = () => { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; };

async function main() {
  const bundle = await build({
    entryPoints: [path.join(__dirname, "messaging-inbox-switch-entry.tsx")], bundle: true, write: false,
    format: "iife", platform: "browser", jsx: "automatic", loader: { ".module.css": "empty" }, nodePaths: [path.join(root, "node_modules")],
    alias: { "@": path.join(root, "src") }, define: { "process.env.NODE_ENV": '"development"' },
    plugins: [{ name: "stubs", setup(builder) {
      builder.onResolve({ filter: /^next\/(image|link)$/ }, args => ({ path: mock, namespace: args.path === "next/link" ? "mock-link" : "file" }));
      builder.onLoad({ filter: /.*/, namespace: "mock-link" }, () => ({ contents: `export { MockLink as default } from ${JSON.stringify(mock)}`, loader: "jsx", resolveDir: root }));
    } }],
  });
  const server = http.createServer((req, res) => {
    if (req.url === "/bundle.js") { res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }); res.end(bundle.outputFiles[0].contents); }
    else { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(`<!doctype html><html><body><div style="height:100vh"><div id="root" style="height:100%"></div></div><script id="seed" type="application/json">${JSON.stringify(SEEDED)}</script><script src="/bundle.js"></script></body></html>`); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  const origin = `http://127.0.0.1:${server.address().port}/`;

  // Fresh page per scenario; `api` carries the held/failed responses a scenario needs.
  async function open(api = {}) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on("pageerror", e => errors.push(String(e)));
    const log = { posts: [], unexpected: [], requests: [] };
    // `api.gate({method, id, before, n})` may return a promise (hold) resolving to {messages} (override), and `api.lists` serves the list GET.
    await page.route(/\/api\/messages\/threads\?/, async route => {
      const request = route.request();
      const archived = new URL(request.url()).searchParams.get("archived") === "true";
      log.requests.push({ method: "LIST", archived, user: request.headers()["x-expected-user-id"] });
      const threads = request.headers()["x-expected-user-id"] === "u2" ? [THREADS.C] : (api.lists ?? {})[archived] ?? (archived ? [] : SEEDED);
      return route.fulfill({ json: { threads } });
    });
    await page.route("**/api/messages/threads/**", async route => {
      const request = route.request();
      const url = new URL(request.url());
      const id = decodeURIComponent(url.pathname.split("/").pop());
      const as = request.headers()["x-expected-user-id"];
      const before = url.searchParams.has("before");
      const body = request.postData() ? JSON.parse(request.postData()) : null;
      log.requests.push({ method: request.method(), id, user: as, before, action: body?.action });
      const over = api.gate ? await api.gate({ method: request.method(), id, before, action: body?.action, user: as }) : undefined;
      if (request.method() === "GET" && before) {
        if (api.olderHold) await api.olderHold.promise;
        return route.fulfill({ json: { thread: THREADS[id], messages: [msg(`${id}-old`, id, `OLD-${id}-MSG`, "2026-11-09T00:00:00Z")], hasMore: false } });
      }
      if (request.method() === "GET") return route.fulfill({ json: { thread: THREADS[id], messages: over?.messages ?? [msg(`${id}-new`, id, `${id}-latest`, "2026-11-09T01:00:00Z")], hasMore: true } });
      if (request.method() === "POST") {
        log.posts.push({ id, ...body });
        if (api.failPosts && log.posts.length <= api.failPosts) return route.fulfill({ status: 500, json: { error: "boom" } });
        return route.fulfill({ json: { message: { id: `sent-${log.posts.length}`, conversationId: id, senderId: user, operationId: body.operationId, body: body.body, createdAt: "2026-11-09T02:00:00Z" } } });
      }
      if (request.method() === "PATCH" && body.action === "archive") { if (api.archiveHold) await api.archiveHold.promise; return route.fulfill({ json: { ok: true } }); }
      if (request.method() === "PATCH" && body.action === "mark_read") log.marks = [...(log.marks ?? []), `${as}:${id}`];
      else log.unexpected.push(`${request.method()} ${request.url()}`);
      return route.fulfill({ json: { ok: true } });
    });
    if (api.clock) await page.clock.install();
    await page.goto(origin);
    const row = name => page.locator("aside").getByRole("button", { name: new RegExp(name) });
    const select = async (listing, name) => { await row(listing).click(); await page.getByRole("heading", { name }).waitFor(); await page.getByText(`${listing.slice(-1)}-latest`).waitFor(); };
    return { page, log, errors, row, userAt: () => log.requests.length, select, composer: page.locator("#message-composer") };
  }

  const scenarios = {
    async "failed send and drafts survive A→B→A with a stable retry id"() {
      const { page, log, select, composer, errors } = await open({ failPosts: 1 });
      await select("Listing A", "Maria A");
      await composer.fill("hello A"); await composer.press("Enter");
      await page.getByText("Message wasn't sent").waitFor();
      await composer.fill("draft A");
      await select("Listing B", "Ben B");
      assert.equal(await composer.inputValue(), "", "B must not show A's draft");
      assert.equal(await page.getByText("Message wasn't sent").count(), 0, "B must not show A's failed message");
      await composer.fill("draft B");
      await select("Listing A", "Maria A");
      assert.equal(await composer.inputValue(), "draft A", "A's draft must be restored");
      await page.getByText("Message wasn't sent").waitFor();
      await select("Listing B", "Ben B");
      assert.equal(await composer.inputValue(), "draft B", "B's draft must be restored");
      await select("Listing A", "Maria A");
      await page.getByRole("button", { name: "Retry" }).click();
      await page.getByText("Message wasn't sent").waitFor({ state: "detached" });
      assert.equal(await page.getByText("hello A").count(), 1);
      assert.equal(log.posts.length, 2);
      assert.deepEqual(log.posts.map(p => p.id), ["A", "A"]);
      assert.equal(log.posts[0].operationId, log.posts[1].operationId, "Retry must reuse the original operationId");
      assert.equal(await composer.inputValue(), "draft A", "Retry must not disturb the draft");
      assert.deepEqual(errors, []);
    },
    async "a held older-A response cannot appear in B or after returning to A"() {
      const olderHold = deferred();
      const { page, row, select, errors } = await open({ olderHold });
      await select("Listing A", "Maria A");
      await page.getByRole("button", { name: "Load older messages" }).click();
      await select("Listing B", "Ben B");
      olderHold.release();
      await page.waitForTimeout(300);
      assert.equal(await page.getByText("OLD-A-MSG").count(), 0, "Stale A page leaked into B");
      assert.equal(await page.getByRole("button", { name: "Load older messages" }).count(), 1, "B's own hasMore must be untouched");
      assert.equal(await page.getByRole("button", { name: "Load older messages" }).isEnabled(), true, "Load older must not stay stuck loading in B");
      await row("Listing A").click();
      await page.getByText("A-latest").waitFor();
      assert.equal(await page.getByText("OLD-A-MSG").count(), 0, "Pre-switch A page must not be applied to a reloaded A");
      assert.equal(await page.getByRole("button", { name: "Load older messages" }).count(), 1);
      assert.deepEqual(errors, []);
    },
    async "held A→B→A older response is ignored by generation"() {
      const olderHold = deferred();
      const { page, row, select, errors } = await open({ olderHold });
      await select("Listing A", "Maria A");
      await page.getByRole("button", { name: "Load older messages" }).click();
      await select("Listing B", "Ben B");
      await row("Listing A").click();
      await page.getByText("A-latest").waitFor();
      olderHold.release();
      await page.waitForTimeout(300);
      assert.equal(await page.getByText("OLD-A-MSG").count(), 0, "Stale A→B→A response was applied");
      assert.equal(await page.getByRole("button", { name: "Load older messages" }).count(), 1, "hasMore must come only from the current generation");
      assert.equal(await page.getByRole("button", { name: "Load older messages" }).isEnabled(), true);
      assert.deepEqual(errors, []);
    },
    async "a held archive response for A cannot deselect B"() {
      const archiveHold = deferred();
      const { page, row, select, errors } = await open({ archiveHold });
      await select("Listing A", "Maria A");
      await page.getByLabel("Conversation actions").click();
      await page.getByRole("button", { name: "Archive", exact: true }).click();
      await select("Listing B", "Ben B");
      archiveHold.release();
      await row("Listing A").waitFor({ state: "detached" });
      assert.equal(await row("Listing B").getAttribute("aria-current"), "true", "B must stay selected");
      assert.equal(await page.getByRole("heading", { name: "Ben B" }).count(), 1);
      assert.equal(await page.getByText("B-latest").count(), 1);
      assert.deepEqual(errors, []);
    },
    async "a held poll for A started before A→B→A is ignored by generation"() {
      let held = null; let armed = false;
      const pollHold = deferred();
      const gate = ({ method, id, before }) => { if (armed && method === "GET" && !before && id === "A" && !held) { held = true; return pollHold.promise.then(() => ({ messages: [{ ...msg("A-stale", "A", "STALE-A-POLL", "2026-11-09T03:00:00Z") }] })); } };
      const { page, log, row, select, errors } = await open({ gate, clock: true });
      await select("Listing A", "Maria A");
      armed = true;
      await page.clock.runFor(10_000);
      await page.waitForFunction(() => true);
      await select("Listing B", "Ben B");
      await row("Listing A").click();
      await page.getByText("A-latest").waitFor();
      assert.equal(held, true, "the poll GET for A must have been issued and held");
      pollHold.release();
      await page.waitForTimeout(300);
      assert.equal(await page.getByText("STALE-A-POLL").count(), 0, "Stale poll from the first A visit was merged into the reloaded A");
      assert.equal(log.marks, undefined, "A stale poll must not trigger mark_read");
      assert.deepEqual(errors, []);
    },
    async "a held GET for B and a held POST from u1 cannot reach u2 after the userId prop changes"() {
      const getHold = deferred(); const postHold = deferred();
      const gate = ({ method, id }) => method === "GET" && id === "B" ? getHold.promise.then(() => ({ messages: [msg("B-x", "B", "U1-B-LEAK", "2026-11-09T01:30:00Z")] })) : method === "POST" ? postHold.promise : undefined;
      const { page, log, row, select, composer, errors } = await open({ gate: args => (gateOn ? gate(args) : undefined) });
      var gateOn = false;
      await select("Listing A", "Maria A");
      gateOn = true;
      await composer.fill("held A message"); await composer.press("Enter");
      await page.getByText("Sending…").first().waitFor();
      await composer.fill("unsent draft A");
      await row("Listing B").click();            // GET for B is held
      await page.evaluate(() => window.__render("u2"));
      await page.getByRole("button", { name: /Listing C/ }).waitFor();
      const mark = log.requests.length;
      assert.equal(await page.getByText(/Listing A|Listing B|Ben B|Maria A/).count(), 0, "u1's threads must be gone");
      getHold.release(); postHold.release();
      await page.waitForTimeout(300);
      for (const leak of ["U1-B-LEAK", "held A message", "unsent draft A", "Ben B", "Maria A", "Listing A", "Listing B"]) assert.equal(await page.getByText(leak).count(), 0, `${leak} leaked into u2`);
      assert.equal(await page.getByRole("button", { name: /Listing C/ }).getAttribute("aria-current"), null, "u2 must start with no selection");
      await row("Listing C").click();
      await page.getByRole("heading", { name: "Cara C" }).waitFor();
      assert.equal(await composer.inputValue(), "", "u2 composer must be empty");
      assert.equal(await page.getByText("Message wasn't sent").count(), 0);
      assert.equal(log.marks, undefined);
      assert.ok(log.requests.slice(mark).every(r => r.user === "u2"), "after the switch every new request must be u2's: " + JSON.stringify(log.requests.slice(mark)));
      assert.deepEqual(errors, []);
    },
    async "u1's drafts and failed send are hidden from u2 and restored with the same operationId on u1→u2→u1"() {
      const { page, log, row, select, composer, errors } = await open({ failPosts: 1 });
      await select("Listing A", "Maria A");
      await composer.fill("secret A message"); await composer.press("Enter");
      await page.getByText("Message wasn't sent").waitFor();
      await composer.fill("secret A draft");
      await page.evaluate(() => window.__render("u2"));
      await row("Listing C").waitFor();
      await row("Listing C").click();
      await page.getByRole("heading", { name: "Cara C" }).waitFor();
      for (const leak of ["secret A message", "secret A draft", "Message wasn't sent"]) assert.equal(await page.getByText(leak).count(), 0, `${leak} visible to u2`);
      assert.equal(await composer.inputValue(), "", "u2 composer must be empty");
      await composer.fill("u2 draft C");
      await page.evaluate(() => window.__render("u1"));
      await select("Listing A", "Maria A");
      assert.equal(await composer.inputValue(), "secret A draft", "u1's draft must be restored");
      assert.equal(await page.getByText("u2 draft C").count(), 0, "u2's draft leaked into u1");
      await page.getByText("secret A message").waitFor();
      await page.getByRole("button", { name: "Retry" }).click();
      await page.getByText("Message wasn't sent").waitFor({ state: "detached" });
      assert.equal(log.posts.length, 2);
      assert.equal(log.posts[0].operationId, log.posts[1].operationId, "Retry after account round-trip must reuse the operationId");
      assert.ok(log.requests.filter(r => r.method === "POST").every(r => r.user === "u1"));
      assert.equal(await composer.inputValue(), "secret A draft");
      assert.deepEqual(errors, []);
    },
    async "a stale openThread GET cannot erase an earlier successful POST"() {
      const getHold = deferred(); let first = true;
      const gate = ({ method, id, before }) => { if (method === "GET" && !before && id === "A" && first) { first = false; return getHold.promise; } };
      const { page, row, composer, errors } = await open({ gate });
      await row("Listing A").click();            // composer is usable from the summary while the detail GET is held
      await composer.fill("sent while loading"); await composer.press("Enter");
      const bubble = page.locator("ol").getByText("sent while loading");
      await bubble.waitFor();
      await page.getByText("Sending…").waitFor({ state: "detached" });
      getHold.release();
      await page.getByText("A-latest").waitFor();
      assert.equal(await bubble.count(), 1, "the late GET erased the successful POST");
      assert.deepEqual(errors, []);
    },
    async "an archive held across a tab switch does not edit the other tab's list"() {
      const archiveHold = deferred();
      const { page, row, select, errors } = await open({ archiveHold, lists: { true: [{ ...THREADS.A, isArchived: true }] } });
      await select("Listing A", "Maria A");
      await page.getByLabel("Conversation actions").click();
      await page.getByRole("button", { name: "Archive", exact: true }).click();
      await page.getByRole("tab", { name: "Archived" }).click();
      await row("Listing A").waitFor();
      archiveHold.release();
      await page.waitForTimeout(300);
      assert.equal(await row("Listing A").count(), 1, "archive completion removed A from the Archived tab's list");
      assert.deepEqual(errors, []);
    },
    async "an archive held across A→(tabs)→A does not deselect the reopened A"() {
      const archiveHold = deferred();
      const { page, select, errors } = await open({ archiveHold });
      await select("Listing A", "Maria A");
      await page.getByLabel("Conversation actions").click();
      await page.getByRole("button", { name: "Archive", exact: true }).click();
      await page.getByRole("tab", { name: "Archived" }).click();
      await page.getByRole("tab", { name: "Active" }).click();
      await select("Listing A", "Maria A");
      archiveHold.release();
      await page.waitForTimeout(300);
      assert.equal(await page.getByRole("heading", { name: "Maria A" }).count(), 1, "A was deselected by a completion from the earlier visit");
      assert.deepEqual(errors, []);
    },
  };

  let failed = 0;
  for (const [name, run] of Object.entries(scenarios)) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failed++; console.log(`FAIL ${name}\n  ${String(error.message).split("\n")[0]}`); }
  }
  await browser.close();
  server.close();
  if (failed) { console.log(`${failed} scenario(s) failed`); process.exitCode = 1; } else console.log("messaging-inbox-switch harness OK");
}
main().catch(error => { console.error(error); process.exit(1); });
