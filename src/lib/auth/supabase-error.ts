import { AuthErrorCode, createAuthError } from '@/types/auth';
import type { AuthErrorResponse } from '@/types/auth';

const SAFE_AUTH_ERRORS = [
  { matches: ['email_not_confirmed', 'email not confirmed'], code: AuthErrorCode.EMAIL_NOT_CONFIRMED, message: 'Verify your email before signing in.', status: 403 },
  { matches: ['invalid login credentials', 'invalid_credentials'], code: AuthErrorCode.INVALID_CREDENTIALS, message: 'Invalid email or password.', status: 401 },
  { matches: ['over_email_send_rate_limit', 'email rate limit exceeded'], code: AuthErrorCode.RATE_LIMIT_EXCEEDED, message: 'Too many attempts. Please try again later.', status: 429 },
  { matches: ['password should be', 'weak_password'], code: AuthErrorCode.WEAK_PASSWORD, message: 'Choose a stronger password.', status: 422 },
  { matches: ['same_password', 'different from the old password'], code: AuthErrorCode.PASSWORD_REUSE_FORBIDDEN, message: 'Choose a password you have not used before.', status: 422 },
  { matches: ['expired', 'invalid token', 'invalid grant', 'flow state'], code: AuthErrorCode.CONFIRMATION_CODE_INVALID, message: 'This link is invalid or expired. Request a new one.', status: 400 },
] as const;

export function createSafeSupabaseAuthError(error: unknown): AuthErrorResponse {
  const text = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message.toLowerCase()
    : '';
  const mapping = SAFE_AUTH_ERRORS.find(({ matches }) => matches.some((fragment) => text.includes(fragment)));
  return mapping
    ? createAuthError(mapping.code, mapping.message, { status: mapping.status })
    : createAuthError(AuthErrorCode.INTERNAL_AUTH_ERROR, 'An unexpected authentication error occurred. Please try again.', { status: 500 });
}
