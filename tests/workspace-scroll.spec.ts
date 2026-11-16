import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

import type { PluginBuild } from "esbuild";

// eslint-disable-next-line @typescript-eslint/no-require-imports -- esbuild is supplied by Vitest.
const { build } = require(require.resolve("esbuild", { paths: [require.resolve("vitest/package.json")] }));
const root = process.cwd();

const entry = `
import React from "react";
import { createRoot } from "react-dom/client";
import { LayoutDashboard } from "lucide-react";
import { WorkspaceShell, WorkspaceMobileNav } from "@/components/dashboard/WorkspaceShell";
import { AccountMenu } from "@/components/ui/AccountMenu";
const links = Array.from({length: 18}, (_, i) => ({href: '/item'+i, label: 'Item '+i, Icon: LayoutDashboard}));
createRoot(document.getElementById('root')).render(<WorkspaceShell pathname="/item0" brand={<span>Brand</span>} headerActions={<AccountMenu displayName="Test Admin" role="admin" />} asideAriaLabel="Test navigation" sidebarTitle="Tools" navAriaLabel="Test workspace" navGroups={[{label:'Items', links}]} title="Dashboard" mobileNav={<WorkspaceMobileNav pathname="/item0" navAriaLabel="Mobile navigation" moreAriaLabel="More options" links={links.slice(0,2)} />}><div style={{height: 2400}}><p>Content start</p><p style={{marginTop:2200}}>Content end</p></div></WorkspaceShell>);
`;

test("workspace scrolls content independently with reachable sidebar and mobile navigation", async ({ page }) => {
  const bundle = await build({ stdin: { contents: entry, resolveDir: root, loader: "tsx" }, bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic", loader: { ".module.css": "empty" }, alias: { "@": path.join(root, "src") }, plugins: [{ name: "next-fixtures", setup(builder: PluginBuild) {
    builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "fixture" }));
    builder.onLoad({ filter: /^link$/, namespace: "fixture" }, () => ({ contents: "import React from 'react'; export default function Link({href,children,...props}) { return <a href={href} {...props}>{children}</a> }", loader: "jsx", resolveDir: root }));
  } }] });
  const cssPath = path.join(root, "src/app/globals.css");
  const css = await postcss([tailwind()]).process(await readFile(cssPath, "utf8"), { from: cssPath });
  await page.route("http://workspace.test/**", route => route.fulfill({ contentType: "text/html", body: `<html><head><style>${css.css}</style></head><body><div id="root"></div><script>${bundle.outputFiles[0].text}</script></body></html>` }));
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto("http://workspace.test/");
  const aside = page.getByRole("complementary", { name: "Test navigation" });
  const content = page.getByText("Content start").locator("../..");
  const initial = await aside.boundingBox();
  expect(initial).not.toBeNull();
  await content.evaluate(el => { el.scrollTop = 600; });
  expect(await content.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(Math.abs((await aside.boundingBox())!.y - initial!.y)).toBeLessThan(1);
  const sidebarScroll = aside.locator(":scope > div");
  await sidebarScroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(aside.getByRole("link", { name: "Item 17" })).toBeInViewport();
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  await page.getByLabel("Account options for Test Admin").click();
  const accountLink = page.getByRole("link", { name: "Account settings" });
  await expect(accountLink).toBeInViewport();
  const receivesPointer = await accountLink.evaluate(el => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!hit && el.contains(hit); });
  expect(receivesPointer).toBe(true);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 700 });
  await expect(aside).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await expect(page.getByText("Content start")).toBeVisible();
  const mobileContent = page.getByRole("region", { name: "Workspace content" });
  await mobileContent.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(page.getByText("Content end")).toBeInViewport();
  expect(await mobileContent.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeInViewport();
});
