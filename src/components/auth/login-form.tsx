'use client';

import type { FormEvent } from 'react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { isSafeRedirectUrl } from '@/types/auth';

interface LoginResponse {
  success: boolean;
  data?: { redirectUrl: string };
  error?: { code?: string; message?: string };
}

interface TurnstileApi {
  render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void; 'error-callback': () => void }) => string;
  reset: (widgetId: string) => void;
}

declare global {
  interface Window { turnstile?: TurnstileApi }
}

function LoginFormBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !turnstileContainer.current) return;
    let widgetId: string | undefined;
    let script = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
    const render = () => {
      if (!window.turnstile || !turnstileContainer.current || widgetId) return;
      widgetId = window.turnstile.render(turnstileContainer.current, {
        sitekey: siteKey,
        callback: setTurnstileToken,
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => { setTurnstileToken(''); setError('Security verification failed. Refresh the page and try again.'); },
      });
    };
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = 'true';
      document.head.append(script);
    }
    script.addEventListener('load', render);
    if (window.turnstile) render();
    return () => script?.removeEventListener('load', render);
  }, [siteKey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (process.env.NODE_ENV === 'production' && !siteKey) {
      setError('Sign-in verification is unavailable. Please contact support.');
      return;
    }
    if (siteKey && !turnstileToken) {
      setError('Complete the security check before signing in.');
      return;
    }
    setError('');
    setPending(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe, turnstileToken, ...(next && isSafeRedirectUrl(next) ? { next } : {}) }),
      });
      const result = await response.json() as LoginResponse;
      if (!response.ok || !result.success || !result.data?.redirectUrl) {
        setError(result.error?.message ?? 'Unable to sign in. Please try again.');
        return;
      }
      router.replace(result.data.redirectUrl);
      router.refresh();
    } catch {
      setError('Unable to connect. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  const reason = searchParams.get('reason');
  const initialMessage = reason === 'logged_out' ? 'You have been signed out.'
    : reason === 'suspended' ? 'This account is suspended.' : '';

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--background)] px-4 py-10 text-[var(--foreground)]">
      <section aria-labelledby="login-title" className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8">
        <Link className="text-sm font-semibold text-[var(--action)]" href="/">AbangCebu AI</Link>
        <h1 id="login-title" className="mt-6 text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Welcome back. Enter your account details to continue.</p>
        {initialMessage && <p role="status" className="mt-4 rounded-lg bg-[var(--muted)] p-3 text-sm">{initialMessage}</p>}
        <form className="mt-6 space-y-5" onSubmit={submit}>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]" />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="size-4 accent-[var(--action)]" />
            Remember me
          </label>
          {siteKey && <div aria-label="Security verification" ref={turnstileContainer} />}
          {error && <p role="alert" className="rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]">{error}</p>}
          <button type="submit" disabled={pending} className="min-h-11 w-full rounded-lg bg-[var(--action)] px-4 py-2.5 font-semibold text-[var(--action-foreground)] hover:bg-[var(--action-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-wait disabled:opacity-60">
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">New to AbangCebu AI? <Link className="font-semibold text-[var(--action)] underline-offset-4 hover:underline" href="/register">Create an account</Link></p>
        <p className="mt-3 text-center text-sm"><Link className="text-[var(--action)] underline-offset-4 hover:underline" href="/forgot-password">Forgot password?</Link></p>
      </section>
    </main>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<main className="grid min-h-dvh place-items-center bg-[var(--background)] text-[var(--foreground)]"><p role="status">Loading sign-in…</p></main>}>
      <LoginFormBody />
    </Suspense>
  );
}
