import { test, expect } from "./fixtures";

const rental = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", title: "Fixture Studio near IT Park", address: "Salinas Dr, Lahug", imageUrls: [], description: "Quiet studio.",
  locality: "Cebu City", coordinates: [123.8854, 10.3157], price: 9500, type: "studio", propertyType: "studio", basis: "room", amenities: ["Wi-Fi"],
  available: true, distanceMeters: null, area: 0, tone: "sage", maxOccupants: 2, bathroomType: "private", directLandlord: true, verificationStatus: "property_verified",
};
const viewports = [{ width: 430, height: 932 }, { width: 1280, height: 800 }];
const noOverflow = (page: import("@playwright/test").Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test("guests are redirected to login from every private page at 430×932", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  for (const path of ["/messages", "/landlord/messages", "/admin/dashboard"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/\./g, "\\.")}$`));
    expect(await noOverflow(page)).toBe(true);
  }
});

for (const theme of ["light", "dark"] as const) {
  for (const viewport of viewports) {
    test(`login destination for guests is bounded with 44px controls at ${viewport.width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(value => localStorage.setItem("abangcebu-theme", value), theme);
      await page.goto("/messages");
      await expect(page).toHaveURL(/\/login\?next=%2Fmessages$/);
      expect(await noOverflow(page)).toBe(true);
      // "Forgot password?" is an inline text link (16px) and is intentionally not asserted here.
      for (const name of ["Close account dialog", "Show password", "Log In", "Register"]) {
        const box = await page.getByRole("dialog").getByRole("button", { name, exact: true }).boundingBox();
        expect(box, name).not.toBeNull();
        expect(box!.height, `control "${name}"`).toBeGreaterThanOrEqual(44);
      }
    });
  }
}

for (const viewport of viewports) {
  test(`map page stays within ${viewport.width}px and the guest 'Message landlord' button opens the renter prompt`, async ({ page }) => {
    await page.route("**/api/rentals*", route => route.fulfill({ json: { rentals: [rental] } }));
    await page.setViewportSize(viewport);
    await page.goto("/");
    const message = page.getByRole("button", { name: `Message landlord about ${rental.title}` }).first();
    if (viewport.width < 1024) await page.getByRole("slider", { name: "Adjust results sheet" }).press("End");
    await expect(message).toBeVisible();
    expect(await noOverflow(page)).toBe(true);
    await message.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Sign in or create a renter account to message the landlord.", { exact: true })).toBeVisible();
    await expect(page.getByRole("dialog").getByLabel("Email Address", { exact: true })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Message landlord" })).toHaveCount(0);
    expect(await noOverflow(page)).toBe(true);
  });
}

test("guest calls to private messaging and admin APIs never leak data or return 200/500", async ({ request }) => {
  const calls = [
    request.post("/api/messages/threads", { data: { listingId: "44444444-4444-4444-8444-444444444444", operationId: "55555555-5555-4555-8555-555555555555", body: "hi" } }),
    request.get("/api/messages/threads/66666666-6666-4666-8666-666666666666"),
    request.post("/api/messages/threads/66666666-6666-4666-8666-666666666666", { data: { operationId: "55555555-5555-4555-8555-555555555555", body: "hi" } }),
    request.get("/api/admin/overview"),
  ];
  for (const response of await Promise.all(calls)) {
    expect([401, 403]).toContain(response.status());
    expect(await response.text()).not.toMatch(/email|phone|@/i);
  }
});
