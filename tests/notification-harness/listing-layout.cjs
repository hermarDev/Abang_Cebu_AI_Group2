/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser harness. */
const path = require("node:path");
const { build } = require(require.resolve("esbuild", { paths: [require.resolve("vitest/package.json")] }));
const postcss = require("postcss");
const tailwind = require("@tailwindcss/postcss");
const fs = require("node:fs/promises");
const root = path.resolve(__dirname, "../..");

async function assets() {
  const bundle = await build({ entryPoints: [path.join(__dirname, "listing-layout-entry.tsx")], bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic", loader: { ".module.css": "empty" }, nodePaths: [path.join(root, "node_modules")], alias: { "@": path.join(root, "src") }, plugins: [{ name: "fixture", setup(builder) {
    builder.onResolve({ filter: /^@\/components\/map\/(MapSearch|MapCanvasLoader)$/ }, () => ({ path: "map", namespace: "fixture" }));
    builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "navigation", namespace: "fixture" }));
    builder.onLoad({ filter: /^navigation$/, namespace: "fixture" }, () => ({ contents: "export function useRouter() { return { push() {} }; }", loader: "js" }));
    builder.onLoad({ filter: /^map$/, namespace: "fixture" }, () => ({ contents: "export default function Map() { return null; }", loader: "js" }));
  } }] });
  const cssPath = path.join(root, "src/app/globals.css");
  const css = await postcss([tailwind()]).process(await fs.readFile(cssPath, "utf8"), { from: cssPath });
  return { js: bundle.outputFiles[0].text, css: css.css };
}
module.exports = { assets };
