/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser harness. */
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const { build } = require(require.resolve('esbuild', { paths: [require.resolve('vitest/package.json')] }));

const root = process.cwd();
const mock = path.join(root, 'tests/notification-harness/next-mock.jsx');

const SEEDED_NOTIFICATIONS = [
  {
    id: 'n-1',
    recipient_id: 'u-1',
    actor_id: 'u-landlord',
    type: 'message',
    title: 'New message',
    body: 'Your landlord replied to your inquiry.',
    link: '/messages?thread=t-1',
    entity_type: 'conversation',
    entity_id: 't-1',
    is_read: false,
    read_at: null,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'n-2',
    recipient_id: 'u-1',
    actor_id: 'u-admin',
    type: 'listing_update',
    title: 'Listing updated',
    body: 'A saved property has changed its price.',
    link: '/rentals/r-1',
    entity_type: 'property',
    entity_id: 'r-1',
    is_read: true,
    read_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n-3',
    recipient_id: 'u-1',
    actor_id: 'u-system',
    type: 'security',
    title: 'Security notice',
    body: 'Your password was recently updated.',
    link: '/account',
    entity_type: 'account',
    entity_id: null,
    is_read: false,
    read_at: null,
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

async function run() {
  const entryPath = path.join(root, 'tests/notification-harness/notifications-test-entry.tsx');
  require('node:fs').writeFileSync(
    entryPath,
    `import React from "react";
import { createRoot } from "react-dom/client";
import { NotificationBell } from "@/features/notifications/NotificationBell";

function App() {
  return (
    <div className="p-8 flex justify-end">
      <NotificationBell userId="u-1" />
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
`
  );

  const bundle = await build({
    entryPoints: [entryPath],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    loader: { '.module.css': 'empty' },
    nodePaths: [path.join(root, 'node_modules')],
    alias: { '@': path.join(root, 'src') },
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [
      {
        name: 'stubs',
        setup(b) {
          b.onResolve({ filter: /^next\/(image|link|navigation)$/ }, (args) => {
            if (args.path === 'next/link') return { path: mock, namespace: 'mock-link' };
            if (args.path === 'next/navigation') return { path: mock, namespace: 'mock-nav' };
            return { path: mock, namespace: 'file' };
          });
          b.onLoad({ filter: /.*/, namespace: 'mock-link' }, () => ({
            contents: 'export { MockLink as default } from "' + mock + '"',
            loader: 'jsx',
            resolveDir: root,
          }));
          b.onLoad({ filter: /.*/, namespace: 'mock-nav' }, () => ({
            contents: 'export { useRouter, usePathname } from "' + mock + '"',
            loader: 'jsx',
            resolveDir: root,
          }));
        },
      },
    ],
  });

  let notificationsState = [...SEEDED_NOTIFICATIONS];

  const server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') {
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
      res.end(bundle.outputFiles[0].contents);
    } else {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html>
<html class="dark">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    html, body { margin: 0; padding: 0; background: #09090b; color: #f4f4f5; font-family: sans-serif; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="/bundle.js"></script>
</body>
</html>`);
    }
  });

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true });

  // 1. DESKTOP TEST
  console.log('Testing Desktop Popover...');
  const desktopPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  desktopPage.on('pageerror', (err) => console.log('PAGE ERROR:', err));
  desktopPage.on('console', (msg) => console.log('CONSOLE:', msg.text()));

  await desktopPage.route('**/api/notifications*', (route) => {
    const req = route.request();
    if (req.method() === 'GET') {
      const unreadCount = notificationsState.filter((n) => !n.is_read).length;
      route.fulfill({
        json: {
          notifications: notificationsState,
          totalCount: notificationsState.length,
          unreadCount,
          hasMore: false,
        },
      });
    } else if (req.method() === 'PATCH') {
      const data = JSON.parse(req.postData() || '{}');
      if (data.action === 'mark_all_read') {
        notificationsState = notificationsState.map((n) => ({ ...n, is_read: true }));
        route.fulfill({ json: { unreadCount: 0 } });
      } else if (data.action === 'mark_read') {
        notificationsState = notificationsState.map((n) =>
          n.id === data.id ? { ...n, is_read: true } : n
        );
        const unreadCount = notificationsState.filter((n) => !n.is_read).length;
        route.fulfill({ json: { unreadCount } });
      } else {
        route.fulfill({ status: 400 });
      }
    }
  });

  await desktopPage.goto('http://127.0.0.1:' + port + '/');
  const bell = desktopPage.locator('button[aria-label*="Notifications"]');
  await bell.waitFor();

  // Check unread badge has 2 (from 2 unread notifications)
  const badgeText = await bell.locator('span').textContent();
  console.log('Unread badge count:', badgeText);
  assert.equal(badgeText, '2', 'Unread count should initially be 2');

  // Open Popover
  await bell.click();
  await desktopPage.waitForSelector('text=Notifications');
  console.log('Popover opened!');

  // Check filter tabs
  const unreadTab = desktopPage.locator('button:has-text("Unread")');
  await unreadTab.click();
  await desktopPage.waitForTimeout(200);

  // Check mark all read button
  const markAllReadBtn = desktopPage.locator('button:has-text("Mark all read")');
  await markAllReadBtn.click();
  await desktopPage.waitForTimeout(300);

  // Badge should disappear or count should be 0
  const remainingBadge = await bell.locator('span').count();
  console.log('Remaining badge count elements:', remainingBadge);
  assert.equal(remainingBadge, 0, 'Badge should disappear when unreadCount is 0');
  console.log('Desktop Popover test PASSED!');

  // 2. MOBILE TEST
  console.log('Testing Mobile Sheet Drawer...');
  notificationsState = [...SEEDED_NOTIFICATIONS]; // reset state
  const mobilePage = await browser.newPage({ viewport: { width: 430, height: 932 } });

  await mobilePage.route('**/api/notifications*', (route) => {
    const req = route.request();
    if (req.method() === 'GET') {
      const unreadCount = notificationsState.filter((n) => !n.is_read).length;
      route.fulfill({
        json: {
          notifications: notificationsState,
          totalCount: notificationsState.length,
          unreadCount,
          hasMore: false,
        },
      });
    } else if (req.method() === 'PATCH') {
      notificationsState = notificationsState.map((n) => ({ ...n, is_read: true }));
      route.fulfill({ json: { unreadCount: 0 } });
    }
  });

  await mobilePage.goto('http://127.0.0.1:' + port + '/');
  const mobileBell = mobilePage.locator('button[aria-label*="Notifications"]');
  await mobileBell.waitFor();

  // Click bell to open mobile bottom sheet
  await mobileBell.click();
  await mobilePage.waitForSelector('[data-slot="sheet-content"]');
  const side = await mobilePage.getAttribute('[data-slot="sheet-content"]', 'data-side');
  console.log('Mobile sheet side:', side);
  assert.equal(side, 'bottom', 'Mobile viewport should open notification center as bottom sheet drawer');

  // Close sheet
  await mobilePage.locator('[data-slot="sheet-content"] button[aria-label="Close panel"]').click();
  await mobilePage.waitForSelector('[data-slot="sheet-content"]', { state: 'detached' });
  console.log('Mobile bottom sheet closed successfully!');

  await browser.close();
  server.close();
  console.log('ALL PLAYWRIGHT NOTIFICATION E2E TESTS PASSED!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
