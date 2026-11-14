import path from "node:path";
import fs from "node:fs/promises";
import { test, expect } from "./fixtures";

/* eslint-disable @typescript-eslint/no-require-imports -- Playwright CJS runtime loads esbuild/postcss from vitest/postcss packages. */
const { build } = require(require.resolve("esbuild", { paths: [require.resolve("vitest/package.json")] }));
const postcss = require("postcss");
const tailwind = require("@tailwindcss/postcss");
/* eslint-enable @typescript-eslint/no-require-imports */

const LANDLORD_ID = "00000000-0000-0000-0000-00000000000a";
const ROOT = process.cwd();
const MOCK_PATH = path.join(ROOT, "tests/notification-harness/next-mock.jsx");

const notifications = [
  {
    id: "n-1",
    recipient_id: LANDLORD_ID,
    actor_id: "00000000-0000-0000-0000-00000000000b",
    type: "message",
    title: "New message",
    body: "Is the unit still available?",
    link: "/landlord/messages?thread=t-1",
    entity_type: "conversation",
    entity_id: "t-1",
    is_read: false,
    read_at: null,
    created_at: "2026-11-12T01:00:00Z",
  },
  {
    id: "n-2",
    recipient_id: LANDLORD_ID,
    actor_id: null,
    type: "listing_review",
    title: "Listing approved",
    body: "Your property is now live.",
    link: "/landlord/dashboard",
    entity_type: "property",
    entity_id: "p-1",
    is_read: true,
    read_at: "2026-11-12T02:00:00Z",
    created_at: "2026-11-12T02:00:00Z",
  },
];

let cachedCss: string | null = null;
const cachedBundles = new Map<string, string>();

async function getHarnessAssets(mode: "bell" | "hub"): Promise<{ html: string; js: string }> {
  if (!cachedCss) {
    const cssPath = path.join(ROOT, "src/app/globals.css");
    const processed = await postcss([tailwind()]).process(await fs.readFile(cssPath, "utf8"), { from: cssPath });
    cachedCss = processed.css;
  }
  let js = cachedBundles.get(mode);
  if (!js) {
    const entryCode = mode === "bell"
      ? `import React from "react";
import { createRoot } from "react-dom/client";
import { NotificationBell } from "@/features/notifications/NotificationBell";
createRoot(document.getElementById("root")!).render(<div className="p-8 flex justify-end"><NotificationBell userId="${LANDLORD_ID}" userRole="landlord" /></div>);`
      : `import React from "react";
import { createRoot } from "react-dom/client";
import { NotificationsHubContent } from "@/features/notifications/NotificationsHubContent";
createRoot(document.getElementById("root")!).render(<NotificationsHubContent userId="${LANDLORD_ID}" userRole="landlord" />);`;

    const bundle = await build({
      stdin: { contents: entryCode, resolveDir: ROOT, loader: "tsx" },
      bundle: true,
      write: false,
      format: "iife",
      platform: "browser",
      jsx: "automatic",
      loader: { ".module.css": "empty" },
      nodePaths: [path.join(ROOT, "node_modules")],
      alias: { "@": path.join(ROOT, "src") },
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [
        {
          name: "next-stubs",
          setup(builder: {
            onResolve: (opts: { filter: RegExp }, cb: (args: { path: string }) => { path: string; namespace: string }) => void;
            onLoad: (opts: { filter: RegExp; namespace: string }, cb: () => { contents: string; loader: string; resolveDir: string }) => void;
          }) {
            builder.onResolve({ filter: /^next\/(image|link|navigation)$/ }, (args) => {
              if (args.path === "next/link") return { path: MOCK_PATH, namespace: "mock-link" };
              if (args.path === "next/navigation") return { path: MOCK_PATH, namespace: "mock-nav" };
              return { path: MOCK_PATH, namespace: "mock-image" };
            });
            builder.onLoad({ filter: /.*/, namespace: "mock-link" }, () => ({
              contents: `export { MockLink as default } from ${JSON.stringify(MOCK_PATH)};`,
              loader: "jsx",
              resolveDir: ROOT,
            }));
            builder.onLoad({ filter: /.*/, namespace: "mock-nav" }, () => ({
              contents: `export { useRouter, usePathname } from ${JSON.stringify(MOCK_PATH)};`,
              loader: "jsx",
              resolveDir: ROOT,
            }));
            builder.onLoad({ filter: /.*/, namespace: "mock-image" }, () => ({
              contents: `export { default } from ${JSON.stringify(MOCK_PATH)};`,
              loader: "jsx",
              resolveDir: ROOT,
            }));
          },
        },
      ],
    });
    const builtJs: string = bundle.outputFiles[0].text;
    cachedBundles.set(mode, builtJs);
    js = builtJs;
  }

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>${cachedCss}</style>
</head>
<body>
  <div id="root"></div>
  <script src="/__harness__/bundle.js?mode=${mode}"></script>
</body>
</html>`;
  return { html, js };
}

async function mountHarness(page: import("@playwright/test").Page, mode: "bell" | "hub") {
  const { html, js } = await getHarnessAssets(mode);
  await page.route("**/__harness__/bundle.js*", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body: js }),
  );
  await page.route(`**/__harness__/${mode}`, (route) =>
    route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html }),
  );
  await page.goto(`/__harness__/${mode}`);
}

test.describe("notifications hub", () => {
  test("flyout exposes persistent actions, per-item dismiss, hub link, and no pagination", async ({ page }) => {
    await page.route(url => url.pathname === "/api/notifications", route => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: { notifications, totalCount: 50, unreadCount: 1, hasMore: true } });
      }
      return route.fulfill({ json: { success: true } });
    });

    await mountHarness(page, "bell");
    await page.getByRole("button", { name: /Notifications/ }).first().click();

    const center = page.getByText("Notifications", { exact: true }).last();
    await expect(center).toBeVisible();

    // Header actions are always reachable in the flyout, without pagination.
    await expect(page.getByRole("button", { name: /Mark all read/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Clear read/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /View all notifications/i })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Pagination" })).toHaveCount(0);

    // Per-item dismiss is exposed with an accessible name.
    await expect(page.getByRole("button", { name: "Dismiss notification: New message" })).toHaveCount(1);
  });

  test("hub renders tabs, search, and bulk selection controls", async ({ page }) => {
    await page.route(url => url.pathname === "/api/notifications", route => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: {
          notifications, totalCount: 2, unreadCount: 1, hasMore: false,
          tabCounts: { all: 2, unread: 1, messages: 1, listings: 1, system: 0 },
        } });
      }
      return route.fulfill({ json: { success: true } });
    });

    await mountHarness(page, "hub");
    await expect(page.getByRole("heading", { name: "Notifications", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /^All\b/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Messages & Inquiries\b/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Listings\b/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^System\b/ })).toBeVisible();
    await expect(page.getByLabel("Search notifications")).toBeVisible();
    await expect(page.getByLabel("Select all visible notifications")).toBeVisible();
    await expect(page.getByText("New message")).toBeVisible();
    await expect(page.getByText("Listing approved")).toBeVisible();
  });

  test("clearing all requires confirmation", async ({ page }) => {
    await page.route(url => url.pathname === "/api/notifications", route => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: {
          notifications, totalCount: 2, unreadCount: 1, hasMore: false,
          tabCounts: { all: 2, unread: 1, messages: 1, listings: 1, system: 0 },
        } });
      }
      return route.fulfill({ json: { success: true } });
    });

    await mountHarness(page, "hub");
    await page.getByRole("button", { name: "Clear all" }).click();
    await expect(page.getByText("Delete all?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Yes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("deleting a single notification issues a scoped DELETE request", async ({ page }) => {
    const deletes: string[] = [];
    await page.route(url => url.pathname === "/api/notifications", route => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: {
          notifications, totalCount: 2, unreadCount: 1, hasMore: false,
          tabCounts: { all: 2, unread: 1, messages: 1, listings: 1, system: 0 },
        } });
      }
      if (route.request().method() === "DELETE") {
        deletes.push(route.request().url());
        return route.fulfill({ json: { success: true, deleted: "n-1" } });
      }
      return route.fulfill({ json: { success: true } });
    });

    await mountHarness(page, "hub");
    await page.getByRole("button", { name: "Dismiss notification: New message" }).click();
    await expect.poll(() => deletes.length).toBeGreaterThan(0);
    expect(deletes[0]).toContain("id=n-1");
  });
});
