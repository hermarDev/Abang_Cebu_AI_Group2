import type { LogoutScope } from '@/types/auth';
import { AuthErrorCode, SESSION_CONSTANTS, createAuthError, isSafeRedirectUrl } from '@/types/auth';

const LOGOUT_SCOPES: readonly LogoutScope[] = ['local', 'global', 'others'];
const SUPABASE_AUTH_COOKIE = /^sb-.+-auth-token(?:\.\d+)?$/;

export function isLogoutScope(value: unknown): value is LogoutScope {
  return typeof value === 'string' && LOGOUT_SCOPES.includes(value as LogoutScope);
}

export function getSafeLogoutRedirect(value: unknown): string {
  if (typeof value !== 'string') return SESSION_CONSTANTS.DEFAULT_LOGOUT_REDIRECT;

  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 32 || code === 127) return SESSION_CONSTANTS.DEFAULT_LOGOUT_REDIRECT;
  }
  if (/%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)) {
    return SESSION_CONSTANTS.DEFAULT_LOGOUT_REDIRECT;
  }

  return isSafeRedirectUrl(value)
    ? value
    : SESSION_CONSTANTS.DEFAULT_LOGOUT_REDIRECT;
}

export function getSupabaseAuthCookieNames(
  cookies: ReadonlyArray<{ name: string }>,
): string[] {
  return cookies
    .filter(({ name }) => SUPABASE_AUTH_COOKIE.test(name))
    .map(({ name }) => name);
}

export function getLogoutErrorResponse() {
  return createAuthError(AuthErrorCode.LOGOUT_FAILED, 'Failed to revoke session on authentication server. Local credentials have been cleared.', {
    status: 502,
    actionHint: 'LOGIN',
  });
}
