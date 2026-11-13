import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:http";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { assets } = require("./notification-harness/listing-layout.cjs");

let server: Server;
let origin: string;
test.beforeAll(async () => {
  const { js, css } = await assets();
  server = createServer((req, res) => {
    if (req.url === "/bundle.js") { res.writeHead(200, { "content-type": "text/javascript" }); res.end(js); }
    else if (req.url === "/style.css") { res.writeHead(200, { "content-type": "text/css" }); res.end(css); }
    else { res.writeHead(200, { "content-type": "text/html" }); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>'); }
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture server address");
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => { if (server) await new Promise<void>(resolve => server.close(() => resolve())); });

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`property fields fit and follow responsive order at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/property-drafts", route => route.fulfill({ json: { drafts: [{ id: "draft-1", revision: 1, payload: { property: { title: "Saved house" }, unit: {} } }] } }));
    await page.route("**/api/property-drafts/media?*", route => route.fulfill({ json: { media: [] } }));
    await page.goto(origin);
    const name = page.getByLabel("Property name", { exact: true });
    const type = page.getByLabel("Property type");
    const description = page.getByLabel("Description", { exact: false });
    const restore = page.getByRole("button", { name: "Restore Saved house" });
    await restore.click();
    await expect(name).toHaveValue("Saved house");
    const boxes = await Promise.all([name, type, description].map(async field => { await expect(field).toBeVisible(); const box = await field.boundingBox(); expect(box).not.toBeNull(); return box!; }));
    for (const box of boxes) { expect(box.height).toBeGreaterThanOrEqual(44); expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1); }
    if (viewport.width > 640) { expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThanOrEqual(2); expect(boxes[0].x + boxes[0].width).toBeLessThanOrEqual(boxes[1].x); }
    else expect(boxes[0].y + boxes[0].height).toBeLessThanOrEqual(boxes[1].y);
    expect(boxes[1].y + boxes[1].height).toBeLessThanOrEqual(boxes[2].y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const label of ["Property details", "Location", "Amenities & photos", "Business permit", "Review"]) await expect(page.getByRole("button", { name: new RegExp(`^Step \\d: ${label.replace("&", "&")}$`) })).toBeVisible();
    await expect(page.getByRole("button", { name: "Step 1: Property details" })).toHaveAttribute("aria-current", "step");
    await name.focus(); await page.keyboard.press("Tab"); await expect(type).toBeFocused(); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Tab"); await expect(description).toBeFocused();
    await page.keyboard.type("A synthetic description for testing."); await expect(description).toHaveValue("A synthetic description for testing.");
  });
}
