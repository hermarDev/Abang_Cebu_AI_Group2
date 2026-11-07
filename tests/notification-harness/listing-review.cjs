/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser harness. */
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
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
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: 'import React from "react"; export default function MapSearch({onSelect}) { return <button type="button" onClick={() => onSelect({id:"fixture",name:"Fixture address",detail:"",coordinates:[123,10]})}>Choose fixture location</button> }', loader: "jsx", resolveDir: root }));
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
    let expectedUser;
    await page.route("**/api/property-drafts", route => {
      expectedUser = route.request().headers()["x-expected-user-id"];
      return route.fulfill({ json: { drafts: [{ id: "bad-revision", revision: 0, payload: { property: { title: "Broken revision" }, unit: {} } }, { id: "bad-draft", revision: 1, payload: { property: "invalid", unit: {} } }, { id: "draft-1", revision: 7, payload: { property: { title: "Saved house", street_address: "Saved address", barangay: "Mabolo", city: "Cebu City", latitude: 10.3, longitude: 123.9, location_id: "one", location_name: "Mabolo", location_detail: "Cebu", permit_applicability: "required", permit_number: "ABC-123", permit_lgu: "Cebu", permit_expires_on: "2027-01-01" }, unit: { rental_type: "private_room", monthly_rent: "5000", bathroom_type: "shared", max_occupants: "2" }, amenities: ["wifi"] } }] } });
    });
    await page.route("**/api/property-drafts/media?*", route => route.fulfill({ json: { media: [
      { kind: "photo", signedUrl: "http://fixture.test/one", contentType: "image/jpeg", sizeBytes: 5, sha256: createHash("sha256").update("photo").digest("hex") },
      { kind: "permit", signedUrl: "http://fixture.test/two", contentType: "application/pdf", sizeBytes: 6, sha256: createHash("sha256").update("permit").digest("hex") },
    ] } }));
    await page.route("http://fixture.test/one", route => route.fulfill({ status: 200, body: "photo" }));
    await page.route("http://fixture.test/two", route => route.fulfill({ status: 503 }));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const writes = [];
    page.on("request", request => { if ((request.url().includes("/api/property-drafts") || request.url().includes("/api/landlord/properties")) && request.method() !== "GET") writes.push(request.method()); });
    let badMediaRequested = false;
    page.on("request", request => { if (request.url().includes("draftId=bad-draft")) badMediaRequested = true; });
    await page.getByRole("button", { name: "Restore Broken revision" }).click();
    await page.getByText("This draft has an invalid revision and cannot be safely restored.").waitFor({ timeout: 3000 });
    await page.getByRole("button", { name: "Restore Untitled draft" }).click();
    await page.getByText("This draft contains information this form cannot safely restore. It has not been changed.").waitFor();
    await page.waitForTimeout(100);
    assert.equal(badMediaRequested, false, "Invalid draft must not start media restore");
    await page.getByRole("button", { name: "Restore Saved house" }).click({ timeout: 3000 });
    assert.equal(expectedUser, "test-landlord");
    assert.equal(await page.locator('[name="title"]').inputValue(), "Saved house");
    assert.equal(await page.locator('[name="rentalType"]').inputValue(), "private_room");
    assert.equal(await page.locator('[name="price"]').inputValue(), "5000");
    assert.equal(await page.locator('[name="permitLgu"]').inputValue(), "Cebu");
    assert.equal(await page.locator('[name="permitExpiresOn"]').inputValue(), "2027-01-01");
    assert.equal(await page.locator('[name="address"]').inputValue(), "Saved address");
    assert.equal(await page.locator('[name="permitNumber"]').inputValue(), "ABC-123");
    assert.equal(await page.locator('[name="amenities"][value="wifi"]').isChecked(), true);
    await page.getByText("Saved files could not be restored. Refresh to try again.").waitFor({ timeout: 3000 });
    await page.locator('[name="title"]').fill("Test listing");
    await page.getByRole("button", { name: "Restore Saved house" }).click();
    assert.equal(await page.locator('[name="title"]').inputValue(), "Test listing", "Restore must not overwrite newer edits");
    assert.match(await page.getByRole("alert").innerText(), /unsaved information/);
    assert.equal(await page.evaluate(() => { const event = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; }), true, "Unsaved form input must trigger a leave warning");
    await page.locator('[name="description"]').fill("A suitable fictional description for testing.");
    await page.locator('[name="propertyType"]').selectOption("apartment");
    await page.locator('[name="rentalType"]').selectOption("private_room");
    await page.locator('[name="price"]').fill("5000");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Choose fixture location" }).click();
    await page.locator('[name="address"]').fill("Fixture address");
    await page.locator('[name="barangay"]').fill("Fixture barangay");
    await page.locator('[name="city"]').fill("Cebu City");
    await page.getByRole("button", { name: "Continue" }).click();
    const photos = page.locator('input[type="file"][multiple]');
    await photos.setInputFiles({ name: "valid.jpg", mimeType: "image/jpeg", buffer: Buffer.from("test") });
    await page.getByText("valid.jpg").waitFor();
    await photos.setInputFiles({ name: "large.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
    assert.equal(await page.getByText("valid.jpg").count(), 1, "Invalid replacement must preserve the previous valid selection");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator('[name="permitApplicability"]').selectOption("required");
    await page.locator('[name="permitNumber"]').fill("PERMIT-123");
    await page.locator('[name="permitDocument"]').setInputFiles({ name: "permit.pdf", mimeType: "application/pdf", buffer: Buffer.from("test permit") });
    await page.locator('[name="permitDocument"]').setInputFiles({ name: "too-large.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
    assert.equal(await page.getByText("Selected: permit.pdf").count(), 1, "Invalid replacement must preserve the selected permit");
    await page.locator('[name="permitApplicability"]').selectOption("not_required");
    await page.locator('[name="permitApplicability"]').selectOption("required");
    assert.equal(await page.locator('[name="permitNumber"]').inputValue(), "PERMIT-123", "Switching options must preserve the entered permit number");
    assert.equal(await page.getByText("Selected: permit.pdf").count(), 1, "Switching options must preserve the selected permit file");
    await page.locator('[name="permitLgu"]').fill("Cebu City");
    await page.locator('[name="permitExpiresOn"]').fill("2027-01-01");
    await page.getByRole("button", { name: "Continue" }).click();
    assert.equal(await page.locator('[data-step-panel="4"]').isVisible(), true, "A preserved valid permit must permit review");
    assert.match(await page.locator('[data-step-panel="4"]').innerText(), /permit\.pdf/);
    await page.getByRole("button", { name: "Back" }).click();
    await page.locator('[name="permitApplicability"]').selectOption("not_required");
    await page.getByRole("button", { name: "Continue" }).click();
    assert.equal(await page.locator('[data-step-panel="3"]').isVisible(), true, "An unchecked declaration must block continuation");
    await page.locator('[name="permitNotRequiredConfirmed"]').check();
    await page.locator('[name="permitApplicability"]').selectOption("required");
    await page.locator('[name="permitApplicability"]').selectOption("not_required");
    assert.equal(await page.locator('[name="permitNotRequiredConfirmed"]').isChecked(), true, "Switching permit options must retain the declaration");
    await page.getByRole("button", { name: "Continue" }).click();
    const review = page.locator('[data-step-panel="4"]');
    assert.match(await review.innerText(), /Private room/);
    assert.match(await review.innerText(), /Apartment/);
    assert.match(await review.innerText(), /Fixture barangay/);
    assert.equal(await review.getByText("1 photo selected").count(), 1);
    assert.equal(await page.getByRole("button", { name: "Submission unavailable" }).isDisabled(), true);
    assert.equal(await page.getByRole("button", { name: "Save draft unavailable" }).isDisabled(), true);
    await page.locator("form").evaluate(form => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    assert.deepEqual(writes, [], "Preview interactions must not save drafts");
    assert.doesNotMatch(await review.innerText(), /private_room/);
    await page.unroute("**/api/property-drafts/media?*");
    let releaseRestore;
    const restoreGate = new Promise(resolve => { releaseRestore = resolve; });
    let mediaRequested;
    const mediaStarted = new Promise(resolve => { mediaRequested = resolve; });
    await page.route("**/api/property-drafts/media?*", async route => {
      mediaRequested();
      await restoreGate;
      await route.fulfill({ json: { media: [] } });
    });
    try {
      await page.reload();
      await page.getByRole("button", { name: "Restore Saved house" }).click();
      await mediaStarted;
      await page.locator('[name="description"]').fill("A suitable fictional description for testing.");
      await page.locator('[name="propertyType"]').selectOption("apartment");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByRole("button", { name: "Continue" }).click();
      await page.locator('input[type="file"][multiple]').setInputFiles({ name: "newer.jpg", mimeType: "image/jpeg", buffer: Buffer.from("newer") });
      await page.getByText("newer.jpg").waitFor();
    } finally { releaseRestore(); }
    await page.getByText("Saved files were not restored because your file selection changed. Your current files were kept.").waitFor({ timeout: 3000 });
    assert.equal(await page.getByText("newer.jpg").count(), 1, "A delayed restore must not discard a newer file");
    await page.unroute("**/api/property-drafts/media?*");
    const goodHash = createHash("sha256").update("photo").digest("hex");
    const media = (sha256, sizeBytes = 5) => ({ kind: "photo", signedUrl: "http://fixture.test/one", contentType: "image/jpeg", sha256, sizeBytes });
    await page.route("**/api/property-drafts/media?*", route => route.fulfill({ json: { media: [media("0".repeat(64))] } }));
    await page.reload();
    await page.getByRole("button", { name: "Restore Saved house" }).click();
    await page.getByText("Saved files could not be restored. Refresh to try again.").waitFor({ timeout: 3000 });
    await page.unroute("**/api/property-drafts/media?*");
    await page.route("**/api/property-drafts/media?*", route => route.fulfill({ json: { media: [media(goodHash)] } }));
    await page.reload();
    await page.getByRole("button", { name: "Restore Saved house" }).click();
    await page.locator('[name="description"]').fill("A suitable fictional description for testing.");
    await page.locator('[name="propertyType"]').selectOption("apartment");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByText(`${goodHash}.jpg`, { exact: true }).waitFor({ timeout: 3000 });
    await page.unroute("**/api/property-drafts/media?*");
    await page.route("**/api/property-drafts/media?*", route => route.fulfill({ json: { media: Array.from({ length: 7 }, () => media(goodHash)) } }));
    await page.reload();
    await page.getByRole("button", { name: "Restore Saved house" }).click();
    await page.getByText("Saved files could not be restored. Refresh to try again.").waitFor({ timeout: 3000 });
    await page.unroute("**/api/property-drafts");
    let releaseDrafts;
    const draftsGate = new Promise(resolve => { releaseDrafts = resolve; });
    let draftsRequested;
    const draftsStarted = new Promise(resolve => { draftsRequested = resolve; });
    await page.route("**/api/property-drafts", async route => {
      draftsRequested();
      await draftsGate;
      await route.fulfill({ json: { drafts: [{ id: "draft-1", revision: 7, payload: { property: { title: "Saved house" }, unit: {} } }] } });
    });
    try {
      await page.goto(`http://127.0.0.1:${server.address().port}/?draftId=draft-1&revision=7`);
      await draftsStarted;
      await page.locator('[name="title"]').fill("New unsaved work");
    } finally { releaseDrafts(); }
    await page.getByText("Your current form contains unsaved information. Open a fresh form to restore a draft.").waitFor({ timeout: 3000 });
    assert.equal(await page.locator('[name="title"]').inputValue(), "New unsaved work", "Delayed auto-restore must preserve newer edits");
    await page.goto(`http://127.0.0.1:${server.address().port}/?draftId=draft-1&revision=6`);
    await page.getByText("The requested draft revision is unavailable. Refresh the dashboard before trying again.").waitFor({ timeout: 3000 });
    assert.equal(await page.locator('[name="title"]').inputValue(), "", "A stale correction link must not restore another revision");
    console.log("PASS: mocked-location listing preview retains valid photos and displays unit label");
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
