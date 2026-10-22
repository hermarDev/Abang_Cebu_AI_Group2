import { headers } from 'next/headers';
import { AuthErrorCode } from '@/types/auth';
import type { RegisterPayload } from '@/types/auth';
import { validateRegistrationPayload } from '@/lib/auth/registration';
import { consumeRegistrationRateLimit, registrationAbuseError, verifyRegistrationChallenge } from '@/lib/auth/registration-abuse';
import { createClient } from '@/lib/supabase/server';

function accepted(email: string) {
  return {
    success: true as const,
    data: { requiresEmailVerification: true as const, redirectUrl: `/auth/verify-request?email=${encodeURIComponent(email)}` },
    message: 'If this email address is eligible, an activation email will be sent.',
  };
}

async function submitRegistration(value: import('@/lib/auth/registration').ValidatedRegistration) {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
    const site = new URL(siteUrl);
    if (process.env.NODE_ENV === 'production' && site.protocol !== 'https:') throw new Error('HTTPS site origin required');
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: value.email,
      password: value.password,
      options: {
        emailRedirectTo: new URL('/auth/callback?next=/search', site).toString(),
        data: { role: value.role, full_name: value.fullName, phone_number: value.phoneNumber ?? null, preferred_landmark: value.preferredLandmark ?? null },
      },
    });
    if (error?.code === 'user_already_exists' || (!error && !data.user)) return accepted(value.email);
    if (error || !data.user) {
      return { success: false as const, error: { code: AuthErrorCode.INTERNAL_AUTH_ERROR, message: 'An unexpected authentication error occurred. Please try again.', status: 500 } };
    }
    return accepted(value.email);
  } catch {
    return { success: false as const, error: { code: AuthErrorCode.INTERNAL_AUTH_ERROR, message: 'An unexpected authentication error occurred. Please try again.', status: 500 } };
  }
}

async function registrationAccepted(value: import('@/lib/auth/registration').ValidatedRegistration, ip: string | null) {
  if (!await verifyRegistrationChallenge(value.turnstileToken, ip)) return registrationAbuseError('captcha');
  if (!await consumeRegistrationRateLimit(ip)) return registrationAbuseError('rate-limit');
  return submitRegistration(value);
}

export async function registerUserAction(payload: RegisterPayload | unknown) {
  const validation = validateRegistrationPayload(payload, { requireChallenge: true });
  if (!validation.success) return validation.error;
  const requestHeaders = await headers();
  return registrationAccepted(validation.value, requestHeaders.get('cf-connecting-ip')?.trim() || null);
}

export async function handleRegisterApi(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ success: false, error: { code: AuthErrorCode.VALIDATION_ERROR, message: 'The submitted registration data is invalid.', status: 422 } }, { status: 422 }); }
  const validation = validateRegistrationPayload(payload, { requireChallenge: true });
  if (!validation.success) return Response.json(validation.error, { status: validation.error.error.status ?? 422 });
  const result = await registrationAccepted(validation.value, request.headers.get('cf-connecting-ip')?.trim() || null);
  return Response.json(result, { status: result.success ? 201 : result.error.status ?? 500 });
}
