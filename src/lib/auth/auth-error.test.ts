import { describe, expect, it } from 'vitest';
import { AuthErrorCode } from '@/types/auth';
import { mapSupabaseAuthError } from './auth-error';

describe('mapSupabaseAuthError', () => {
  it('maps known code invalid_credentials accurately', () => {
    const res = mapSupabaseAuthError({ code: 'invalid_credentials', message: 'upstream raw error' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
    expect(res.body.error.message).toBe('Invalid email or password.');
    expect(res.body.error.message).not.toContain('upstream raw error');
  });

  it('maps by fallback string matching when code is missing', () => {
    const res = mapSupabaseAuthError({ message: 'User already exists' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(AuthErrorCode.EMAIL_ALREADY_REGISTERED);
    expect(res.body.error.message).toBe('An account with this email already exists.');
  });

  it('sanitizes unknown internal errors completely with safe defaults', () => {
    const res = mapSupabaseAuthError({ message: 'Database query failed at line 42 with secret key' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(AuthErrorCode.INTERNAL_AUTH_ERROR);
    expect(res.body.error.message).toBe('An authentication error occurred. Please try again.');
    expect(JSON.stringify(res.body)).not.toContain('Database query failed');
    expect(JSON.stringify(res.body)).not.toContain('secret key');
  });

  it('respects caller fallback overrides', () => {
    const res = mapSupabaseAuthError(new Error('crash'), {
      fallbackMessage: 'Custom safe message',
      fallbackStatus: 500,
    });
    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('Custom safe message');
  });
});
