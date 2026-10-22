import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { getRegistrationRedirect } from '@/lib/auth/registration';
import { createSafeSupabaseAuthError } from '@/lib/auth/supabase-error';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/auth/auth-error?code=CONFIRMATION_CODE_INVALID', requestUrl.origin));
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      const safeError = error ? createSafeSupabaseAuthError(error) : undefined;
      return NextResponse.redirect(new URL(`/auth/auth-error?code=${safeError?.error.code ?? 'CONFIRMATION_CODE_INVALID'}`, requestUrl.origin));
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    if (profileError || !profile) {
      return NextResponse.redirect(new URL('/auth/auth-error?code=CONFIRMATION_CODE_INVALID', requestUrl.origin));
    }

    return NextResponse.redirect(new URL(
      getRegistrationRedirect(profile.role, requestUrl.searchParams.get('next')),
      requestUrl.origin,
    ));
  } catch {
    return NextResponse.redirect(new URL('/auth/auth-error?code=CONFIRMATION_CODE_INVALID', requestUrl.origin));
  }
}
