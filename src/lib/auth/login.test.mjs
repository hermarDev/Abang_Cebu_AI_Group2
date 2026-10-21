import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
const originalLoad = Module._load;
const originalResolve = Module._resolveFilename;
const state = {};
require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
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
Module._load = function (name, parent, isMain) {
  if (name === '@supabase/ssr') return { createServerClient(_url, _key, options) {
    state.options = options;
    return {
      auth: {
        async signInWithPassword(payload) {
          state.payload = payload;
          if (state.signInError) return { data: { user: null }, error: { message: 'invalid' } };
          if (state.verified || state.simulateCookieBeforeFailure) options.cookies.setAll([
            { name: 'sb-test-auth-token.0', value: 'synthetic-cookie', options: { maxAge: 1234 } },
            { name: 'sb-test-auth-token.1', value: 'synthetic-cookie', options: { maxAge: 1234 } },
          ], { 'Cache-Control': 'private, no-store' });
          return { data: { user: { id: 'user-test', email_confirmed_at: state.verified ? '2026-01-01' : null } }, error: null };
        },
        async signOut() { state.signOutCalls++; return { error: null }; },
      },
      from(table) {
        state.table = table;
        return { select(columns) {
          state.columns = columns;
          return { eq(column, id) {
            state.lookup = [column, id];
            return { async single() { return { data: state.profile, error: state.profileError }; } };
          } };
        } };
      },
    };
  } };
  return originalLoad.call(this, name, parent, isMain);
};
const { POST } = require('../../app/api/auth/login/route.ts');
const { loginDestination, validateLoginInput } = require('./login.ts');

function reset({ signInError = false, verified = true, simulateCookieBeforeFailure = false, profile = { role: 'renter', is_suspended: false }, profileError = null } = {}) {
  Object.assign(state, { signInError, verified, simulateCookieBeforeFailure, profile, profileError, signOutCalls: 0, table: null, payload: null });
}
function login(fields = {}, cookie) {
  const request = new NextRequest('https://app.test/api/auth/login', {
    method: 'POST', headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: 'sb-test-auth-token.0=stale-session' } : {}),
    },
    body: JSON.stringify({ email: '  USER@Test.COM ', password: 'Synthetic123!', ...fields }),
  });
  return POST(request).then(async (response) => ({ response, body: await response.json() }));
}

test('validates login input and rejects malformed payload without auth call', async () => {
  reset();
  assert.deepEqual(validateLoginInput({ email: ' A@B.COM ', password: 'abcdefgh' }), {
    email: 'a@b.com', password: 'abcdefgh', rememberMe: false,
  });
  for (const fields of [{ rememberMe: 'yes' }, { password: 'short' }, { email: 'invalid' }]) {
    const { response } = await login(fields);
    assert.equal(response.status, 422);
    assert.equal(state.payload, null);
  }
});

test('wrong password and unknown email return identical generic errors without session cookies', async () => {
  reset({ signInError: true });
  const wrong = await login();
  const unknown = await login({ email: 'unknown@test.com' });
  assert.equal(wrong.response.status, 401);
  assert.equal(unknown.response.status, 401);
  assert.equal(wrong.body.error.code, unknown.body.error.code);
  assert.equal(wrong.body.error.message, unknown.body.error.message);
  assert.equal(wrong.body.error.status, unknown.body.error.status);
  assert.equal(wrong.body.error.code, 'AUTH_INVALID_CREDENTIALS');
  assert.equal(wrong.response.cookies.getAll().length, 0);
});

test('generic credential failure does not revoke an existing session', async () => {
  reset({ signInError: true });
  const { response, body } = await login({}, true);
  assert.equal(response.status, 401);
  assert.equal(body.error.code, 'AUTH_INVALID_CREDENTIALS');
  assert.equal(response.cookies.getAll().length, 0);
  assert.equal(state.signOutCalls, 0);
});

test('verified renter gets HTTP-only session cookies and a safe destination, never tokens in JSON', async () => {
  reset();
  const { response, body } = await login({ next: '/renter/saved?near=cit-u' });
  assert.equal(response.status, 200);
  assert.equal(state.table, 'profiles');
  assert.equal(state.columns, 'role, is_suspended');
  assert.deepEqual(state.lookup, ['id', 'user-test']);
  assert.deepEqual(state.payload, { email: 'user@test.com', password: 'Synthetic123!' });
  assert.deepEqual(body.data, { redirectUrl: '/renter/saved?near=cit-u' });
  assert.equal(JSON.stringify(body).includes('synthetic-cookie'), false);
  assert.equal(response.cookies.get('sb-test-auth-token.0').httpOnly, true);
  assert.equal(response.cookies.get('sb-test-auth-token.0').maxAge, undefined);
  assert.equal(response.cookies.get('abangcebu-remember').value, '0');
  assert.equal(response.headers.get('cache-control').includes('no-store'), true);
});

test('Remember Me persists all chunked cookies for 30 days', async () => {
  reset({ profile: { role: 'landlord', is_suspended: false } });
  const { response, body } = await login({ rememberMe: true });
  assert.equal(body.data.redirectUrl, '/landlord/dashboard');
  for (const name of ['sb-test-auth-token.0', 'sb-test-auth-token.1', 'abangcebu-remember']) {
    assert.equal(response.cookies.get(name).maxAge, 2592000);
    assert.equal(response.cookies.get(name).httpOnly, true);
  }
});

test('unverified account clears issued auth cookies', async () => {
  reset({ verified: false });
  const { response, body } = await login();
  assert.equal(body.error.code, 'AUTH_EMAIL_NOT_CONFIRMED');
  assert.equal(response.cookies.getAll().length, 0);
  assert.equal(state.signOutCalls, 1);
});

test('suspended account clears prior chunked session cookies on failure', async () => {
  reset({ profile: { role: 'renter', is_suspended: true } });
  const { response } = await login({}, true);
  assert.equal(response.status, 403);
  assert.equal(response.cookies.get('sb-test-auth-token.0').value, '');
  assert.equal(response.cookies.get('sb-test-auth-token.0').maxAge, 0);
});

test('profile lookup failure and unknown role fail closed; redirect rejects foreign role and external URLs', async () => {
  reset({ profileError: new Error('database unavailable') });
  assert.equal((await login()).body.error.code, 'INTERNAL_AUTH_ERROR');
  assert.equal(state.signOutCalls, 1);
  reset({ profile: { role: 'superuser', is_suspended: false } });
  const unknownRole = await login();
  assert.equal(unknownRole.body.error.code, 'INTERNAL_AUTH_ERROR');
  assert.equal(loginDestination('renter', '/admin/users'), '/search');
  assert.equal(loginDestination('landlord', 'https://evil.test'), '/landlord/dashboard');
});
