"use strict";

/* eslint-disable @typescript-eslint/no-require-imports, @next/next/no-assign-module-variable */
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function loadTypeScript(filePath, dependencies = {}) {
  const source = readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  const localRequire = (specifier) => {
    if (Object.hasOwn(dependencies, specifier)) return dependencies[specifier];
    return require(specifier);
  };
  vm.runInNewContext(
    `(function(require,module,exports){${compiled}\n})`,
    { Object },
  )(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const routePath = path.join(__dirname, "route.ts");
const routeSource = readFileSync(routePath, "utf8");
const compiledRoute = ts.transpileModule(routeSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const types = loadTypeScript(path.join(__dirname, "../../../types/auth.ts"));

function createResponse(status = 200, body = null, initialHeaders) {
  const headers = new Headers(initialHeaders);
  const cookies = new Map();
  return {
    status,
    body,
    headers,
    cookies: {
      set(name, value, options) { cookies.set(name, { name, value, ...options }); },
      getAll() { return [...cookies.values()]; },
    },
  };
}

function createRoute({ signOutResult = { error: null }, throwOnSignOut = false, withConfig = true } = {}) {
  let signOutArgs;
  const responseApi = {
    json(body, init = {}) { return createResponse(init.status, body, init.headers); },
  };
  const supabaseApi = {
    createServerClient(url, key) {
      assert.equal(url, "https://supabase.test");
      assert.equal(key, "anon-test-key");
      return {
        auth: {
          async signOut(options) {
            signOutArgs = options;
            if (throwOnSignOut) throw new Error("private upstream failure");
            return signOutResult;
          },
        },
      };
    },
  };
  const loadedRoute = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier === "@supabase/ssr") return supabaseApi;
    if (specifier === "next/server") return { NextResponse: responseApi };
    if (specifier === "@/types/auth") return types;
    if (specifier === "@/lib/auth/logout") {
      return loadTypeScript(path.join(__dirname, "../../../lib/auth/logout.ts"), {
        "@/types/auth": types,
      });
    }
    return require(specifier);
  };
  vm.runInNewContext(
    `(function(require,module,exports){${compiledRoute}\n})`,
    { Object, Headers, Date, process: { env: withConfig ? {
      NEXT_PUBLIC_SUPABASE_URL: "https://supabase.test",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-test-key",
    } : {} } },
  )(localRequire, loadedRoute, loadedRoute.exports);
  const requestCookies = [
    { name: "sb-project-auth-token.0", value: "secret-cookie-chunk" },
    { name: "sb-project-auth-token.1", value: "another-cookie-chunk" },
    { name: "sb-project-auth-token.flows-code-verifier", value: "preserve-pkce" },
    { name: "theme", value: "dark" },
  ];
  const request = {
    nextUrl: new URL("https://app.example/api/logout"),
    cookies: { getAll: () => requestCookies },
    async json() { return { scope: "global", redirectUrl: "//evil.example" }; },
  };
  return {
    handler: loadedRoute.exports.POST,
    request,
    get signOutArgs() { return signOutArgs; },
  };
}

test("POST revokes the requested valid scope, masks redirects and expires every numeric cookie chunk", async () => {
  const route = createRoute();
  const response = await route.handler(route.request);
  assert.equal(route.signOutArgs.scope, "global");
  assert.equal(JSON.stringify(response.body), JSON.stringify({
    success: true,
    data: { scope: "global", redirectUrl: "/login?message=logged_out" },
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-session-cookies-cleared"), "true");
  const cleared = response.cookies.getAll();
  assert.deepEqual(cleared.map(({ name }) => name).sort(), [
    "sb-project-auth-token.0",
    "sb-project-auth-token.1",
  ]);
  assert.ok(cleared.every((cookie) => cookie.maxAge === 0 && cookie.expires.getTime() === 0 && cookie.httpOnly));
});

test("POST defaults an unsupported scope to local and clears cookies after upstream error", async () => {
  const route = createRoute({ signOutResult: { error: { message: "do not expose this" } } });
  route.request.json = async () => ({ scope: "admin" });
  const response = await route.handler(route.request);
  assert.equal(JSON.stringify(route.signOutArgs), JSON.stringify({ scope: "local" }));
  assert.equal(response.status, 502);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, "AUTH_LOGOUT_FAILED");
  assert.equal(response.body.error.status, 502);
  assert.match(response.body.error.message, /credentials have been cleared/);
  assert.deepEqual(response.cookies.getAll().map(({ name }) => name).sort(), [
    "sb-project-auth-token.0",
    "sb-project-auth-token.1",
  ]);
});

test("POST clears cookies and returns a safe error when Supabase throws", async () => {
  const route = createRoute({ throwOnSignOut: true });
  const response = await route.handler(route.request);
  assert.equal(response.status, 502);
  assert.equal(JSON.stringify(response.body).includes("private upstream"), false);
  assert.equal(response.cookies.getAll().length, 2);
});

test("POST without Supabase config still clears local cookie chunks", async () => {
  const route = createRoute({ withConfig: false });
  const response = await route.handler(route.request);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("x-session-cookies-cleared"), "true");
  assert.equal(response.cookies.getAll().length, 2);
  assert.equal(response.body.error.code, "AUTH_LOGOUT_FAILED");
});
