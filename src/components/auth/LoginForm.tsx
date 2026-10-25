"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
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
    setStatusMessage(null);
    setLoading(true);
    try {
      const result = await signInWithEmail(email, password);
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
            <Input
              id={emailId}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              required
            />
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
              <Input
                id={passwordId}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? `${passwordId}-error` : undefined}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {fieldErrors.email && <FieldError id={`${emailId}-error`} role="alert">{fieldErrors.email}</FieldError>}
          {fieldErrors.password && <FieldError id={`${passwordId}-error`} role="alert">{fieldErrors.password}</FieldError>}

          {statusMessage && (
            <div
              className="p-3 text-sm rounded bg-muted text-foreground border border-border"
              role={statusIsError ? "alert" : "status"}
            >
              {statusMessage}
            </div>
          )}

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
