"use strict";
/* eslint-disable @typescript-eslint/no-require-imports, @next/next/no-assign-module-variable */
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function compile(filePath, jsx = false) {
  const source = readFileSync(filePath, "utf8");
  return ts.transpileModule(source, {
    compilerOptions: {
      jsx: jsx ? ts.JsxEmit.ReactJSX : undefined,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

const formPath = path.join(__dirname, "logout-form.tsx");
const rootPath = path.join(__dirname, "session-sync-root.tsx");
const layoutPath = path.join(__dirname, "../../app/layout.tsx");
const formOutput = compile(formPath, true);
const rootOutput = compile(rootPath, true);
const layout = readFileSync(layoutPath, "utf8");
let clickHandler;
let stateValues = [];
let postMessages = [];
let refreshes = 0;
let replacements = [];
let requestResponse;
let requestError;
let setStateCalls = [];
let closedChannels = 0;

function useState(initial) {
  stateValues.push(initial);
  return [initial, (value) => setStateCalls.push(value)];
}
const router = {
  refresh() { refreshes += 1; },
  replace(pathname) { replacements.push(pathname); },
};
const components = {
  Link: Symbol("Link"),
  main: Symbol("main"),
  h1: Symbol("h1"),
  p: Symbol("p"),
  button: "button",
};
const formModule = { exports: {} };
function formRequire(specifier) {
  if (specifier === "react") return { useState };
  if (specifier === "next/link") return { default: components.Link };
  if (specifier === "next/navigation") return { useRouter: () => router };
  if (specifier === "@/types/auth") return { SESSION_CONSTANTS: {
    BROADCAST_CHANNEL_NAME: "supabase.auth.token",
    DEFAULT_LOGOUT_REDIRECT: "/login?message=logged_out",
  } };
  if (specifier === "react/jsx-runtime") return {
    jsx(type, props) {
      if (type === components.button) clickHandler = props.onClick;
      return { type, props };
    },
    jsxs(type, props) {
      if (type === components.button) clickHandler = props.onClick;
      return { type, props };
    },
    Fragment: Symbol("Fragment"),
  };
  return require(specifier);
}
class FakeBroadcastChannel {
  constructor(name) { this.name = name; }
  postMessage(message) { postMessages.push({ name: this.name, message }); }
  close() { closedChannels += 1; }
}
async function fakeFetch(url, options) {
  assert.equal(url, "/api/logout");
  assert.equal(options.method, "POST");
  assert.equal(options.cache, "no-store");
  if (requestError) throw requestError;
  return requestResponse;
}
function renderLogoutForm() {
  stateValues = [];
  setStateCalls = [];
  clickHandler = undefined;
  vm.runInNewContext(
    `(function(require,module,exports){${formOutput}\n})`,
    {
      Object, BroadcastChannel: FakeBroadcastChannel, Date,
      fetch: fakeFetch,
      Headers,
      Promise,
    },
  )(formRequire, formModule, formModule.exports);
  return formModule.exports.default();
}
const rootModule = { exports: {} };
function rootRequire(specifier) {
  if (specifier === "react") return { Suspense: Symbol("Suspense") };
  if (specifier === "@/components/auth/session-sync") return { default: Symbol("SessionSync") };
  if (specifier === "react/jsx-runtime") return {
    jsx(type, props) { return { type, props }; },
    jsxs(type, props) { return { type, props }; },
    Fragment: Symbol("Fragment"),
  };
  return require(specifier);
}
vm.runInNewContext(
  `(function(require,module,exports){${rootOutput}\n})`,
  { Object },
)(rootRequire, rootModule, rootModule.exports);

test("app root mounts a session synchronization listener globally", () => {
  assert.match(layout, /<SessionSyncRoot\s*\/>/);
  assert.equal(typeof rootModule.exports.default, "function");
});

test("logout form posts, publishes sign-out, and refreshes/redirects after cookies clear", async () => {
  requestError = null;
  requestResponse = {
    ok: true,
    headers: new Headers({ "x-session-cookies-cleared": "true" }),
    async json() { return { success: true, data: { redirectUrl: "/login?message=logged_out" } }; },
  };
  renderLogoutForm();
  assert.equal(typeof clickHandler, "function");
  await clickHandler();
  assert.equal(postMessages.length, 1);
  assert.equal(postMessages[0].name, "supabase.auth.token");
  assert.equal(postMessages[0].message.type, "SIGNED_OUT");
  assert.equal(postMessages[0].message.redirectUrl, "/login?message=logged_out");
  assert.equal(refreshes, 1);
  assert.deepEqual(replacements, ["/login?message=logged_out"]);
  assert.equal(closedChannels, 1);
});

test("logout does not broadcast until local cookies are confirmed cleared", async () => {
  const before = postMessages.length;
  requestResponse = {
    ok: false,
    headers: new Headers(),
    async json() { return { success: false }; },
  };
  renderLogoutForm();
  await clickHandler();
  assert.equal(postMessages.length, before);
  assert.ok(setStateCalls.includes("Could not clear this session. Please retry."));
});

test("logout reports an offline failure without claiming local cleanup", async () => {
  requestError = new Error("network down");
  const before = postMessages.length;
  renderLogoutForm();
  await clickHandler();
  assert.equal(postMessages.length, before);
  assert.ok(setStateCalls.includes("Could not reach the sign-out service. Please retry while online."));
  requestError = null;
});
