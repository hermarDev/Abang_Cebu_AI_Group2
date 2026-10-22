import { createHash } from 'node:crypto';
import { AuthErrorCode, type AuthErrorResponse } from '@/types/auth';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

export async function verifyLoginChallenge(token: unknown, remoteIp: string | null): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production') return true;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (typeof token !== 'string' || !token || !secret) return false;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, ...(remoteIp ? { remoteip: remoteIp } : {}) }),
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const result = await response.json() as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}

async function incrementCounter(key: string, windowMs: number, limit: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  const redisUrl = url.replace(/\/+$/, '');
  const script = "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end; if n > tonumber(ARGV[2]) then return 0; end; return 1";
  try {
    const response = await fetch(redisUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', script, 1, key, windowMs, limit]),
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const result = await response.json() as { result?: number };
    return result.result === 1;
  } catch {
    return false;
  }
}

function loginCounterKey(email: string, remoteIp: string) {
  const ip = remoteIp.replace(/[^\da-fA-F:.]/g, '').slice(0, 64);
  const subject = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  return `auth:login:${ip}:${subject}`;
}

function registrationCounterKey(remoteIp: string) {
  const ip = remoteIp.replace(/[^\da-fA-F:.]/g, '').slice(0, 64);
  return `auth:register:${ip}`;
}

export async function checkLoginFailureLimit(email: string, remoteIp: string | null): Promise<boolean> {
  if (!remoteIp) return false;
  if (process.env.NODE_ENV !== 'production') return true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  try {
    const response = await fetch(`${url}/get/${encodeURIComponent(loginCounterKey(email, remoteIp))}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const result = await response.json() as { result?: number | string | null };
    return Number(result.result ?? 0) < MAX_LOGIN_ATTEMPTS;
  } catch {
    return false;
  }
}

export async function consumeLoginAttempt(email: string, remoteIp: string | null): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production') return true;
  return remoteIp ? incrementCounter(loginCounterKey(email, remoteIp), LOGIN_WINDOW_MS, MAX_LOGIN_ATTEMPTS) : false;
}

export async function resetLoginFailureLimit(email: string, remoteIp: string | null): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!remoteIp || !url || !token) return;
  const key = loginCounterKey(email, remoteIp);
  try {
    const redisUrl = url.replace(/\/+$/, '');
    const response = await fetch(`${redisUrl}/del/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (response.ok) return;
  } catch { /* Keep successful authentication independent of counter cleanup. */ }
}

const REGISTRATION_WINDOW_MS = 60 * 60 * 1000;
const MAX_REGISTRATIONS_PER_IP = 5;

export async function verifyRegistrationChallenge(token: unknown, remoteIp: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (typeof token !== 'string' || !token || !secret) return false;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, ...(remoteIp ? { remoteip: remoteIp } : {}) }),
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const result = await response.json() as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}

export async function consumeRegistrationRateLimit(remoteIp: string | null): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!remoteIp || !url || !token) return process.env.NODE_ENV !== 'production';
  const allowed = await incrementCounter(registrationCounterKey(remoteIp), REGISTRATION_WINDOW_MS, MAX_REGISTRATIONS_PER_IP);
  return allowed || process.env.NODE_ENV !== 'production';
}

export function registrationAbuseError(kind: 'captcha' | 'rate-limit'): AuthErrorResponse {
  return {
    success: false,
    error: kind === 'captcha'
      ? { code: AuthErrorCode.CAPTCHA_VERIFICATION_FAILED, message: 'Verification failed. Please try again.', status: 400 }
      : { code: AuthErrorCode.RATE_LIMIT_EXCEEDED, message: 'Too many registration attempts. Please try again later.', status: 429 },
  };
}

export function loginAbuseError(kind: 'captcha' | 'rate-limit'): AuthErrorResponse {
  return {
    success: false,
    error: kind === 'captcha'
      ? { code: AuthErrorCode.CAPTCHA_VERIFICATION_FAILED, message: 'Security verification failed. Please try again.', status: 403 }
      : { code: AuthErrorCode.RATE_LIMIT_EXCEEDED, message: 'Too many login attempts. Please wait 15 minutes before trying again.', status: 429 },
  };
}
