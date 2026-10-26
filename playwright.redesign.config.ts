import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

// Reuse the user-owned development server; fixtures block external writes.
export default defineConfig({
  ...config,
  webServer: undefined,
  use: { ...config.use, baseURL: process.env.FINDER_TEST_URL ?? "http://localhost:3219" },
});
