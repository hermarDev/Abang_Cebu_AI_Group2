import { AuthErrorCode, createAuthError, isSafeRedirectUrl } from '@/types/auth';
import type { UserRole } from '@/types/database';

export const REMEMBER_COOKIE = 'abangcebu-remember';
export const REMEMBER_SECONDS = 30 * 24 * 60 * 60;

export function validateLoginInput(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const payload = input as Record<string, unknown>;
  if (typeof payload.email !== 'string' || typeof payload.password !== 'string' ||
    (payload.rememberMe !== undefined && typeof payload.rememberMe !== 'boolean')) return null;
  const email = payload.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    payload.password.length < 8 || payload.password.length > 72) return null;
  return { email, password: payload.password, rememberMe: payload.rememberMe === true };
}

export function loginDestination(role: UserRole, next: unknown) {
  const fallback = role === 'renter' ? '/search' : role === 'admin' ? '/admin' : '/landlord/dashboard';
  if (typeof next !== 'string' || !isSafeRedirectUrl(next)) return fallback;
  const pathname = new URL(next, 'https://app.invalid').pathname;
  if (/^\/(?:login|register|auth\/callback)(?:\/|$)/.test(pathname)) return fallback;
  const required = /^\/renter(?:\/|$)/.test(pathname) ? 'renter'
    : /^\/landlord(?:\/|$)/.test(pathname) ? 'landlord'
      : /^\/admin(?:\/|$)/.test(pathname) ? 'admin' : undefined;
  if (required && required !== role) return fallback;
  return next;
}

export const invalidCredentials = () => createAuthError(
  AuthErrorCode.INVALID_CREDENTIALS, 'Invalid email or password.', { status: 401 },
);
