import { test, expect } from "./fixtures";

test("assistant displays sanitized unavailable feedback", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/assistant", route => {
    requests++;
    return route.fulfill({ status: 503, json: { error: "The assistant is temporarily unavailable. Please try again later." } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Open rental assistant" }).click();
  const panel = page.getByRole("region", { name: "AbangCebu assistant" });
  await panel.getByLabel("Message the AbangCebu assistant").fill("Hello");
  await panel.getByRole("button", { name: "Send message" }).click();
  await expect(panel.getByRole("alert")).toHaveText("The assistant is temporarily unavailable. Please try again later.");
  expect(requests).toBe(1);
  await expect(panel.getByText("Hello", { exact: true })).toBeVisible();
});

test("assistant renders deterministic matches and separately labelled above-budget alternatives", async ({ page }) => {
  await page.route("**/api/assistant", route => route.fulfill({
    status: 200,
    json: {
      reply: "Hallucinated text that must not appear",
      listings: {
        matches: [
          { id: "m-1", unitId: "u-1", title: "Mandaue Verified Room", area: "Mandaue", monthlyPricePHP: 8500, propertyType: "room", verificationStatus: "property_verified", overBudgetPHP: 0 },
          { id: "m-2", unitId: null, title: "Lahug Identity Room", area: "Cebu City", monthlyPricePHP: 9000, propertyType: "room", verificationStatus: "identity_verified", overBudgetPHP: 0 },
        ],
        alternatives: [
          { id: "a-1", unitId: null, title: "IT Park Over-Budget Room", area: "Cebu City", monthlyPricePHP: 10001, propertyType: "room", verificationStatus: "unverified", overBudgetPHP: 1 },
        ],
        complete: true,
      },
    },
  }));
  await page.goto("/");
  await page.getByRole("button", { name: "Open rental assistant" }).click();
  const panel = page.getByRole("region", { name: "AbangCebu assistant" });
  await panel.getByLabel("Message the AbangCebu assistant").fill("list rooms under 10k");
  await panel.getByRole("button", { name: "Send message" }).click();

  const log = panel.getByRole("log", { name: "Conversation with AbangCebu assistant" });
  await expect(log).toContainText("Matching rentals:");
  await expect(log).toContainText("Mandaue Verified Room — Mandaue · ₱8,500/mo · Verified property");
  await expect(log).toContainText("Lahug Identity Room — Cebu City · ₱9,000/mo");
  await expect(log).toContainText("Above your budget:");
  await expect(log).toContainText("IT Park Over-Budget Room — Cebu City · ₱10,001/mo (₱1 over budget)");
  await expect(log).not.toContainText("Hallucinated text");
  const text = (await log.textContent()) ?? "";
  expect(text.indexOf("Mandaue Verified Room")).toBeLessThan(text.indexOf("Above your budget:"));
  expect(text).not.toContain("Lahug Identity Room — Cebu City · ₱9,000/mo · Verified");
  expect(text).not.toContain("IT Park Over-Budget Room — Cebu City · ₱10,001/mo (₱1 over budget) · Verified");
});

test("assistant listings are clickable and follow-ups reuse the last results", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/assistant", route => {
    requests++;
    return route.fulfill({
      status: 200,
      json: {
        reply: "ignored",
        listings: {
          matches: [
            { id: "m-1", unitId: null, title: "Mandaue Verified Room", area: "Mandaue", monthlyPricePHP: 8500, propertyType: "room", verificationStatus: "property_verified", overBudgetPHP: 0 },
            { id: "m-2", unitId: null, title: "Lahug Room", area: "Cebu City", monthlyPricePHP: 9500, propertyType: "room", verificationStatus: "unverified", overBudgetPHP: 0 },
          ],
          alternatives: [],
          complete: true,
        },
      },
    });
  });
  await page.route("**/api/rentals**", route => {
    const url = new URL(route.request().url());
    return route.fulfill({
      status: 200,
      json: {
        rentals: url.searchParams.get("id") === "m-1"
          ? [{ id: "m-1", title: "Mandaue Verified Room", locality: "Mandaue", type: "room", description: "", available: true, price: 8500, coordinates: [123.9, 10.3], amenities: [] }]
          : [],
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Open rental assistant" }).click();
  const panel = page.getByRole("region", { name: "AbangCebu assistant" });
  await panel.getByLabel("Message the AbangCebu assistant").fill("show rooms under 10k");
  await panel.getByRole("button", { name: "Send message" }).click();

  const log = panel.getByRole("log", { name: "Conversation with AbangCebu assistant" });
  const viewButton = panel.getByRole("button", { name: "View Mandaue Verified Room on map" });
  await expect(viewButton).toBeVisible();

  await panel.getByLabel("Message the AbangCebu assistant").fill("cheapest");
  await panel.getByRole("button", { name: "Send message" }).click();
  await expect(log).toContainText("The cheapest match is Mandaue Verified Room");
  expect(requests).toBe(1);

  await viewButton.click();
  await expect(panel).toBeHidden();
});
