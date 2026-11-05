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
