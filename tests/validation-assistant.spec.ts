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
