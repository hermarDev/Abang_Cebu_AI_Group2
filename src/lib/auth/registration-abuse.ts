import { AuthErrorCode, type AuthErrorResponse } from '@/types/auth';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const WINDOW_MS = 60 * 60 * 1000;
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
  const key = `auth:register:${remoteIp.replace(/[^\da-fA-F:.]/g, '').slice(0, 64)}`;
  const redisUrl = url.replace(/\/+$/, '');
  try {
    const response = await fetch(`${redisUrl}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', key], ['PEXPIRE', key, WINDOW_MS, 'NX']]),
      cache: 'no-store',
    });
    if (!response.ok) return process.env.NODE_ENV !== 'production';
    const result = await response.json() as Array<{ result?: number } | { error?: string }>;
    const count = result[0] && 'result' in result[0] ? result[0].result : undefined;
    return typeof count === 'number' && count <= MAX_REGISTRATIONS_PER_IP;
  } catch {
    return process.env.NODE_ENV !== 'production';
  }
}

export function registrationAbuseError(kind: 'captcha' | 'rate-limit'): AuthErrorResponse {
  return {
    success: false,
    error: kind === 'captcha'
      ? { code: AuthErrorCode.CAPTCHA_VERIFICATION_FAILED, message: 'Verification failed. Please try again.', status: 400 }
      : { code: AuthErrorCode.RATE_LIMIT_EXCEEDED, message: 'Too many registration attempts. Please try again later.', status: 429 },
  };
}
