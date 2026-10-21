import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { AuthErrorCode, createAuthError } from '@/types/auth';
import { invalidCredentials, loginDestination, REMEMBER_COOKIE, REMEMBER_SECONDS, validateLoginInput } from '@/lib/auth/login';
import type { UserRole } from '@/types/database';

export async function POST(request: NextRequest) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json(createAuthError(AuthErrorCode.VALIDATION_ERROR, 'Invalid login data.', { status: 422 }), { status: 422 });
  }
  const payload = validateLoginInput(input);
  if (!payload) return NextResponse.json(createAuthError(AuthErrorCode.VALIDATION_ERROR, 'Invalid login data.', { status: 422 }), { status: 422 });

  const sessionCookies = new Map<string, { name: string; value: string; options: Record<string, unknown> }>();
  const authHeaders: Record<string, string> = {};
  const cookieOptions = {
    httpOnly: true,
    secure: request.nextUrl.protocol === 'https:',
    sameSite: 'lax' as const,
    path: '/',
  };
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const cookie of cookiesToSet) {
            sessionCookies.set(cookie.name, {
              ...cookie,
              options: {
                ...cookie.options,
                ...cookieOptions,
                ...(cookie.value ? payload.rememberMe
                  ? { maxAge: REMEMBER_SECONDS }
                  : { maxAge: undefined, expires: undefined }
                  : {}),
              },
            });
          }
          Object.assign(authHeaders, headers);
        },
      },
    },
  );

  const respond = (body: unknown, status = 200) => {
    const response = NextResponse.json(body, { status, headers: { ...authHeaders, 'Cache-Control': 'private, no-store' } });
    for (const cookie of sessionCookies.values()) response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  };
  const fail = async (body: ReturnType<typeof createAuthError>, status = body.error.status ?? 500, revoke = false) => {
    if (revoke || sessionCookies.size) {
      try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* Session cookies are cleared below. */ }
      const snapshot = [...sessionCookies];
      sessionCookies.clear();
      for (const [name, cookie] of snapshot) {
        if (/^sb-.+-auth-token(?:\.\d+)?$/.test(name)) {
          sessionCookies.set(name, { ...cookie, value: '', options: { ...cookie.options, maxAge: 0, expires: new Date(0) } });
        }
      }
    }
    if (sessionCookies.has(REMEMBER_COOKIE)) {
      sessionCookies.set(REMEMBER_COOKIE, {
        name: REMEMBER_COOKIE,
        value: payload.rememberMe ? '1' : '0',
        options: { ...cookieOptions, ...(payload.rememberMe ? { maxAge: REMEMBER_SECONDS } : {}) },
      });
    }
    return respond(body, status);
  };

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: payload.email, password: payload.password });
    if (error || !data.user) {
      return fail(invalidCredentials(), 401);
    }
    if (!data.user.email_confirmed_at) {
      return await fail(createAuthError(AuthErrorCode.EMAIL_NOT_CONFIRMED, 'Verify your email before signing in.', { status: 403 }), 403, true);
    }
    const { data: profile, error: profileError } = await supabase.from('profiles')
      .select('role, is_suspended').eq('id', data.user.id).single();
    if (profileError || !profile || !(['renter', 'landlord', 'admin'] as unknown[]).includes(profile.role)) {
      return await fail(createAuthError(AuthErrorCode.INTERNAL_AUTH_ERROR, 'Unable to sign in. Please try again.', { status: 500 }), 500, true);
    }
    if (profile.is_suspended) {
      return await fail(createAuthError(AuthErrorCode.ACCOUNT_SUSPENDED, 'This account is suspended.', { status: 403 }), 403, true);
    }

    sessionCookies.set(REMEMBER_COOKIE, {
      name: REMEMBER_COOKIE,
      value: payload.rememberMe ? '1' : '0',
      options: { ...cookieOptions, ...(payload.rememberMe ? { maxAge: REMEMBER_SECONDS } : {}) },
    });
    return respond({ success: true, data: {
      redirectUrl: loginDestination(profile.role as UserRole, (input as Record<string, unknown>).next),
    }, message: 'Signed in.' });
  } catch {
    return await fail(createAuthError(AuthErrorCode.INTERNAL_AUTH_ERROR, 'Unable to sign in. Please try again.', { status: 500 }), 500, true);
  }
}
