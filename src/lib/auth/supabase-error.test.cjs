/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness loads transpiled TypeScript modules. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const originalResolve = Module._resolveFilename;
require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename,
  });
  module._compile(output.outputText, filename);
};
Module._resolveFilename = function (name, parent, isMain, options) {
  if (name.startsWith('@/')) name = path.resolve(process.cwd(), 'src', name.slice(2));
  try { return originalResolve.call(this, name, parent, isMain, options); }
  catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND' || path.extname(name)) throw error;
    return originalResolve.call(this, `${name}.ts`, parent, isMain, options);
  }
};
const { createSafeSupabaseAuthError } = require('./supabase-error');

test('maps known auth errors to fixed safe copy without reflecting provider details', () => {
  const mapped = createSafeSupabaseAuthError({ message: 'Invalid login credentials: raw-secret' });
  assert.equal(mapped.error.code, 'AUTH_INVALID_CREDENTIALS');
  assert.equal(mapped.error.status, 401);
  assert.equal(mapped.error.message, 'Invalid email or password.');
  assert.ok(!JSON.stringify(mapped).includes('raw-secret'));
});

test('does not expose provider registration errors or reveal account existence', () => {
  const result = createSafeSupabaseAuthError({ message: 'User already registered private@example.test', code: 'user_already_exists' });
  assert.equal(result.error.code, 'INTERNAL_AUTH_ERROR');
  assert.ok(!JSON.stringify(result).includes('private@example.test'));
});
test('maps rate limits to fixed non-sensitive copy', () => {
  const limited = createSafeSupabaseAuthError({ message: 'over_email_send_rate_limit token=secret' });
  assert.equal(limited.error.code, 'RATE_LIMIT_EXCEEDED');
  assert.equal(limited.error.status, 429);
  assert.ok(!JSON.stringify(limited).includes('secret'));
});

test('maps expired links and password policy errors safely; unknown errors fail closed', () => {
  assert.equal(createSafeSupabaseAuthError({ message: 'Auth session expired private-token' }).error.code, 'CONFIRMATION_CODE_INVALID');
  assert.equal(createSafeSupabaseAuthError({ message: 'Password should be at least 12 characters secret' }).error.code, 'WEAK_PASSWORD');
  const unknown = createSafeSupabaseAuthError({ message: 'SQLSTATE 42501 private table info', details: 'stack secret', hint: 'schema secret' });
  assert.equal(unknown.error.code, 'INTERNAL_AUTH_ERROR');
  assert.equal(unknown.error.message, 'An unexpected authentication error occurred. Please try again.');
  for (const secret of ['SQLSTATE', 'private table', 'stack secret', 'schema secret']) assert.ok(!JSON.stringify(unknown).includes(secret));
});

test('accepts arbitrary thrown shapes without exposing input', () => {
  for (const input of [null, 'private failure', new Error('private error'), { message: 42, details: 'hidden' }]) {
    const response = createSafeSupabaseAuthError(input);
    assert.equal(response.success, false);
    assert.ok(!JSON.stringify(response).includes('private'));
    assert.ok(!JSON.stringify(response).includes('hidden'));
  }
});
