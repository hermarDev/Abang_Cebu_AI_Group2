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
      builder.onResolve({ filter: /^@\/components\/map\/MapCanvasLoader$/ }, () => ({ path: "map", namespace: "fixture" }));
      builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "navigation", namespace: "fixture" }));
      builder.onLoad({ filter: /listing-review-entry\.tsx$/ }, () => ({ contents: 'import React from "react"; import { createRoot } from "react-dom/client"; import { AppToaster } from "@/components/ui/AppToaster"; import { ListPropertyForm } from "../../src/app/list-property/ListPropertyForm"; const params = new URLSearchParams(window.location.search); const restoreTarget = params.has("draftId") && params.has("revision") ? { draftId: params.get("draftId")!, revision: params.get("revision")! } : null; createRoot(document.getElementById("root")!).render(<><AppToaster /><ListPropertyForm userId="test-landlord" restoreTarget={restoreTarget} /></>);', loader: "tsx", resolveDir: __dirname }));
      builder.onLoad({ filter: /^navigation$/, namespace: "fixture" }, () => ({ contents: 'export function useRouter() { return { push(href) { window.__lastPushedUrl = href; } }; }', loader: "js", resolveDir: root }));
      builder.onLoad({ filter: /^map$/, namespace: "fixture" }, () => ({ contents: 'import React, {useRef} from "react"; export default function Map({onPinChange,resolvedTheme}) { const count=useRef(0); return <button type="button" data-map-theme={resolvedTheme} onClick={() => onPinChange([123.9 + (++count.current)*0.001,10.3])}>Drop fixture pin</button> }', loader: "jsx", resolveDir: root }));
      builder.onLoad({ filter: /^search$/, namespace: "fixture" }, () => ({ contents: 'import React from "react"; export default function MapSearch({onSelect}) { return <button type="button" onClick={() => onSelect({id:"fixture",name:"Fixture address",detail:"",coordinates:[123.9,10.3]})}>Choose fixture location</button> }', loader: "jsx", resolveDir: root }));
    } }],
  });
  const server = http.createServer((req, res) => {
    if (req.url === "/bundle.js") { res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }); res.end(bundle.outputFiles[0].contents); }
    else { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end('<!doctype html><html><head><style>.abang-toast { min-width: 340px; max-width: 440px; padding: 14px 16px; font-size: 0.9375rem; border-radius: 12px; }</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>'); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let expectedUser;
    let reverseRequests = 0;
    let reverseFailure = false;
    await page.route("**/api/places/reverse?*", route => {
      reverseRequests++;
      return reverseFailure ? route.fulfill({ status: 503, json: { error: "unavailable" } }) : route.fulfill({ json: { place: { address: "Geocoded Street", barangay: "Geocoded barangay", city: "Mandaue" } } });
    });
    await page.route("**/api/property-drafts", route => {
      expectedUser = route.request().headers()["x-expected-user-id"];
      return route.fulfill({ json: { drafts: [{ id: "bad-revision", revision: 0, payload: { property: { title: "Broken revision" }, unit: {} } }, { id: "bad-draft", revision: 1, payload: { property: "invalid", unit: {} } }, { id: "draft-1", revision: 7, payload: { property: { title: "Saved house", street_address: "Saved address", barangay: "Mabolo", city: "Cebu City", latitude: 10.3, longitude: 123.9, location_id: "one", location_name: "Mabolo", location_detail: "Cebu", permit_applicability: "required", permit_number: "ABC-123", permit_lgu: "Cebu", permit_expires_on: "2027-01-01" }, unit: { rental_type: "private_room", monthly_rent: "5000", bathroom_type: "shared", max_occupants: "2", tenant_policy: "female_only" }, amenities: ["wifi"] } }] } });
    });
    await page.route("**/api/property-drafts/media?*", route => route.fulfill({ json: { media: [
      { kind: "photo", signedUrl: "http://fixture.test/one", contentType: "image/jpeg", sizeBytes: 5, sha256: createHash("sha256").update("photo").digest("hex") },
      { kind: "permit", signedUrl: "http://fixture.test/two", contentType: "application/pdf", sizeBytes: 6, sha256: createHash("sha256").update("permit").digest("hex") },
    ] } }));
    await page.route("http://fixture.test/one", route => route.fulfill({ status: 200, body: "photo" }));
    await page.route("http://fixture.test/two", route => route.fulfill({ status: 503 }));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('[name="title"]').fill("First edit");
    await page.locator('[name="title"]').fill("Latest edit");
    await page.reload();
    assert.equal(await page.locator('[name="title"]').inputValue(), "Latest edit", "Refresh must restore the latest unsaved edit");
    await page.getByRole("button", { name: "Restore Saved house" }).click();
    assert.equal(await page.locator('[name="title"]').inputValue(), "Latest edit", "Restoring a server draft must not overwrite recovered unsaved entries");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    const nextStep = page.getByRole("button", { name: "Step 2: Location" });
    assert.equal(await nextStep.isEnabled(), true);
    assert.doesNotMatch(await nextStep.getAttribute("class"), /cursor-not-allowed/, "Available next step must not look disabled");
    assert.match(await page.getByRole("button", { name: "Save draft" }).getAttribute("class"), /col-span-2/, "On the first step the secondary action fills the mobile row");
    await page.evaluate(() => { localStorage.setItem("abangcebu-theme", "dark"); window.dispatchEvent(new Event("abangcebu-theme-change")); });
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
    assert.equal(await page.locator('[name="tenantPolicy"]').inputValue(), "female_only");
    assert.equal(await page.locator('[name="address"]').inputValue(), "Saved address");
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
    await page.locator('[name="tenantPolicy"]').selectOption("female_only");
    await page.getByRole("button", { name: "Continue" }).click();
    assert.equal(await page.getByRole("button", { name: "Drop fixture pin" }).getAttribute("data-map-theme"), "dark", "Map must follow the resolved dark theme");
    await page.evaluate(() => { localStorage.setItem("abangcebu-theme", "light"); window.dispatchEvent(new Event("abangcebu-theme-change")); });
    await page.waitForFunction(() => document.querySelector('[data-map-theme="light"]'));
    assert.equal(await page.locator('[name="title"]').inputValue(), "Test listing", "Theme changes must preserve entered data");
    await page.locator('[name="address"]').fill("My unit address");
    await Promise.all([page.waitForResponse(response => response.url().includes("/api/places/reverse?")), page.getByRole("button", { name: "Drop fixture pin" }).click()]);
    assert.ok(reverseRequests > 0);
    assert.equal(await page.locator('[name="address"]').inputValue(), "My unit address", "Dropping a pin must preserve a manually entered address");
    assert.equal(await page.locator('[name="barangay"]').inputValue(), "Mabolo", "Restored manual barangay must not be overwritten");
    await page.getByRole("button", { name: "Choose fixture location" }).click();
    await page.locator('[name="address"]').fill("Fixture address");
    await page.locator('[name="barangay"]').fill("Fixture barangay");
    await page.locator('[name="city"]').fill("Cebu City");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: Photo gallery thumbnail grid & individual removal
    const photos = page.locator('input[name="propertyPhotos"]');
    await photos.setInputFiles([
      { name: "photo-1.jpg", mimeType: "image/jpeg", buffer: Buffer.from("photo1") },
      { name: "photo-2.jpg", mimeType: "image/jpeg", buffer: Buffer.from("photo2") },
    ]);
    assert.equal(await page.locator('[data-step-panel="2"] [aria-label^="Remove photo-"]').count(), 2);
    await page.getByRole("button", { name: "Remove photo-1.jpg" }).click();
    assert.equal(await page.locator('[data-step-panel="2"] [aria-label^="Remove photo-"]').count(), 1);
    assert.equal(await page.getByText("photo-2.jpg").isVisible(), true);
    await photos.setInputFiles({ name: "large.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
    assert.equal(await page.getByText("photo-2.jpg").count(), 1, "Invalid replacement must preserve the previous valid selection");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: Streamlined permit dropzone (no dropdown) & direct exemption
    assert.equal(await page.locator('[name="permitApplicability"]').count(), 0, "No permitApplicability dropdown in Step 3");
    const dropzone = page.getByLabel("Drag and drop permit upload area");
    assert.equal(await dropzone.isVisible(), true, "Permit dropzone is visible");
    assert.equal(await page.getByText("Choose permit files").count(), 0, "Standalone permit button is gone");
    assert.match(await dropzone.getAttribute("class"), /border-border\/80/, "Idle dropzone styling");
    await dropzone.dispatchEvent("dragenter", { dataTransfer: await page.evaluateHandle(() => new DataTransfer()) });
    assert.match(await dropzone.getAttribute("class"), /border-action/, "Drag-over feedback");
    await dropzone.dispatchEvent("dragleave", { dataTransfer: await page.evaluateHandle(() => new DataTransfer()) });
    assert.match(await dropzone.getAttribute("class"), /border-border\/80/, "Drag-over feedback clears");
    const dropFiles = async (files) => {
      const dt = await page.evaluateHandle((specs) => { const d = new DataTransfer(); for (const [name, type, body] of specs) d.items.add(new File([body], name, { type })); return d; }, files);
      await dropzone.dispatchEvent("drop", { dataTransfer: dt });
    };
    await dropFiles([["dropped.pdf", "application/pdf", "dropped permit"], ["dropped.png", "image/png", "dropped image"]]);
    await page.getByRole("button", { name: "Remove dropped.pdf" }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Remove dropped.png" }).count(), 1, "Multiple dropped files are added");
    assert.match(await page.locator('[data-step-panel="3"] li', { hasText: "dropped.pdf" }).innerText(), /KB · /, "Card shows size and status");
    await dropFiles([["bad.txt", "text/plain", "nope"]]);
    assert.match(await page.locator("#permit-upload-error").innerText(), /JPG, PNG, WebP or PDF/, "Invalid dropped type shows inline error");
    assert.equal(await page.getByRole("button", { name: "Remove dropped.pdf" }).count(), 1, "Invalid drop keeps previous files");
    await page.getByRole("button", { name: "Remove dropped.pdf" }).click();
    await page.getByRole("button", { name: "Remove dropped.png" }).click();
    assert.equal(await page.locator("#permit-upload-error").count(), 0, "Removal clears the inline error");
    const permits = page.locator('[name="permitPhotos"]');
    const permitPdf = { name: "permit.pdf", mimeType: "application/pdf", buffer: Buffer.from("test permit"), lastModified: 1000 };
    await permits.setInputFiles([permitPdf, { name: "permit.webp", mimeType: "image/webp", buffer: Buffer.from("test image"), lastModified: 1000 }]);
    await permits.setInputFiles({ name: "permit-copy.pdf", mimeType: "application/pdf", buffer: Buffer.from("test permit") });
    assert.match(await page.getByRole("alert").last().innerText(), /different/i, "Duplicate contents under a different name must produce a warning");
    assert.equal(await page.getByText("permit-copy.pdf", { exact: true }).count(), 0);
    await permits.setInputFiles({ name: "permit.pdf", mimeType: "application/pdf", buffer: Buffer.from("other bytes") });
    await page.waitForFunction(() => document.querySelectorAll('[aria-label="Remove permit.pdf"]').length === 2);
    assert.equal(await page.getByRole("button", { name: "Remove permit.pdf" }).count(), 2, "Different content with the same filename and size must be accepted");
    await page.getByRole("button", { name: "Remove permit.pdf" }).last().click();
    await permits.setInputFiles([3, 4, 5].map(i => ({ name: `permit-${i}.pdf`, mimeType: "application/pdf", buffer: Buffer.from(`permit-${i}`) })));
    await page.getByRole("button", { name: "Remove permit-5.pdf" }).waitFor();
    assert.equal(await page.locator('[data-step-panel="3"] li').count(), 5, "Five permit files must be accepted");
    await permits.setInputFiles({ name: "permit-6.pdf", mimeType: "application/pdf", buffer: Buffer.from("sixth") });
    assert.equal(await page.locator('[data-step-panel="3"] li').count(), 5, "A sixth permit must not discard selected files");
    assert.equal(await page.getByText("permit-6.pdf", { exact: true }).count(), 0);
    for (const i of [3, 4, 5]) await page.getByRole("button", { name: `Remove permit-${i}.pdf` }).click();
    await permits.setInputFiles({ name: "too-large.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
    assert.equal(await page.getByText("permit.pdf", { exact: true }).count(), 1, "Invalid replacement must preserve the selected permit");
    await page.getByRole("button", { name: "Remove permit.webp" }).click();
    assert.equal(await page.getByText("permit.webp", { exact: true }).count(), 0, "Removal must remove only the selected file");
    assert.equal(await page.getByText("permit.pdf", { exact: true }).count(), 1);

    // Step 4: Clickable step navigation in listing progress header
    await page.getByRole("button", { name: "Step 2: Location" }).click();
    assert.equal(await page.locator('[data-step-panel="1"]').isVisible(), true, "Step 2 button jumps to Location");
    await page.getByRole("button", { name: "Step 3: Amenities & photos" }).click();
    assert.equal(await page.locator('[data-step-panel="2"]').isVisible(), true, "Step 3 button jumps to Amenities & photos");
    await page.getByRole("button", { name: "Step 4: Business permit" }).click();
    assert.equal(await page.locator('[data-step-panel="3"]').isVisible(), true, "Step 4 button jumps to Business permit");

    // Advance to review
    await page.getByRole("button", { name: "Continue" }).click();
    assert.equal(await page.locator('[data-step-panel="4"]').isVisible(), true, "A valid permit permits review");
    assert.match(await page.locator('[data-step-panel="4"]').innerText(), /permit\.pdf/);

    // Review assertions
    const review = page.locator('[data-step-panel="4"]');
    assert.match(await review.innerText(), /Private room/);
    assert.match(await review.innerText(), /Apartment/);
    assert.match(await review.innerText(), /Fixture barangay/);
    assert.match(await review.innerText(), /Female only/);
    assert.equal(await review.getByText("1 photo selected").count(), 1);

    // Mock API endpoints for Save Draft and Listing Submission
    const saveRoute = route => {
      if (route.request().method() === "POST") return route.fulfill({ status: 200, json: { id: "draft-saved-1" } });
      if (route.request().method() === "PATCH") return route.fulfill({ status: 200, json: { revision: 2 } });
      return route.fallback();
    };
    await page.route("**/api/property-drafts", saveRoute);
    await page.route("**/api/property-drafts/media", async route => {
      if (route.request().method() === "POST") {
        const postData = route.request().postDataBuffer();
        let contentType = "image/jpeg";
        let fileBytes = Buffer.from("");
        if (postData) {
          const text = postData.toString("binary");
          const boundaryMatch = route.request().headers()["content-type"]?.match(/boundary=(.*)$/);
          const boundary = boundaryMatch ? boundaryMatch[1] : "";
          const parts = text.split(`--${boundary}`);
          for (const part of parts) {
            if (part.includes('name="file"')) {
              const head = part.split("\r\n\r\n")[0];
              const ctMatch = head.match(/Content-Type:\s*([^\r\n]+)/i);
              if (ctMatch) contentType = ctMatch[1].trim();
              const body = part.slice(part.indexOf("\r\n\r\n") + 4, part.lastIndexOf("\r\n"));
              fileBytes = Buffer.from(body, "binary");
            }
          }
        }
        const sha256 = createHash("sha256").update(fileBytes).digest("hex");
        return route.fulfill({
          status: 200,
          json: { sha256, sizeBytes: fileBytes.length, contentType, objectPath: `test/draft-saved-1/op/${sha256}` }
        });
      }
      return route.continue();
    });
    let submitAttempt = 0;
    const submitOpIds = [];
    await page.route("**/api/landlord/properties", route => {
      if (route.request().method() === "POST") {
        submitAttempt++;
        const body = route.request().postDataJSON();
        submitOpIds.push(body?.operationId);
        if (submitAttempt === 1) return route.fulfill({ status: 503, json: { error: "Temporary network failure" } });
        return route.fulfill({ status: 200, json: { propertyId: "prop-new-123", status: "pending" } });
      }
      return route.continue();
    });

    // Test Save draft
    assert.equal(await page.getByRole("button", { name: "Save draft" }).isEnabled(), true);
    await page.getByRole("button", { name: "Save draft" }).click();
    await page.getByRole("status").filter({ hasText: /Draft (and files )?saved\./ }).waitFor({ timeout: 5000 });

    // An edit after saving auto-saves in 1 click before submitting.
    let submissions = 0;
    let draftPatches = 0;
    page.on("request", request => {
      if (request.url().endsWith("/api/landlord/properties") && request.method() === "POST") submissions++;
      if (request.url().endsWith("/api/property-drafts") && request.method() === "PATCH") draftPatches++;
    });
    await page.getByRole("button", { name: "Step 1: Property details" }).click();
    await page.locator('[name="title"]').fill("Newer listing title");
    await page.getByRole("button", { name: "Step 5: Review" }).click();
    assert.equal(await page.getByRole("button", { name: "Submit listing for review" }).isEnabled(), true);
    await page.getByRole("button", { name: "Submit listing for review" }).click();
    await page.getByRole("alert").filter({ hasText: "Submission could not be confirmed. Your draft was kept; retry when ready." }).waitFor({ timeout: 5000 });
    assert.equal(draftPatches, 1, "Dirty draft must auto-save via PATCH before submitting");
    assert.equal(submissions, 1, "First click must auto-save and immediately submit in 1 click");
    const toast = page.locator(".abang-toast").filter({ hasText: "Submission could not be confirmed. Your draft was kept; retry when ready." });
    await toast.waitFor({ state: "visible", timeout: 5000 });
    await page.waitForFunction(() => {
      const el = Array.from(document.querySelectorAll(".abang-toast")).find(node => node.textContent?.includes("Submission could not be confirmed."));
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return el.getAttribute("data-mounted") === "true" && rect.y >= 60 && rect.y <= 140 && rect.width >= 340;
    });
    const box = await toast.boundingBox();
    assert.ok(box && box.y >= 60 && box.y <= 140 && box.width >= 340, "Toast must be rendered in the upper-right with desktop geometry");

    // Test idempotent retry after lost response
    await page.getByRole("button", { name: "Submit listing for review" }).click();
    await page.getByRole("status").filter({ hasText: "Listing submitted for review. Status: pending." }).waitFor({ timeout: 5000 });
    assert.equal(submitOpIds.length, 2);
    assert.equal(submitOpIds[0], submitOpIds[1], "Retried submission after lost response must reuse the same operationId");
    assert.equal(await page.evaluate(() => window.__lastPushedUrl), "/landlord/map?selected=prop-new-123", "Successful submission must redirect to /landlord/map?selected=prop-new-123");

    await page.unroute("**/api/property-drafts", saveRoute);

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
      await page.locator('input[name="propertyPhotos"]').setInputFiles({ name: "newer.jpg", mimeType: "image/jpeg", buffer: Buffer.from("newer") });
      await page.getByText("newer.jpg").waitFor();
    } finally { releaseRestore(); }
    await page.getByText("Saved files were not restored because your file selection changed. Your current files were kept.").waitFor({ timeout: 3000 });
    assert.equal(await page.getByText("newer.jpg").count(), 1, "A delayed restore must not discard a newer file");
    await page.unroute("**/api/property-drafts/media?*");
    const goodHash = createHash("sha256").update("photo").digest("hex");
    const media = (sha256, sizeBytes = 5) => ({ kind: "photo", signedUrl: "http://fixture.test/one", contentType: "image/jpeg", sha256, sizeBytes });
    await page.route("**/api/property-drafts/media?*", route => route.fulfill({ json: { media: [media("0".repeat(64))] } }));
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: "Restore Saved house" }).click();
    await page.getByText("Saved files could not be restored. Refresh to try again.").waitFor({ timeout: 3000 });
    await page.unroute("**/api/property-drafts/media?*");
    await page.route("**/api/property-drafts/media?*", route => route.fulfill({ json: { media: [media(goodHash)] } }));
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: "Restore Saved house" }).click();
    await page.locator('[name="description"]').fill("A suitable fictional description for testing.");
    await page.locator('[name="propertyType"]').selectOption("apartment");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByText(`${goodHash}.jpg`, { exact: true }).waitFor({ timeout: 3000 });
    await page.unroute("**/api/property-drafts/media?*");
    await page.route("**/api/property-drafts/media?*", route => route.fulfill({ json: { media: Array.from({ length: 7 }, () => media(goodHash)) } }));
    await page.evaluate(() => sessionStorage.clear());
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
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('[name="title"]').fill("Fresh fixture");
    await page.locator('[name="description"]').fill("A suitable fictional description for testing.");
    await page.locator('[name="propertyType"]').selectOption("apartment");
    await page.locator('[name="rentalType"]').selectOption("private_room");
    await page.locator('[name="price"]').fill("5000");
    await page.getByRole("button", { name: "Continue" }).click();
    await Promise.all([page.waitForResponse(response => response.url().includes("/api/places/reverse?")), page.getByRole("button", { name: "Drop fixture pin" }).click()]);
    await page.waitForFunction(() => document.querySelector('[name="address"]')?.value === "Geocoded Street");
    assert.equal(await page.locator('[name="barangay"]').inputValue(), "Geocoded barangay");
    assert.equal(await page.locator('[name="city"]').inputValue(), "Mandaue");
    await page.locator('[name="address"]').fill("My unit number");
    await page.getByRole("button", { name: "Clear pin" }).click();
    assert.equal(await page.locator('[name="address"]').inputValue(), "My unit number", "Clearing the pin must preserve manual address");
    assert.equal(await page.locator('[name="barangay"]').inputValue(), "", "Clearing the pin must clear automatic barangay");
    assert.equal(await page.locator('[name="city"]').inputValue(), "", "Clearing the pin must clear automatic city");
    await Promise.all([page.waitForResponse(response => response.url().includes("/api/places/reverse?")), page.getByRole("button", { name: "Drop fixture pin" }).click()]);
    await page.waitForFunction(() => document.querySelector('[name="city"]')?.value === "Mandaue");
    reverseFailure = true;
    await Promise.all([page.waitForResponse(response => response.url().includes("/api/places/reverse?")), page.getByRole("button", { name: "Drop fixture pin" }).click()]);
    await page.getByText("Address lookup is unavailable. The pin was kept; enter the address manually.").waitFor();
    assert.equal(await page.locator('[name="address"]').inputValue(), "My unit number", "Manual address must survive a failed lookup");
    assert.equal(await page.locator('[name="barangay"]').inputValue(), "", "Prior automatic barangay must not be attributed to a new pin");
    assert.equal(await page.locator('[name="city"]').inputValue(), "", "Prior automatic city must not be attributed to a new pin");
    assert.equal(await page.getByRole("button", { name: "Clear pin" }).isVisible(), true, "Failed lookup must retain the pin");
    console.log("PASS: mocked-location listing preview retains valid photos and displays unit label");
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
