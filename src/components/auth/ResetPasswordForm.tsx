"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { CircleAlert, Eye, EyeOff, KeyRound, LockKeyhole, Mail } from "lucide-react";
import { PasswordRequirements } from "./PasswordRequirements";
import { TurnstileWidget } from "./TurnstileWidget";

const genericSuccess = "If an account is associated with this email, a password recovery link has been dispatched.";

export function ResetPasswordForm({ isRecovery = false, onBackToLogin, embedded = false }: { isRecovery?: boolean; onBackToLogin?: () => void; embedded?: boolean }) {
  const emailId = useId();
  const newPasswordId = useId();
  const confirmPasswordId = useId();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [mismatchChecked, setMismatchChecked] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const validateEmail = (value: string) => !value.trim() ? "Enter your email address." : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? "Enter a valid email address." : null;
  const requestSent = !isRecovery && !!message && !isError;
  const passwordsMatch = !!newPassword && !!confirmPassword && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement | undefined;
    if (loading) return;
    setMessage(null);
    setIsError(false);
    setPasswordMismatch(false);
    setPasswordError(null);
    if (!isRecovery) {
      setEmailSubmitted(true);
      const nextEmailError = validateEmail(email);
      setEmailError(nextEmailError);
      if (nextEmailError) {
        (form?.querySelector?.<HTMLInputElement>('[name="email"]') ?? form?.querySelector?.<HTMLInputElement>('[type="email"]'))?.focus?.();
        return;
      }
    }
    if (isRecovery && newPassword !== confirmPassword) {
      setMismatchChecked(true);
      setPasswordMismatch(true);
      form?.querySelector?.<HTMLInputElement>('[name="confirmPassword"]')?.focus();
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(isRecovery ? "/api/auth/reset-password/confirm" : "/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRecovery ? { newPassword, confirmPassword } : { email, ...(turnstileToken ? { turnstileToken } : {}) }),
      });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        if (isRecovery && data?.error?.code === "WEAK_PASSWORD") {
          setPasswordError("Choose a stronger password.");
          form?.querySelector<HTMLInputElement>('[name="newPassword"]')?.focus();
          return;
        }
        setIsError(true);
        setMessage(data?.error?.message || "Password recovery is temporarily unavailable. Try again.");
        if (!isRecovery) {
          setTurnstileResetKey((k) => k + 1);
          setTurnstileToken("");
        }
        return;
      }

      if (isRecovery) {
        router.replace(data?.data?.redirectUrl || "/login?message=password_reset_success");
        router.refresh();
        return;
      }
      setMessage(genericSuccess);
    } catch {
      setIsError(true);
      setMessage("Password recovery is temporarily unavailable. Try again.");
      if (!isRecovery) {
        setTurnstileResetKey((k) => k + 1);
        setTurnstileToken("");
      }
    } finally {
      setLoading(false);
    }
  };

  const Surface = embedded ? "div" : Card;

  return (
    <Surface {...(embedded ? { className: "w-full" } : { "data-surface": "finder", className: "mx-auto w-full max-w-md border-border bg-card text-card-foreground shadow-lg" } as Record<string, string>)} >
      {!embedded && <CardHeader className="items-center gap-3 px-6 pt-7 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-foreground" aria-hidden="true">
          <KeyRound size={25} strokeWidth={1.8} />
        </span>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">{isRecovery ? "Choose a new password" : requestSent ? "Check your email" : "Reset password"}</CardTitle>
        {!requestSent && <CardDescription className="max-w-xs text-muted-foreground">{isRecovery ? "Enter and confirm your new password" : "Enter your email to receive recovery instructions"}</CardDescription>}
      </CardHeader>}
      {embedded && <div className="items-center gap-3 text-center mb-4">
        <span className="inline-grid size-14 place-items-center rounded-full bg-accent text-accent-foreground mb-3" aria-hidden="true">
          <KeyRound size={25} strokeWidth={1.8} />
        </span>
        <h3 className="text-xl font-bold tracking-tight text-foreground">{isRecovery ? "Choose a new password" : requestSent ? "Check your email" : "Reset password"}</h3>
        {!requestSent && <p className="max-w-xs mx-auto text-sm text-muted-foreground">{isRecovery ? "Enter and confirm your new password" : "Enter your email to receive recovery instructions"}</p>}
      </div>}
      <CardContent className="px-6 pb-6">
        {message && (
          <div
            className={isError
              ? "mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 text-foreground"
              : "mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-foreground"}
            role={isError ? "alert" : "status"}
          >
            {isError ? (
              <CircleAlert size={18} aria-hidden="true" className="shrink-0 text-destructive mt-0.5" />
            ) : (
              <Mail size={18} aria-hidden="true" className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            )}
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">{message}</p>
              {isError && isRecovery && message.includes("expired") && (
                <button
                  type="button"
                  className="mt-2 inline-flex items-center text-xs font-semibold text-action hover:underline"
                  onClick={() => {
                    setMessage(null);
                    setIsError(false);
                    router.refresh();
                    if (onBackToLogin) onBackToLogin();
                    else router.push("/reset-password");
                  }}
                >
                  Request a new reset link &rarr;
                </button>
              )}
            </div>
          </div>
        )}
        {!requestSent && <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {isRecovery ? (
            <>
              <div>
                <label htmlFor={newPasswordId} className="mb-1 block text-sm font-medium">New password</label>
                <div className="relative">
                  <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-[18px] text-muted-foreground" />
                <Input
                  className="pl-10 pr-12 border-input bg-card text-foreground focus-visible:outline-ring"
                  id={newPasswordId}
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={newPassword}
                  readOnly={loading}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={`${newPasswordId}-policy${passwordError ? ` ${newPasswordId}-error` : ""}`}
                  onChange={(e) => { const value = e.target.value; setNewPassword(value); setPasswordError(null); if (mismatchChecked) setPasswordMismatch(value !== confirmPassword); }}
                  required
                />
                  <button type="button" className="absolute right-0 top-0 grid min-h-11 min-w-11 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring" onClick={() => setShowNewPassword(value => !value)} aria-label={showNewPassword ? "Hide new password" : "Show new password"} aria-pressed={showNewPassword}>
                    {showNewPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
                  </button>
                </div>
                <PasswordRequirements id={`${newPasswordId}-policy`} password={newPassword} confirmPassword={confirmPassword} />
                {passwordError && <p id={`${newPasswordId}-error`} role="alert" className="text-sm text-destructive">{passwordError}</p>}
              </div>
              <div>
                <label htmlFor={confirmPasswordId} className="mb-1 block text-sm font-medium">Confirm new password</label>
                <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && confirmPassword) { setMismatchChecked(true); setPasswordMismatch(confirmPassword !== newPassword); } }}>
                  <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-[18px] text-muted-foreground" />
                <Input
                  className="pl-10 pr-12 border-input bg-card text-foreground focus-visible:outline-ring"
                  id={confirmPasswordId}
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={confirmPassword}
                  readOnly={loading}
                  aria-invalid={passwordMismatch}
                  aria-describedby={passwordMismatch || passwordsMatch ? `${confirmPasswordId}-error` : undefined}
                  onChange={(e) => { const value = e.target.value; setConfirmPassword(value); if (mismatchChecked) setPasswordMismatch(value !== newPassword); }}
                  required
                />
                  <button type="button" className="absolute right-0 top-0 grid min-h-11 min-w-11 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring" onClick={() => setShowConfirmPassword(value => !value)} aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"} aria-pressed={showConfirmPassword}>
                    {showConfirmPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
                  </button>
                </div>
                {passwordMismatch && <p id={`${confirmPasswordId}-error`} role="alert" className="text-sm text-destructive">Passwords do not match.</p>}
                <div role="status" data-password-match-status={true}>
                  {!passwordMismatch && passwordsMatch && <p id={`${confirmPasswordId}-error`} className="text-sm text-emerald-700 dark:text-emerald-400"><span aria-hidden="true">✓ </span>Passwords match.</p>}
                </div>
              </div>
            </>
          ) : (
            <div>
              <label htmlFor={emailId} className="mb-1 block text-sm font-medium">Email Address</label>
              <div className="relative">
                <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-[18px] text-muted-foreground" />
              <Input
                className="pl-10 border-input bg-card text-foreground placeholder:text-muted-foreground focus-visible:outline-ring"
                id={emailId}
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? `${emailId}-error` : undefined}
                onChange={(e) => { const value = e.target.value; setEmail(value); if (emailSubmitted) setEmailError(validateEmail(value)); }}
                required
              />
              </div>
              {emailError && <p id={`${emailId}-error`} role="alert" className="mt-1 text-sm text-destructive">{emailError}</p>}
            </div>
          )}

          {!isRecovery && (
            <TurnstileWidget
              action="recovery"
              onTokenChange={setTurnstileToken}
              resetKey={turnstileResetKey}
            />
          )}

          <Button type="submit" variant="primary" fullWidth size="lg" disabled={loading}>
            {loading ? (isRecovery ? "Updating password..." : "Sending link...") : (isRecovery ? "Update Password" : "Send reset link")}
          </Button>
        </form>}
        <div className="mt-4 text-center">
          {onBackToLogin ? (
            <button type="button" className="inline-flex min-h-11 items-center rounded text-sm font-medium text-action hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" onClick={onBackToLogin}>
              Back to Log In
            </button>
          ) : (
            <Link href="/login" className="inline-flex min-h-11 items-center rounded text-sm font-medium text-action hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              Back to Log In
            </Link>
          )}
        </div>
      </CardContent>
    </Surface>
  );
}
