"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useRouter } from "next/navigation";
import { getPostLoginRedirect, signInWithEmail } from "@/lib/auth/sign-in";

export function LoginForm({
  onRegister,
  statusMessage: initialStatusMessage,
}: {
  onRegister?: () => void;
  statusMessage?: string;
} = {}) {
  const emailId = useId();
  const passwordId = useId();
  const router = useRouter();
  const [role, setRole] = useState<"renter" | "landlord">("renter");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(initialStatusMessage ?? null);
  const [statusIsError, setStatusIsError] = useState(!initialStatusMessage);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setLoading(true);
    try {
      const result = await signInWithEmail(email, password, role);
      if (!result.success) {
        setStatusIsError(true);
        setStatusMessage(result.message);
        return;
      }
      setStatusIsError(false);
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(getPostLoginRedirect(next));
      router.refresh();
    } catch {
      setStatusIsError(true);
      setStatusMessage("Sign in is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
        <CardDescription>Sign in to your AbangCebu account</CardDescription>
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

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="flex justify-between items-center mb-1">
              <label htmlFor={passwordId} className="block text-sm font-medium">
                Password
              </label>
              <Link href="/reset-password" className="text-xs text-action hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id={passwordId}
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

          {statusMessage && (
            <div
              className="p-3 text-sm rounded bg-muted text-foreground border border-border"
              role={statusIsError ? "alert" : "status"}
            >
              {statusMessage}
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth size="lg" disabled={loading}>
            {loading ? "Signing in…" : `Sign In as ${role === "renter" ? "Renter" : "Landlord"}`}
          </Button>

          <div className="text-center mt-4">
            <span className="text-sm text-muted-foreground">Don&apos;t have an account? </span>
            <button
              type="button"
              className="text-sm font-medium text-action hover:underline"
              onClick={onRegister ?? (() => router.push("/register"))}
            >
              Register here
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
