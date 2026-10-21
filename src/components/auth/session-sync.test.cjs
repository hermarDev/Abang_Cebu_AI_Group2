/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const componentPath = path.join(__dirname, "session-sync.tsx");
const source = readFileSync(componentPath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const channels = [];
const refreshes = [];
const redirects = [];
let pathname = "/landlord/dashboard";
let cleanup;
let closed = false;
const router = {
  refresh() { refreshes.push(pathname); },
  replace(value) { redirects.push(value); },
};
const react = { useEffect(callback) { cleanup = callback(); } };
const navigation = {
  useRouter() { return router; },
  usePathname() { return pathname; },
};
class FakeBroadcastChannel {
  constructor(name) { this.name = name; channels.push(this); }
  set onmessage(listener) { this.listener = listener; }
  close() { closed = true; }
  deliver(data) { this.listener({ data }); }
}
const componentModule = { exports: {} };
function localRequire(specifier) {
  if (specifier === "react") return react;
  if (specifier === "next/navigation") return navigation;
  if (specifier === "@/types/auth") return { SESSION_CONSTANTS: { BROADCAST_CHANNEL_NAME: "supabase.auth.token", DEFAULT_LOGOUT_REDIRECT: "/login?message=logged_out" } };
  if (specifier === "react/jsx-runtime") return { jsx() {}, jsxs() {}, Fragment: Symbol("Fragment") };
  return require(specifier);
}
vm.runInNewContext(
  `(function(require,module,exports){${compiled}\n})`,
  { Object, BroadcastChannel: FakeBroadcastChannel, Date, Number },
)(localRequire, componentModule, componentModule.exports);
const { default: SessionSync, safeRedirect } = componentModule.exports;

test("redirect validation rejects off-origin, slash and encoded control payloads", () => {
  assert.equal(safeRedirect("/account/profile"), "/account/profile");
  assert.equal(safeRedirect("//evil.example"), "/login?message=logged_out");
  assert.equal(safeRedirect("/%09//evil.example"), "/login?message=logged_out");
  assert.equal(safeRedirect("/\\\\evil.example"), "/login?message=logged_out");
});

test("listener refreshes and redirects sibling tabs on valid sign-out broadcast", () => {
  SessionSync();
  assert.equal(channels.length, 1);
  assert.equal(channels[0].name, "supabase.auth.token");
  channels[0].deliver({ type: "SIGNED_OUT", timestamp: Date.now(), redirectUrl: "/login?message=logged_out" });
  assert.equal(refreshes.length, 1);
  assert.deepEqual(redirects, ["/login?message=logged_out"]);
  cleanup();
  assert.equal(closed, true);
});

test("listener ignores malformed, stale and non-sign-out messages", () => {
  refreshes.length = 0;
  redirects.length = 0;
  SessionSync();
  const channel = channels.at(-1);
  channel.deliver({ type: "SIGNED_IN", timestamp: Date.now() });
  channel.deliver({ type: "SIGNED_OUT", timestamp: Number.NaN });
  channel.deliver({ type: "SIGNED_OUT", timestamp: Date.now() + 60_000 });
  assert.equal(refreshes.length, 0);
  assert.equal(redirects.length, 0);
  cleanup();
});
