import { test, expect } from "./fixtures";

for (const theme of ["light", "dark"] as const) {
  test(`assistant replies use one bubble in ${theme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.addInitScript((value) => localStorage.setItem("abangcebu-theme", value), theme);
    await page.goto("/");
    await expect(page.locator("main")).toHaveAttribute("data-theme", theme);
    await page.getByRole("button", { name: "Open rental assistant" }).click();
    const reply = page.getByRole("log", { name: "Conversation with AbangCebu assistant" }).locator("div[class*='chatAssistantReply']").first();
    const paragraph = reply.locator("p").first();
    await expect(paragraph).toBeVisible();
    await expect(paragraph).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(paragraph).toHaveCSS("padding", "0px");
    await expect(paragraph).toHaveCSS("max-width", "none");
  });
}
