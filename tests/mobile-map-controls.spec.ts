import { test, expect } from "./fixtures";

test("mobile map controls stay compact and attribution can expand", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 800 });
  await page.goto("/");
  await expect(page.locator("canvas.maplibregl-canvas")).toBeVisible();
  const zoomIn = page.getByRole("button", { name: "Zoom in", exact: true });
  await expect(zoomIn).toBeVisible();
  await zoomIn.click();
  const zoomOut = page.getByRole("button", { name: "Zoom out", exact: true });
  await expect(zoomOut).toBeVisible();
  await zoomOut.click();
  const locate = page.getByRole("button", { name: "Locate me", exact: true });
  await expect(locate).toBeVisible();
  const attribution = page.locator(".maplibregl-ctrl-attrib");
  await expect(attribution).toHaveClass(/maplibregl-compact/);
  const chat = await page.getByRole("button", { name: "Open rental assistant" }).boundingBox();
  const info = await page.locator(".maplibregl-ctrl-attrib-button").boundingBox();
  expect(chat!.width).toBe(56);
  const location = await locate.boundingBox();
  expect(Math.abs(location!.x + location!.width / 2 - info!.x - info!.width / 2)).toBeLessThanOrEqual(2);
  expect(location!.y - info!.y - info!.height).toBeGreaterThanOrEqual(12);
  await expect(page.getByRole("link", { name: "OpenFreeMap", exact: true })).toBeVisible();
  await page.locator(".maplibregl-ctrl-attrib-button").click();
  await expect(page.getByRole("link", { name: "OpenFreeMap", exact: true })).toBeHidden();
  await page.locator(".maplibregl-ctrl-attrib-button").click();
  await expect(page.getByRole("link", { name: "OpenFreeMap", exact: true })).toBeVisible();
  await page.getByRole("slider", { name: "Adjust results sheet" }).press("End");
  await expect(locate).toBeHidden();
});

for (const viewport of [{ width: 430, height: 800 }, { width: 1440, height: 900 }]) {
  test(`attribution becomes circular after dragging the map at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const attribution = page.locator(".maplibregl-ctrl-attrib");
    const toggle = page.locator(".maplibregl-ctrl-attrib-button");
    const credits = page.getByRole("link", { name: "OpenFreeMap", exact: true });
    await expect(toggle).toBeVisible();
    if (!(await credits.isVisible())) await toggle.click();
    await expect(credits).toBeVisible();
    const canvas = await page.locator("canvas.maplibregl-canvas").boundingBox();
    expect(canvas).not.toBeNull();
    const x = canvas!.x + canvas!.width * 0.65;
    const y = canvas!.y + canvas!.height * 0.45;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 80, y + 20, { steps: 5 });
    await page.mouse.up();
    await expect(attribution).not.toHaveClass(/maplibregl-compact-show/);
    await expect(credits).toBeHidden();
    const collapsed = await attribution.boundingBox();
    expect(collapsed).not.toBeNull();
    expect(Math.abs(collapsed!.width - collapsed!.height)).toBeLessThanOrEqual(1);
    await toggle.click();
    await expect(credits).toBeVisible();
  });
}

test("map attribution remains clickable on a short landscape viewport", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  const toggle = page.locator(".maplibregl-ctrl-attrib-button");
  await expect(toggle).toBeVisible();
  await page.getByRole("slider", { name: "Adjust results sheet" }).press("ArrowUp");
  await toggle.click({ trial: true });
  const attribution = page.locator(".maplibregl-ctrl-attrib");
  const launcher = page.getByRole("button", { name: "Open rental assistant" });
  const creditBox = await attribution.boundingBox();
  const launcherBox = await launcher.boundingBox();
  expect(creditBox).not.toBeNull();
  expect(launcherBox).not.toBeNull();
  expect(creditBox!.x >= launcherBox!.x + launcherBox!.width || launcherBox!.x >= creditBox!.x + creditBox!.width || creditBox!.y >= launcherBox!.y + launcherBox!.height || launcherBox!.y >= creditBox!.y + creditBox!.height).toBe(true);
  await launcher.click({ trial: true });
});

test("desktop attribution sits below the assistant and remains clickable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const chat = page.getByRole("button", { name: "Open rental assistant" });
  const attribution = page.locator(".maplibregl-ctrl-attrib");
  await expect(attribution).toBeVisible();
  const chatBox = await chat.boundingBox();
  const creditBox = await attribution.boundingBox();
  const toggle = page.locator(".maplibregl-ctrl-attrib-button");
  const credits = page.locator(".maplibregl-ctrl-attrib-inner");
  const toggleBox = await toggle.boundingBox();
  const textBox = await credits.boundingBox();
  expect(chatBox).not.toBeNull();
  expect(creditBox).not.toBeNull();
  expect(toggleBox).not.toBeNull();
  expect(textBox).not.toBeNull();
  expect(Math.abs(toggleBox!.x + toggleBox!.width / 2 - chatBox!.x - chatBox!.width / 2)).toBeLessThanOrEqual(2);
  expect(creditBox!.y - (chatBox!.y + chatBox!.height)).toBeGreaterThanOrEqual(4);
  expect(toggleBox!.x).toBeGreaterThanOrEqual(textBox!.x + textBox!.width);
  await chat.click({ trial: true });
  await toggle.click();
  const collapsed = await attribution.boundingBox();
  expect(collapsed).not.toBeNull();
  expect(Math.abs(collapsed!.width - collapsed!.height)).toBeLessThanOrEqual(1);
  await toggle.click();
  await expect(page.getByRole("link", { name: "OpenFreeMap", exact: true })).toBeVisible();
});
