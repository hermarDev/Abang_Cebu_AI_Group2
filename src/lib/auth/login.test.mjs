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
const state = { abuseCalls: [] };
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
          if (state.signInError) return { data: { user: null }, error: state.signInError === true ? { message: 'Invalid login credentials' } : state.signInError };
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
  if (name.endsWith('/registration-abuse')) return {
    loginAbuseError(kind) {
      return { success: false, error: { code: kind === 'captcha' ? 'CAPTCHA_VERIFICATION_FAILED' : 'RATE_LIMIT_EXCEEDED', message: kind, status: kind === 'captcha' ? 403 : 429 } };
    },
    async verifyLoginChallenge() { state.abuseCalls.push('challenge'); return state.challengeAllowed !== false; },
    async checkLoginFailureLimit() { state.abuseCalls.push('check'); return state.limitAllowed !== false && !state.blockOnCredentialFailure; },
    async consumeLoginAttempt() { state.abuseCalls.push('attempt'); return state.incrementAllowed !== false; },
    async resetLoginFailureLimit() { state.abuseCalls.push('reset'); },
  };
  return originalLoad.call(this, name, parent, isMain);
};
const { POST } = require('../../app/api/auth/login/route.ts');
const { loginDestination, validateLoginInput } = require('./login.ts');

function reset({ signInError = false, verified = true, simulateCookieBeforeFailure = false, blockOnCredentialFailure = false, profile = { role: 'renter', is_suspended: false }, profileError = null, challengeAllowed = true, limitAllowed = true, incrementAllowed = true } = {}) {
  Object.assign(state, { signInError, verified, simulateCookieBeforeFailure, blockOnCredentialFailure, profile, profileError, challengeAllowed, limitAllowed, incrementAllowed, signOutCalls: 0, table: null, payload: null, abuseCalls: [] });
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

test.after(() => {
  Module._load = originalLoad;
  Module._resolveFilename = originalResolve;
});

test('validates login input and rejects malformed payload without auth call', async () => {
  reset();
  assert.deepEqual(validateLoginInput({ email: ' A@B.COM ', password: 'abcdefgh' }), {
    email: 'a@b.com', password: 'abcdefgh', rememberMe: false, turnstileToken: undefined,
  });
  for (const fields of [{ rememberMe: 'yes' }, { password: 'short' }, { email: 'invalid' }]) {
    const { response } = await login(fields);
    assert.equal(response.status, 422);
    assert.equal(state.payload, null);
  }
});

test('invalid challenge and a locked-out account do not call Supabase', async () => {
  reset({ challengeAllowed: false });
  assert.equal((await login()).response.status, 403);
  assert.equal(state.abuseCalls.join(','), 'challenge');
  assert.equal(state.payload, null);
  reset({ limitAllowed: false });
  assert.equal((await login()).response.status, 429);
  assert.equal(state.abuseCalls.join(','), 'challenge,check');
  assert.equal(state.payload, null);
});

test('wrong password and unknown email increment failure counter once and return generic errors', async () => {
  reset({ signInError: { message: 'Invalid login credentials' } });
  const wrong = await login();
  assert.equal(wrong.response.status, 401);
  assert.equal(wrong.body.error.code, 'AUTH_INVALID_CREDENTIALS');
  assert.equal(state.abuseCalls.join(','), 'challenge,check,attempt');
  assert.equal(wrong.response.cookies.getAll().length, 0);
  reset({ signInError: { message: 'Invalid login credentials' } });
  const unknown = await login({ email: 'unknown@test.com' });
  assert.equal(unknown.body.error.code, wrong.body.error.code);
  assert.equal(unknown.body.error.message, wrong.body.error.message);
  assert.equal(state.abuseCalls.filter((call) => call === 'attempt').length, 1);
  assert.equal(state.abuseCalls.filter((call) => call === 'check').length, 1);
});

test('fifth invalid credential is rejected by the shared Redis limit', async () => {
  reset({ signInError: { message: 'Invalid login credentials' }, blockOnCredentialFailure: true });
  const { response, body } = await login();
  assert.equal(response.status, 429);
  assert.equal(body.error.code, 'RATE_LIMIT_EXCEEDED');
  assert.equal(state.abuseCalls.join(','), 'challenge,check');
});

test('provider outage does not count as a bad-password attempt', async () => {
  reset({ signInError: { message: 'temporary provider outage' } });
  const { response, body } = await login();
  assert.equal(response.status, 500);
  assert.equal(body.error.code, 'INTERNAL_AUTH_ERROR');
  assert.equal(state.abuseCalls.join(','), 'challenge,check');
});

test('unknown Supabase login errors return generic contract without reflecting provider diagnostics', async () => {
  reset({ signInError: { message: 'permission denied in private schema', details: 'stack-token', hint: 'internal table' } });
  const { response, body } = await login();
  assert.equal(response.status, 500);
  assert.equal(body.error.code, 'INTERNAL_AUTH_ERROR');
  assert.equal(body.error.message, 'An unexpected authentication error occurred. Please try again.');
  for (const secret of ['private schema', 'stack-token', 'internal table']) assert.ok(!JSON.stringify(body).includes(secret));
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
  assert.equal(state.abuseCalls.join(','), 'challenge,check,reset');
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
  assert.equal(loginDestination('renter', '/%09//evil.test'), '/search');
  assert.equal(loginDestination('landlord', 'https://evil.test'), '/landlord/dashboard');
});
