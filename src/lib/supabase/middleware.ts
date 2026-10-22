import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getRequiredRole, getRoleHome, isRoleAllowed } from '@/lib/auth/authorization';
import { loginDestination, REMEMBER_COOKIE, REMEMBER_SECONDS } from '@/lib/auth/login';
import type { UserRole } from '@/types/database';

function isRole(value: unknown): value is UserRole {
  return value === 'renter' || value === 'landlord' || value === 'admin';
}

function isProtectedPath(pathname: string): boolean {
  return getRequiredRole(pathname) !== undefined || /^\/account(?:\/|$)/.test(pathname);
}

function isGuestOnlyPath(pathname: string): boolean {
  return pathname === '/login' || pathname === '/register';
}

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie.name, cookie.value, cookie);
  }
}

function deny(response?: NextResponse) {
  const denied = new NextResponse('Access Denied', {
    status: 403,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
  if (response) copyCookies(response, denied);
  return denied;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === '/api/health' || pathname === '/api/auth/callback' || pathname === '/auth/callback') {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          const remembered = request.cookies.get(REMEMBER_COOKIE)?.value === '1';
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: request.nextUrl.protocol === 'https:',
              sameSite: 'lax',
              ...(value ? remembered
                ? { maxAge: REMEMBER_SECONDS }
                : { maxAge: undefined, expires: undefined } : {}),
            });
          }
        },
      },
    },
  );

  let user = null;
  try {
    ({ data: { user } } = await supabase.auth.getUser());
  } catch {
    user = null;
  }

  const requiredRole = getRequiredRole(pathname);
  const protectedPath = isProtectedPath(pathname);
  const guestOnlyPath = isGuestOnlyPath(pathname);
  if (!user) {
    if (protectedPath) {
      const login = new URL('/login', request.url);
      login.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
      const response = NextResponse.redirect(login, 302);
      copyCookies(supabaseResponse, response);
      return response;
    }
    return supabaseResponse;
  }

  if (!protectedPath && !guestOnlyPath) return supabaseResponse;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, is_suspended')
    .eq('id', user.id)
    .single();
  if (error || !profile || !isRole(profile.role)) return deny(supabaseResponse);

  if (profile.is_suspended) {
    await supabase.auth.signOut({ scope: 'local' });
    const response = NextResponse.redirect(new URL('/login?reason=suspended', request.url), 302);
    copyCookies(supabaseResponse, response);
    for (const { name } of request.cookies.getAll()) {
      if (/^sb-.+-auth-token(?:\.\d+)?$/.test(name)) {
        response.cookies.set(name, '', { maxAge: 0, path: '/' });
      }
    }
    return response;
  }

  if (requiredRole && !isRoleAllowed(profile.role, pathname)) return deny(supabaseResponse);

  if (guestOnlyPath) {
    const requested = request.nextUrl.searchParams.get('next');
    const destination = typeof requested === 'string' && loginDestination(profile.role, requested) === requested
      ? requested
      : getRoleHome(profile.role);
    const response = NextResponse.redirect(new URL(destination, request.url), 302);
    copyCookies(supabaseResponse, response);
    return response;
  }

  return supabaseResponse;
}
