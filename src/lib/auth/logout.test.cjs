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

const logoutPath = path.join(__dirname, "logout.ts");
const authTypes = loadTypeScript(path.join(__dirname, "../../types/auth.ts"));
const logout = loadTypeScript(logoutPath, { "@/types/auth": authTypes });

test("accepts only supported Supabase logout scopes", () => {
  assert.equal(logout.isLogoutScope("local"), true);
  assert.equal(logout.isLogoutScope("global"), true);
  assert.equal(logout.isLogoutScope("others"), true);
  assert.equal(logout.isLogoutScope("admin"), false);
  assert.equal(logout.isLogoutScope(null), false);
});

test("allows safe root-relative logout redirects and rejects external or control paths", () => {
  assert.equal(logout.getSafeLogoutRedirect("/login?message=logged_out"), "/login?message=logged_out");
  assert.equal(logout.getSafeLogoutRedirect("//evil.example"), "/login?message=logged_out");
  assert.equal(logout.getSafeLogoutRedirect("/%09//evil.example"), "/login?message=logged_out");
  assert.equal(logout.getSafeLogoutRedirect("/\\\\evil.example"), "/login?message=logged_out");
  assert.equal(logout.getSafeLogoutRedirect("https://evil.example"), "/login?message=logged_out");
});

test("finds Supabase auth cookie bases and numeric chunks, not verifier or unrelated cookies", () => {
  const cookies = [
    { name: "sb-project-auth-token" },
    { name: "sb-project-auth-token.0" },
    { name: "sb-project-auth-token.12" },
    { name: "sb-project-auth-token.flows-code-verifier" },
    { name: "theme" },
    { name: "sb-other-auth-token.0" },
  ];
  assert.deepEqual(
    logout.getSupabaseAuthCookieNames(cookies),
    ["sb-project-auth-token", "sb-project-auth-token.0", "sb-project-auth-token.12", "sb-other-auth-token.0"],
  );
});
