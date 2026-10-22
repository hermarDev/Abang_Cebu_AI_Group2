import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { LogoutScope } from '@/types/auth';
import { getLogoutErrorResponse, getSafeLogoutRedirect, getSupabaseAuthCookieNames, isLogoutScope } from '@/lib/auth/logout';

type CookieMutation = { name: string; value: string; options?: Record<string, unknown> };

function withClearedCookies(
  request: NextRequest,
  status: number,
  body: Record<string, unknown> | import('@/types/auth').AuthErrorResponse,
  mutations: CookieMutation[],
  cookieNames: string[],
  revocationConfirmed = false,
) {
  const response = NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  for (const { name, value, options } of mutations) {
    response.cookies.set(name, value, {
      ...options,
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
    });
  }
  for (const name of cookieNames) {
    response.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
    });
  }
  response.headers.set('x-session-cookies-cleared', 'true');
  if (revocationConfirmed) response.headers.set('x-session-revocation-confirmed', 'true');
  return response;
}

export async function POST(request: NextRequest) {
  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    // Empty bodies are treated as the default local sign-out request.
  }

  const candidate = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const scope: LogoutScope = isLogoutScope(candidate.scope) ? candidate.scope : 'local';
  const redirectUrl = getSafeLogoutRedirect(candidate.redirectUrl);
  const requestCookies = request.cookies.getAll();
  const cookieNames = getSupabaseAuthCookieNames(requestCookies);
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const mutations: CookieMutation[] = [];

  if (!projectUrl || !anonKey) {
    return withClearedCookies(request, 503, getLogoutErrorResponse(), mutations, cookieNames);
  }

  const supabase = createServerClient(projectUrl, anonKey, {
    cookies: {
      getAll: () => requestCookies,
      setAll(cookiesToSet) {
        mutations.push(...cookiesToSet);
      },
    },
  });

  let revokeError = false;
  try {
    const { error } = await supabase.auth.signOut({ scope });
    revokeError = Boolean(error);
  } catch {
    revokeError = true;
  }

  if (revokeError) {
    return withClearedCookies(request, 502, getLogoutErrorResponse(), mutations, cookieNames);
  }

  return withClearedCookies(request, 200, {
    success: true,
    data: { scope, redirectUrl },
  }, mutations, cookieNames, true);
}
