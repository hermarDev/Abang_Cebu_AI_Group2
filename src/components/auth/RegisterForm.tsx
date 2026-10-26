"use client";

import { useId, useMemo, useState } from "react";
import { Eye, EyeOff, Mail, LockKeyhole, UserRound, Search, HousePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TurnstileWidget } from "./TurnstileWidget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { validateRegistration } from "@/lib/auth/validation";
import type { RegisterPayload } from "@/types/auth";

export function RegisterForm({ onLogin }: { onLogin?: () => void } = {}) {
  const router = useRouter();
  const Surface = onLogin ? "div" : Card;
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  const [role, setRole] = useState<"renter" | "landlord">("renter");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RegisterPayload, string>>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const verificationRequired = process.env.NODE_ENV === "production";

  // Live password strength calculation
  const strengthScore = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const strengthLabel = useMemo(() => {
    if (!password) return "";
    if (strengthScore <= 1) return "Weak";
    if (strengthScore <= 3) return "Moderate";
    return "Strong";
  }, [password, strengthScore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setSuccessMessage(null);
    setRegistered(false);
    if (loading) return;
    const validation = validateRegistration({ fullName, email, password, role });
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      const firstInvalid = (["fullName", "email", "password"] as const).find((field) => validation.errors[field]);
      if (firstInvalid) (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    if (verificationRequired && !turnstileToken) {
      setErrorMessage("Complete the security verification before registering. If it is unavailable, reload and try again.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role,
          turnstileToken: turnstileToken || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const details: unknown = data?.error?.details;
        if (typeof details === "object" && details !== null) {
          const errors = details as Partial<Record<keyof RegisterPayload, unknown>>;
          setFieldErrors(Object.fromEntries(Object.entries(errors).filter((entry): entry is [string, string] => typeof entry[1] === "string")) as Partial<Record<keyof RegisterPayload, string>>);
        }
        setErrorMessage(data?.error?.message || "Registration failed. Please check your inputs.");
      } else {
        setSuccessMessage("If registration can proceed, check your email for the next steps.");
        setRegistered(true);
      }
    } catch {
      setErrorMessage("Network error. Please try again later.");
    } finally {
      setTurnstileToken("");
      setResetKey((key) => key + 1);
      setLoading(false);
    }
  };

  return (
    <Surface {...(onLogin ? { className: "w-full" } : { className: "w-full max-w-lg mx-auto shadow-md", "data-surface": "finder" })}>
      {!onLogin && <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
        <CardDescription>Join AbangCebu to discover and list rentals in Cebu</CardDescription>
      </CardHeader>}
      <CardContent className={onLogin ? "p-0" : undefined}>
        {/* Role RadioGroup Selector */}
        <RadioGroup.Root
          value={role}
          onValueChange={(value) => {
            if (value === "renter" || value === "landlord") setRole(value);
          }}
          className="flex rounded-md bg-muted p-1 mb-4"
          aria-label="Account type"
        >
          <RadioGroup.Item value="renter" className={`min-h-11 flex-1 rounded text-center text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
            role === "renter" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}>
            <span className="inline-flex items-center justify-center gap-2"><Search size={18} aria-hidden="true" />Renter</span> <span className="block text-xs font-normal">Find rentals</span>
          </RadioGroup.Item>
          <RadioGroup.Item value="landlord" className={`min-h-11 flex-1 rounded text-center text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
            role === "landlord" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}>
            <span className="inline-flex items-center justify-center gap-2"><HousePlus size={18} aria-hidden="true" />Landlord</span> <span className="block text-xs font-normal">List properties</span>
          </RadioGroup.Item>
        </RadioGroup.Root>

        {successMessage && registered ? (
          <div className="p-4 text-center rounded bg-accent text-accent-foreground border border-border" role="status">
            <h4 className="font-semibold mb-1">Check Your Email</h4>
            <p className="text-sm">{successMessage}</p>
            <div className="mt-4">
              <button type="button" className="text-sm font-medium text-action hover:underline" onClick={onLogin ?? (() => router.push("/login"))}>
                {onLogin ? "Log In" : "Return to Login"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor={nameId} className="block text-sm font-medium mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserRound aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-[18px] text-muted-foreground" />
              <Input
                className="pl-10"
                id={nameId}
                name="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                aria-invalid={Boolean(fieldErrors.fullName)}
                aria-describedby={fieldErrors.fullName ? `${nameId}-error` : undefined}
                required
              />
              </div>
              {fieldErrors.fullName && <p id={`${nameId}-error`} className="mt-1 text-sm text-destructive" role="alert">{fieldErrors.fullName}</p>}
            </div>

            <div>
              <label htmlFor={emailId} className="block text-sm font-medium mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-[18px] text-muted-foreground" />
              <Input
                className="pl-10"
                id={emailId}
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
                required
              />
              </div>
              {fieldErrors.email && <p id={`${emailId}-error`} className="mt-1 text-sm text-destructive" role="alert">{fieldErrors.email}</p>}
            </div>

            <div>
              <label htmlFor={passwordId} className="block text-sm font-medium mb-1">
                Password
              </label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-[18px] text-muted-foreground" />
                <Input
                  id={passwordId}
                  name="password"
                  className="pl-10 pr-12"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8–72 characters"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={`${passwordId}-policy${fieldErrors.password ? ` ${passwordId}-error` : ""}`}
                  required
                />
                {fieldErrors.password && <p id={`${passwordId}-error`} className="mt-1 text-sm text-destructive" role="alert">{fieldErrors.password}</p>}
                <button
                  type="button"
                  className="absolute right-0 top-0 grid min-h-11 min-w-11 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
                </button>
              </div>

              <p id={`${passwordId}-policy`} className="mt-2 text-xs text-muted-foreground">Use 8–72 characters and at least 3 of: uppercase, lowercase, numbers, and symbols.</p>
              {password && (
                <div className="mt-2 text-xs flex items-center justify-between">
                  <span className="text-muted-foreground">Strength: {strengthLabel}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-1.5 w-6 rounded-full ${
                          strengthScore >= step
                            ? strengthScore <= 1
                              ? "bg-destructive"
                              : strengthScore <= 3
                              ? "bg-warning"
                              : "bg-action"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            {errorMessage && (
              <div className="p-3 text-sm rounded bg-destructive/10 text-destructive border border-destructive/20" role="alert">
                {errorMessage}
              </div>
            )}

            <TurnstileWidget onTokenChange={setTurnstileToken} resetKey={resetKey} />
            {verificationRequired && !turnstileToken && (
              <p role="status" className="text-sm text-muted-foreground">Complete the security verification to register. If unavailable, reload and try again.</p>
            )}

            <Button type="submit" variant="primary" fullWidth size="lg" disabled={loading || (verificationRequired && !turnstileToken)}>
              {loading ? "Registering..." : `Register as ${role === "renter" ? "Renter" : "Landlord"}`}
            </Button>

            {!onLogin && <div className="text-center mt-4">
              <span className="text-sm text-muted-foreground">Already have an account? </span>
              <button
                type="button"
                className="text-sm font-medium text-action hover:underline"
                onClick={() => router.push("/login")}
              >
                Return to Login
              </button>
            </div>}
          </form>
        )}
      </CardContent>
    </Surface>
  );
}
