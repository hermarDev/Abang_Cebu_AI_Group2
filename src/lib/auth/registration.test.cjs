/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness loads transpiled TypeScript modules. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const originalLoad = Module._load;
const originalResolveFilename = Module._resolveFilename;
let signUpOptions;
let signUpCalls;
let signUpResponse;
let profileResponse;
let exchangeResponse;
let exchangedCode;
const supabaseMock = {
  async createClient() {
    return {
      auth: {
        async signUp(options) { signUpCalls++; signUpOptions = options; return signUpResponse; },
        async exchangeCodeForSession(code) { exchangedCode = code; return exchangeResponse; },
      },
      from() { return { select() { return { eq() { return { async single() { return profileResponse; } }; } }; } }; },
    };
  },
};

Module._load = function (request, parent, isMain) {
  if (request === 'next/headers') return { headers: async () => new Headers({ 'cf-connecting-ip': '203.0.113.1' }) };
  if (request === '@/lib/supabase/server' || request.endsWith('/src/lib/supabase/server.ts')) return supabaseMock;
  return originalLoad.call(this, request, parent, isMain);
};

require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) request = path.resolve(__dirname, '../../', request.slice(2));
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND' || path.extname(request)) throw error;
    return originalResolveFilename.call(this, `${request}.ts`, parent, isMain, options);
  }
};

const { validateRegistrationPayload, getRegistrationRedirect } = require('./registration');
const { registerUserAction } = require('../../server/actions/auth');
const { POST: registerRoute } = require('../../app/api/auth/register/route');
const { GET: handleAuthCallback } = require('../../app/auth/callback/route');
const { verifyRegistrationChallenge, consumeRegistrationRateLimit } = require('./registration-abuse');
const originalFetch = global.fetch;
const validPayload = { email: ' RENTER@example.com ', password: 'Abcdef12!', role: 'renter', fullName: 'Mika Santos', phoneNumber: '0917-123-4567', turnstileToken: 'test-token' };

function resetMocks() {
  signUpOptions = undefined;
  signUpCalls = 0;
  signUpResponse = { data: { user: { id: 'user-1', email: 'renter@example.com', email_confirmed_at: null, created_at: '2026-10-21T00:00:00.000Z' } }, error: null };
  profileResponse = { data: { role: 'renter' }, error: null };
  exchangeResponse = { data: { user: { id: 'user-1' } }, error: null };
  exchangedCode = undefined;
}
resetMocks();

test('normalizes valid registration and rejects admin self-registration', () => {
  const valid = validateRegistrationPayload(validPayload);
  assert.equal(valid.success, true);
  assert.equal(valid.value.email, 'renter@example.com');
  assert.equal(valid.value.phoneNumber, '+639171234567');
  for (const password of [' Abcdef12!', 'Abcdef12! ']) {
    assert.equal(validateRegistrationPayload({ ...validPayload, password }).success, false);
  }
  const admin = validateRegistrationPayload({ ...validPayload, role: 'admin' });
  assert.equal(admin.success, false);
  assert.equal(admin.error.error.code, 'PRIVILEGE_ESCALATION_ATTEMPT');
  assert.equal(admin.error.error.status, 403);
  for (const role of ['ADMIN', 'Admin', 'unknown']) {
    const invalidRole = validateRegistrationPayload({ ...validPayload, role });
    assert.equal(invalidRole.success, false);
    assert.ok(['INVALID_ROLE', 'VALIDATION_ERROR', 'PRIVILEGE_ESCALATION_ATTEMPT'].includes(invalidRole.error.error.code));
  }
});

test('rejects malformed and missing payload fields without reflecting credentials', () => {
  const invalid = validateRegistrationPayload({ ...validPayload, email: 'bad', password: 'weak', phoneNumber: '123', preferredLandmark: 'x'.repeat(101) });
  assert.equal(invalid.success, false);
  assert.equal(invalid.error.error.status, 422);
  assert.ok(invalid.error.error.details.some(({ code }) => code === 'INVALID_EMAIL_FORMAT'));
  assert.ok(invalid.error.error.details.some(({ code }) => code === 'WEAK_PASSWORD'));
  assert.ok(invalid.error.error.details.some(({ code }) => code === 'INVALID_PHONE_NUMBER'));
  assert.ok(!JSON.stringify(invalid).includes('weak'));
  for (const payload of [null, [], 'bad', { email: 'renter@example.com' }]) {
    assert.equal(validateRegistrationPayload(payload).success, false);
  }
});

test('server action sends normalized metadata and PKCE callback, never session tokens', async () => {
  resetMocks();
  const previous = { secret: process.env.TURNSTILE_SECRET_KEY, url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN, siteUrl: process.env.NEXT_PUBLIC_SITE_URL };
  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://app.test';
  global.fetch = async (url) => url.includes('siteverify')
    ? ({ ok: true, json: async () => ({ success: true }) })
    : ({ ok: true, json: async () => [{ result: 1 }, { result: 1 }] });
  const result = await registerUserAction(validPayload);
  assert.equal(result.success, true);
  assert.equal(signUpOptions.email, 'renter@example.com');
  assert.deepEqual(signUpOptions.options.data, { role: 'renter', full_name: 'Mika Santos', phone_number: '+639171234567', preferred_landmark: null });
  assert.equal(new URL(signUpOptions.options.emailRedirectTo).pathname, '/auth/callback');
  assert.equal(result.data.requiresEmailVerification, true);
  assert.equal('user' in result.data, false);
  assert.equal('access_token' in result.data, false);
  assert.equal('refresh_token' in result.data, false);
  if (previous.secret === undefined) delete process.env.TURNSTILE_SECRET_KEY; else process.env.TURNSTILE_SECRET_KEY = previous.secret;
  if (previous.url === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = previous.url;
  if (previous.token === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = previous.token;
  if (previous.siteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = previous.siteUrl;
  global.fetch = originalFetch;
});

test('server action rejects escalation before Supabase and masks upstream failures', async () => {
  resetMocks();
  const adminActionResult = await registerUserAction({ ...validPayload, role: 'admin' });
  assert.equal(adminActionResult.success, false);
  assert.equal(adminActionResult.error.status, 403);
  const missingActionResult = await registerUserAction(null);
  assert.equal(missingActionResult.success, false);
  assert.equal(missingActionResult.error.status, 422);
  assert.equal(signUpCalls, 0);
  signUpResponse = { data: { user: null }, error: { message: 'upstream-private-detail', status: 500 } };
  const failed = await registerUserAction(validPayload);
  assert.equal(failed.success, false);
  assert.ok(!JSON.stringify(failed).includes('upstream-private-detail'));
});

test('Turnstile verification fails closed on missing configuration, invalid token, and provider error', async () => {
  const savedSecret = process.env.TURNSTILE_SECRET_KEY;
  delete process.env.TURNSTILE_SECRET_KEY;
  assert.equal(await verifyRegistrationChallenge('token', '203.0.113.1'), false);
  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    assert.equal(options.method, 'POST');
    return { ok: true, json: async () => ({ success: false }) };
  };
  assert.equal(await verifyRegistrationChallenge('invalid', '203.0.113.1'), false);
  global.fetch = async () => { throw new Error('network'); };
  assert.equal(await verifyRegistrationChallenge('token', null), false);
  if (savedSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = savedSecret;
  global.fetch = originalFetch;
});

test('registration rate limit uses atomic shared Redis pipeline and fails closed in production', async () => {
  const oldEnv = { nodeEnv: process.env.NODE_ENV, url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN };
  process.env.NODE_ENV = 'production';
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  assert.equal(await consumeRegistrationRateLimit('203.0.113.1'), false);
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  let requestBody;
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://redis.example.test/pipeline');
    requestBody = JSON.parse(options.body);
    return { ok: true, json: async () => [{ result: 1 }, { result: 1 }] };
  };
  assert.equal(await consumeRegistrationRateLimit('203.0.113.1'), true);
  assert.deepEqual(requestBody[0], ['INCR', 'auth:register:203.0.113.1']);
  global.fetch = async () => ({ ok: true, json: async () => [{ result: 6 }, { result: 1 }] });
  assert.equal(await consumeRegistrationRateLimit('203.0.113.1'), false);
  global.fetch = async () => { throw new Error('network'); };
  assert.equal(await consumeRegistrationRateLimit('203.0.113.1'), false);
  if (oldEnv.nodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnv.nodeEnv;
  if (oldEnv.url === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = oldEnv.url;
  if (oldEnv.token === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = oldEnv.token;
  global.fetch = originalFetch;
});

test('registration API requires challenge and returns identical success bodies for duplicate and new email', async () => {
  resetMocks();
  const savedSecret = process.env.TURNSTILE_SECRET_KEY;
  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  global.fetch = async () => ({ ok: true, json: async () => [{ result: 1 }, { result: 1 }] });
  const missingChallenge = await registerRoute(new Request('https://app.test/api/auth/register', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.2' }, body: JSON.stringify({ ...validPayload, turnstileToken: undefined }) }));
  assert.equal(missingChallenge.status, 400);
  assert.equal((await missingChallenge.json()).error.code, 'CAPTCHA_VERIFICATION_FAILED');
  assert.equal(signUpCalls, 0);
  global.fetch = async (url) => url.includes('siteverify') ? ({ ok: true, json: async () => ({ success: true }) }) : ({ ok: true, json: async () => [{ result: 1 }, { result: 1 }] });
  signUpResponse = { data: { user: null }, error: { code: 'user_already_exists' } };
  const duplicate = await registerRoute(new Request('https://app.test/api/auth/register', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.2' }, body: JSON.stringify(validPayload) }));
  const duplicateBody = await duplicate.json();
  assert.equal(duplicate.status, 201);
  assert.equal(duplicateBody.success, true);
  assert.ok(!JSON.stringify(duplicateBody).includes('renter@example.com'));
  signUpResponse = { data: { user: { id: 'synthetic-user', email: 'renter@example.com', email_confirmed_at: null, created_at: '2026-10-21T00:00:00.000Z' } }, error: null };
  const newAddress = await registerRoute(new Request('https://app.test/api/auth/register', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.3' }, body: JSON.stringify({ ...validPayload, email: 'another@example.com' }) }));
  const newAddressBody = await newAddress.json();
  assert.equal(newAddress.status, duplicate.status);
  assert.equal(newAddressBody.success, duplicateBody.success);
  assert.equal(newAddressBody.message, duplicateBody.message);
  assert.equal(newAddressBody.data.requiresEmailVerification, duplicateBody.data.requiresEmailVerification);
  assert.ok(newAddressBody.data.redirectUrl.startsWith('/auth/verify-request?email='));
  assert.equal('user' in newAddressBody.data, false);
  assert.ok(!JSON.stringify(newAddressBody).includes('another@example.com'));
  assert.equal(signUpCalls, 2);
  if (savedSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY; else process.env.TURNSTILE_SECRET_KEY = savedSecret;
  global.fetch = originalFetch;
});

test('registration actions require Turnstile and unavailable distributed limit in production', async () => {
  const savedNodeEnv = process.env.NODE_ENV;
  const savedSecret = process.env.TURNSTILE_SECRET_KEY;
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.NODE_ENV = 'production';
  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  global.fetch = async () => ({ ok: true, json: async () => ({ success: true }) });
  const result = await registerUserAction(validPayload);
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'RATE_LIMIT_EXCEEDED');
  if (savedNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = savedNodeEnv;
  if (savedSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY; else process.env.TURNSTILE_SECRET_KEY = savedSecret;
  if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
  if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
  global.fetch = originalFetch;
});


test('callback uses DB role, exchanges PKCE code, and blocks open redirects', async () => {
  resetMocks();
  profileResponse = { data: { role: 'landlord' }, error: null };
  const response = await handleAuthCallback(new Request('https://app.test/auth/callback?code=opaque-code&next=https%3A%2F%2Fevil.test'));
  assert.equal(exchangedCode, 'opaque-code');
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get('location')).origin, 'https://app.test');
  assert.equal(new URL(response.headers.get('location')).pathname, '/landlord/onboarding');
  assert.equal(getRegistrationRedirect('renter', '/renter/favorites'), '/renter/favorites');
  assert.equal(getRegistrationRedirect('renter', '//evil.test'), '/search');
  assert.equal(getRegistrationRedirect('renter', '/%2f%2fevil.test'), '/search');
});

test('callback sends safe failure redirect for missing, expired, or replayed code', async () => {
  resetMocks();
  let response = await handleAuthCallback(new Request('https://app.test/auth/callback'));
  assert.equal(new URL(response.headers.get('location')).pathname, '/auth/auth-error');
  exchangeResponse = { data: { user: null }, error: { message: 'expired or replayed code secret-token' } };
  response = await handleAuthCallback(new Request('https://app.test/auth/callback?code=replayed'));
  assert.equal(new URL(response.headers.get('location')).pathname, '/auth/auth-error');
  assert.equal(new URL(response.headers.get('location')).searchParams.get('code'), 'CONFIRMATION_CODE_INVALID');
  assert.ok(!response.headers.get('location').includes('replayed'));
  assert.ok(!response.headers.get('location').includes('secret-token'));
});
