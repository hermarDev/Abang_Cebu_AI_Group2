import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const originalLoad = Module._load;
const originalResolve = Module._resolveFilename;
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

const abuse = require('./registration-abuse.ts');
const saved = { nodeEnv: process.env.NODE_ENV, redisUrl: process.env.UPSTASH_REDIS_REST_URL, redisToken: process.env.UPSTASH_REDIS_REST_TOKEN, fetch: globalThis.fetch };

test.after(() => {
  process.env.NODE_ENV = saved.nodeEnv;
  if (saved.redisUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = saved.redisUrl;
  if (saved.redisToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = saved.redisToken;
  globalThis.fetch = saved.fetch;
  Module._load = originalLoad;
  Module._resolveFilename = originalResolve;
});

test('login challenge fails closed in production when token or secret is missing', async () => {
  process.env.NODE_ENV = 'production';
  delete process.env.TURNSTILE_SECRET_KEY;
  assert.equal(await abuse.verifyLoginChallenge('', null), false);
  assert.equal(await abuse.verifyLoginChallenge('synthetic-token', null), false);
});

test('login challenge sends secret, token, and client address to Turnstile and fails closed on provider rejection', async () => {
  process.env.NODE_ENV = 'production';
  process.env.TURNSTILE_SECRET_KEY = 'synthetic-secret';
  let received;
  globalThis.fetch = async (url, options) => {
    received = { url, options };
    return { ok: true, json: async () => ({ success: false }) };
  };
  assert.equal(await abuse.verifyLoginChallenge('synthetic-token', '203.0.113.9'), false);
  assert.equal(received.url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.deepEqual([...new URLSearchParams(received.options.body)], [
    ['secret', 'synthetic-secret'], ['response', 'synthetic-token'], ['remoteip', '203.0.113.9'],
  ]);
  assert.equal(received.options.cache, 'no-store');
});

test('login challenge accepts successful Turnstile verification', async () => {
  process.env.NODE_ENV = 'production';
  process.env.TURNSTILE_SECRET_KEY = 'synthetic-secret';
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ success: true }) });
  assert.equal(await abuse.verifyLoginChallenge('synthetic-token', null), true);
});

test('login failure limit reads the existing Redis counter without incrementing it', async () => {
  process.env.NODE_ENV = 'production';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'synthetic-token';
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ result: '4' }) };
  };
  assert.equal(await abuse.checkLoginFailureLimit('User@Test.com', '203.0.113.9'), true);
  assert.equal(request.url, `https://redis.test/get/${encodeURIComponent('auth:login:203.0.113.9:f02f61d33aac1c8d56813d668299b33d05aa99adf2056c1950f688459da1a465')}`);
  assert.equal(request.options.headers.Authorization, 'Bearer synthetic-token');
  assert.equal(request.options.cache, 'no-store');
});

test('login failure counter increments once per failure and resets on success', async () => {
  process.env.NODE_ENV = 'production';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'synthetic-redis-token';
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({ result: 1 }) };
  };
  assert.equal(await abuse.consumeLoginAttempt('User@Test.com', '203.0.113.9'), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://redis.test');
  const requestBody = JSON.parse(calls[0].options.body);
  assert.equal(requestBody[0], 'EVAL');
  assert.equal(requestBody[2], 1);
  assert.equal(requestBody[3], 'auth:login:203.0.113.9:f02f61d33aac1c8d56813d668299b33d05aa99adf2056c1950f688459da1a465');
  assert.equal(requestBody[4], 900000);
  assert.equal(requestBody[5], 5);
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer synthetic-redis-token');
  await abuse.resetLoginFailureLimit('User@Test.com', '203.0.113.9');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, `https://redis.test/del/${encodeURIComponent('auth:login:203.0.113.9:f02f61d33aac1c8d56813d668299b33d05aa99adf2056c1950f688459da1a465')}`);
});


test('login failure counter fails closed on missing IP, Redis settings, or HTTP failure', async () => {
  process.env.NODE_ENV = 'production';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'synthetic-token';
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ result: '4' }) });
  assert.equal(await abuse.checkLoginFailureLimit('user@test.com', '203.0.113.9'), true);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ result: '5' }) });
  assert.equal(await abuse.checkLoginFailureLimit('user@test.com', '203.0.113.9'), false);
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  assert.equal(await abuse.consumeLoginAttempt('user@test.com', '203.0.113.9'), false);
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'synthetic-token';
  assert.equal(await abuse.consumeLoginAttempt('user@test.com', null), false);
  globalThis.fetch = async () => ({ ok: false, json: async () => [] });
  assert.equal(await abuse.consumeLoginAttempt('user@test.com', '203.0.113.9'), false);
});

test('registration challenge verification rejects missing token or secret in every environment', async () => {
  process.env.NODE_ENV = 'development';
  delete process.env.TURNSTILE_SECRET_KEY;
  assert.equal(await abuse.verifyRegistrationChallenge('synthetic-token', null), false);
  process.env.TURNSTILE_SECRET_KEY = 'synthetic-secret';
  assert.equal(await abuse.verifyRegistrationChallenge('', null), false);
  assert.equal(await abuse.verifyRegistrationChallenge('synthetic-token', null), false);
});

test('registration rate limit retains non-production fallback and Redis key contract', async () => {
  process.env.NODE_ENV = 'development';
  assert.equal(await abuse.consumeRegistrationRateLimit('203.0.113.9'), true);
  process.env.NODE_ENV = 'production';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'synthetic-token';
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ result: 1 }) };
  };
  assert.equal(await abuse.consumeRegistrationRateLimit('203.0.113.9'), true);
  const requestBody = JSON.parse(request.options.body);
  assert.equal(requestBody[0], 'EVAL');
  assert.equal(requestBody[2], 1);
  assert.equal(requestBody[3], 'auth:register:203.0.113.9');
  assert.equal(requestBody[4], 3600000);
  assert.equal(requestBody[5], 5);
});
