"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export function RegisterForm({ onLogin }: { onLogin?: () => void } = {}) {
  const router = useRouter();
  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const passwordId = useId();

  const [role, setRole] = useState<"renter" | "landlord">("renter");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

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
    setSuccessMessage(null);
    setRegistered(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phoneNumber: phoneNumber || undefined,
          password,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data?.error?.message || "Registration failed. Please check your inputs.");
      } else {
        setSuccessMessage("Account created successfully! Check your email to verify your registration.");
        setRegistered(true);
      }
    } catch {
      setErrorMessage("Network error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
        <CardDescription>Join AbangCebu to discover and list rentals in Cebu</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Role Segmented Selector */}
        <div className="flex rounded-md bg-muted p-1 mb-6" role="tablist" aria-label="User role selection">
          <button
            type="button"
            role="tab"
            aria-selected={role === "renter"}
            className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors ${
              role === "renter" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setRole("renter")}
          >
            Renter
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === "landlord"}
            className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors ${
              role === "landlord" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setRole("landlord")}
          >
            Landlord
          </button>
        </div>

        {successMessage && registered ? (
          <div className="p-4 text-center rounded bg-accent text-accent-foreground border border-border" role="status">
            <h4 className="font-semibold mb-1">Check Your Email</h4>
            <p className="text-sm">{successMessage}</p>
            <div className="mt-4">
              <button type="button" className="text-sm font-medium text-action hover:underline" onClick={onLogin ?? (() => router.push("/login"))}>
                Return to Login
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor={nameId} className="block text-sm font-medium mb-1">
                Full Name
              </label>
              <Input
                id={nameId}
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan dela Cruz"
                required
              />
            </div>

            <div>
              <label htmlFor={emailId} className="block text-sm font-medium mb-1">
                Email Address
              </label>
              <Input
                id={emailId}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor={phoneId} className="block text-sm font-medium mb-1">
                Philippine Mobile Number (Optional)
              </label>
              <Input
                id={phoneId}
                type="tel"
                inputMode="numeric"
                maxLength={11}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="09171234567"
              />
            </div>

            <div>
              <label htmlFor={passwordId} className="block text-sm font-medium mb-1">
                Password
              </label>
              <div className="relative">
                <Input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
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

            <Button type="submit" variant="primary" fullWidth size="lg" disabled={loading}>
              {loading ? "Registering..." : `Register as ${role === "renter" ? "Renter" : "Landlord"}`}
            </Button>

            <div className="text-center mt-4">
              <span className="text-sm text-muted-foreground">Already have an account? </span>
              <button
                type="button"
                className="text-sm font-medium text-action hover:underline"
                onClick={onLogin ?? (() => router.push("/login"))}
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
