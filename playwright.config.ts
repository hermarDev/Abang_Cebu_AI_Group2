import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }], ["junit", { outputFile: "test-results/junit.xml" }]],
  use: {
    baseURL: "http://127.0.0.1:3218",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.PLAYWRIGHT_PRODUCTION_SERVER === "1"
      ? "pnpm exec next start --hostname 127.0.0.1 --port 3218"
      : "pnpm exec next dev --hostname 127.0.0.1 --port 3218",
    url: "http://127.0.0.1:3218",
    reuseExistingServer: process.env.PLAYWRIGHT_SHARED_SERVER === "1",
    timeout: 120_000,
    // Never inherit hosted Supabase configuration from .env files.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "playwright-local-placeholder",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
      TURNSTILE_SECRET_KEY: "",
      NEXT_PUBLIC_MAP_STYLE_URL: "/styles/osm.json",
    },
  },
});
