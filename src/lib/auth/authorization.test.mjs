import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
const state = {};
const originalLoad = Module._load;
const originalResolveFilename = Module._resolveFilename;

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) request = path.resolve(process.cwd(), 'src', request.slice(2));
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND' || path.extname(request)) throw error;
    return originalResolveFilename.call(this, `${request}.ts`, parent, isMain, options);
  }
};

Module._load = function (request, parent, isMain) {
  if (request === '@supabase/ssr') {
    return {
      createServerClient(_url, _key, options) {
        return {
          auth: {
            async getUser() {
              if (state.refreshedCookie) options.cookies.setAll([
                { name: 'sb-test-auth-token.0', value: 'synthetic-refreshed', options: { maxAge: 3456 } },
              ]);
              return state.auth;
            },
            async signOut() {
              state.signOutCalls++;
              options.cookies.setAll([
                { name: 'sb-test-auth-token', value: '', options: { maxAge: 0, path: '/' } },
                { name: 'sb-test-auth-token.0', value: '', options: { maxAge: 0, path: '/' } },
              ]);
              return { error: null };
            },
          },
          from(table) {
            state.profileTables.push(table);
            return {
              select(columns) {
                state.profileColumns = columns;
                return {
                  eq(column, value) {
                    state.profileLookup = [column, value];
                    return { async single() { return state.profile; } };
                  },
                };
              },
            };
          },
        };
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { middleware, config } = require('../../../middleware.ts');
const { getRequiredRole, getRoleHome, isRoleAllowed } = require('./authorization.ts');
const { isSafeRedirectUrl } = require('../../types/auth.ts');

function reset({ user, profile } = {}) {
  state.auth = user
    ? { data: { user }, error: null }
    : { data: { user: null }, error: { message: 'session invalid' } };
  state.profile = profile === undefined
    ? { data: { role: 'renter', is_suspended: false }, error: null }
    : profile;
  state.profileTables = [];
  state.profileColumns = undefined;
  state.profileLookup = undefined;
  state.signOutCalls = 0;
  state.refreshedCookie = null;
}

const user = { id: 'synthetic-user', user_metadata: { role: 'admin' } };
const roleProfile = (role, is_suspended = false) => ({ data: { role, is_suspended }, error: null });

async function visit(url) {
  return middleware(new NextRequest(`https://app.test${url}`));
}

test('allows public map routes without loading a profile role', async () => {
  reset({ user });
  const response = await visit('/map');
  assert.equal(response.status, 200);
  assert.deepEqual(state.profileTables, []);
});

test('redirects guests from protected route families and preserves query in next', async () => {
  for (const route of ['/renter/dashboard', '/landlord/listings/new', '/admin/users', '/account/settings']) {
    reset();
    const response = await visit(route);
    assert.equal(response.status, 302, route);
    const location = new URL(response.headers.get('location'));
    assert.equal(location.pathname, '/login');
    assert.equal(location.searchParams.get('next'), route);
  }
  reset();
  const response = await visit('/renter/saved?sort=price&near=cit-u');
  assert.equal(new URL(response.headers.get('location')).searchParams.get('next'), '/renter/saved?sort=price&near=cit-u');
});

test('allows only the role stored in profiles, not caller-controlled user metadata', async () => {
  reset({ user, profile: roleProfile('renter') });
  const renter = await visit('/renter/dashboard');
  assert.equal(renter.status, 200);
  assert.deepEqual(state.profileLookup, ['id', 'synthetic-user']);
  assert.equal(state.profileColumns, 'role, is_suspended');

  reset({ user, profile: roleProfile('renter') });
  const landlord = await visit('/landlord/listings/new');
  assert.equal(landlord.status, 403);
  assert.match(await landlord.text(), /Access Denied/);

  reset({ user, profile: roleProfile('admin') });
  assert.equal((await visit('/admin/users')).status, 200);
  assert.equal((await visit('/renter/dashboard')).status, 403);
  assert.equal(getRequiredRole('/renter/dashboard'), 'renter');
  assert.equal(getRoleHome('landlord'), '/landlord/dashboard');
  assert.equal(isRoleAllowed('landlord', '/landlord/listings/new'), true);
  assert.equal(isRoleAllowed('admin', '/landlord/listings/new'), false);
});

test('isSafeRedirectUrl rejects encoded control and protocol-relative redirects', () => {
  for (const value of ['/%09//evil.test', '/%2f%2fevil.test', '/%252f%252fevil.test']) {
    assert.equal(isSafeRedirectUrl(value), false, value);
  }
  assert.equal(isSafeRedirectUrl('/renter/saved?sort=price'), true);
});

test('sends authenticated users away from guest-only pages to the profile role home', async () => {
  reset({ user, profile: roleProfile('landlord') });
  const response = await visit('/login');
  assert.equal(response.status, 302);
  assert.equal(new URL(response.headers.get('location')).pathname, '/landlord/dashboard');
});

test('redirects authenticated users away from role-incompatible or unsafe guest-route destinations', async () => {
  for (const next of ['/admin/users', '/landlord/listings/new', '/%09//evil.example', '/login']) {
    reset({ user, profile: roleProfile('renter') });
    const response = await visit(`/login?next=${encodeURIComponent(next)}`);
    assert.equal(response.status, 302, next);
    assert.equal(new URL(response.headers.get('location')).pathname, '/renter/dashboard', next);
  }

  reset({ user, profile: roleProfile('renter') });
  const response = await visit('/login?next=%2Frenter%2Fsaved%3Fsort%3Dprice');
  assert.equal(new URL(response.headers.get('location')).pathname, '/renter/saved');
  assert.equal(new URL(response.headers.get('location')).search, '?sort=price');
});

test('rejects expired or tampered sessions before profile lookup', async () => {
  reset();
  const response = await visit('/admin/users');
  assert.equal(response.status, 302);
  assert.deepEqual(state.profileTables, []);
  assert.equal(new URL(response.headers.get('location')).searchParams.get('next'), '/admin/users');
});


test('fails closed on missing profile or unknown role', async () => {
  reset({ user, profile: { data: null, error: { message: 'not found' } } });
  assert.equal((await visit('/renter/dashboard')).status, 403);
  reset({ user, profile: roleProfile('unexpected') });
  assert.equal((await visit('/renter/dashboard')).status, 403);
});

test('suspended account is locally signed out and its session-cookie chunks are cleared', async () => {
  reset({ user, profile: roleProfile('renter', true) });
  const response = await visit('/renter/dashboard');
  assert.equal(response.status, 302);
  assert.equal(new URL(response.headers.get('location')).searchParams.get('reason'), 'suspended');
  assert.equal(state.signOutCalls, 1);
  assert.equal(response.cookies.get('sb-test-auth-token').maxAge, 0);
  assert.equal(response.cookies.get('sb-test-auth-token.0').maxAge, 0);
});

test('refresh preserves HTTP-only cookie policy and Remember Me lifetime', async () => {
  for (const [marker, maxAge] of [['0', undefined], ['1', 2592000]]) {
    reset({ user, profile: roleProfile('renter') });
    state.refreshedCookie = true;
    const request = new NextRequest('https://app.test/renter/dashboard');
    request.cookies.set('abangcebu-remember', marker);
    const response = await middleware(request);
    assert.equal(response.status, 200);
    const refreshed = response.cookies.get('sb-test-auth-token.0');
    assert.equal(refreshed.httpOnly, true);
    assert.equal(refreshed.secure, true);
    assert.equal(refreshed.maxAge, maxAge);
  }
});

test('bypasses health and auth callback session evaluation and skips static assets', async () => {
  reset();
  assert.equal((await visit('/api/health')).status, 200);
  assert.equal((await visit('/auth/callback?code=synthetic')).status, 200);
  assert.deepEqual(state.profileTables, []);
  assert.equal(config.matcher.length, 1);
  assert.match(config.matcher[0], /_next\/static/);
  assert.match(config.matcher[0], /_next\/image/);
});
