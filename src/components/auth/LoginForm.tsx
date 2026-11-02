"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, Mail, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import { TurnstileWidget } from "./TurnstileWidget";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useRouter } from "next/navigation";
import { getPostLoginRedirect, signInWithEmail } from "@/lib/auth/sign-in";

export function LoginForm({
  onRegister,
  onForgotPassword,
  statusMessage: initialStatusMessage,
}: {
  onRegister?: () => void;
  onForgotPassword?: () => void;
  statusMessage?: string;
} = {}) {
  const emailId = useId();
  const passwordId = useId();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(initialStatusMessage ?? null);
  const [statusIsError, setStatusIsError] = useState(!initialStatusMessage);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const verificationRequired = process.env.NODE_ENV === "production" || Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const Surface = onRegister ? "div" : Card;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const errors = {
      email: !email.trim() ? "Enter your email address." : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "Enter a valid email address." : undefined,
      password: !password ? "Enter your password." : undefined,
    };
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      document.getElementById(errors.email ? emailId : passwordId)?.focus();
      return;
    }
    if (verificationRequired && !turnstileToken) {
      setStatusIsError(true);
      setStatusMessage("Complete the security verification before logging in. If it is unavailable, reload and try again.");
      return;
    }
    setStatusMessage(null);
    setLoading(true);
    try {
      const result = await signInWithEmail(email, password, turnstileToken || undefined);
      if (!result.success) {
        setStatusIsError(true);
        setStatusMessage(result.message.replace(/^Sign in\b/i, "Log in"));
        return;
      }
      setStatusIsError(false);
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(getPostLoginRedirect(next));
      router.refresh();
    } catch {
      setStatusIsError(true);
      setStatusMessage("Log in is temporarily unavailable. Please try again.");
    } finally {
      setTurnstileToken("");
      setResetKey(key => key + 1);
      setLoading(false);
    }
  };

  return (
    <Surface {...(onRegister ? { className: "w-full" } : { className: "w-full max-w-md mx-auto shadow-md", "data-surface": "finder" })}>
      {!onRegister && (
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Log in to your AbangCebu account</CardDescription>
        </CardHeader>
      )}
      <CardContent className={onRegister ? "p-0" : undefined}>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor={emailId} className="block text-sm font-medium mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-[18px] text-muted-foreground" />
            <Input
              className="pl-10"
              id={emailId}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            </div>
            {fieldErrors.email && <FieldError id={`${emailId}-error`} role="alert" className="mt-1">{fieldErrors.email}</FieldError>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor={passwordId} className="block text-sm font-medium">
                Password
              </label>
              {onForgotPassword ? (
                <button type="button" className="text-xs text-action hover:underline" onClick={onForgotPassword}>Forgot password?</button>
              ) : (
                <Link href="/reset-password" className="text-xs text-action hover:underline">Forgot password?</Link>
              )}
            </div>
            <div className="relative">
              <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-[18px] text-muted-foreground" />
              <Input
                id={passwordId}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? `${passwordId}-error` : undefined}
                className="pl-10 pr-12"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute right-0 top-0 grid min-h-11 min-w-11 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
              </button>
            </div>
            {fieldErrors.password && <FieldError id={`${passwordId}-error`} role="alert" className="mt-1">{fieldErrors.password}</FieldError>}
          </div>

          {statusMessage && (
            <div
              className="p-3 text-sm rounded bg-muted text-foreground border border-border"
              role={statusIsError ? "alert" : "status"}
            >
              {statusMessage}
            </div>
          )}

          {verificationRequired && <TurnstileWidget onTokenChange={setTurnstileToken} resetKey={resetKey} />}
          <Button type="submit" variant="primary" fullWidth size="lg" disabled={loading}>
            {loading ? "Logging in…" : "Log In"}
          </Button>

          {!onRegister && (
            <div className="text-center mt-4">
              <span className="text-sm text-muted-foreground">Don&apos;t have an account? </span>
              <button
                type="button"
                className="text-sm font-medium text-action hover:underline"
                onClick={onRegister ?? (() => router.push("/register"))}
              >
                Register
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Surface>
  );
}
