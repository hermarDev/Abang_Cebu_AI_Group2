"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { KeyRound } from "lucide-react";

const genericSuccess = "If an account is associated with this email, a password recovery link has been dispatched.";

export function ResetPasswordForm({ isRecovery = false }: { isRecovery?: boolean }) {
  const emailId = useId();
  const newPasswordId = useId();
  const confirmPasswordId = useId();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const res = await fetch(isRecovery ? "/api/auth/reset-password/confirm" : "/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRecovery ? { newPassword, confirmPassword } : { email }),
      });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        setIsError(true);
        setMessage(data?.error?.message || "Password recovery is temporarily unavailable. Try again.");
        return;
      }

      if (isRecovery) {
        router.replace(data?.data?.redirectUrl || "/login?message=password_reset_success");
        router.refresh();
        return;
      }
      setMessage(data?.message || genericSuccess);
    } catch {
      setIsError(true);
      setMessage("Password recovery is temporarily unavailable. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card data-surface="finder" className="mx-auto w-full max-w-md border-[#d8e2ec] bg-white text-[#18344d] shadow-[0_12px_35px_rgb(9_27_43_/_12%)]">
      <CardHeader className="items-center gap-3 px-6 pt-7 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-[#eff6ff] text-[#2563eb]" aria-hidden="true">
          <KeyRound size={25} strokeWidth={1.8} />
        </span>
        <CardTitle className="text-2xl font-bold tracking-tight text-[#18344d]">{isRecovery ? "Choose a new password" : "Reset Password"}</CardTitle>
        <CardDescription className="max-w-xs text-[#52677b]">{isRecovery ? "Enter and confirm your new password" : "Enter your email to receive recovery instructions"}</CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {message && (
          <div className="mb-4 rounded border border-border bg-accent p-4 text-center text-accent-foreground" role={isError ? "alert" : "status"}>
            <p className="text-sm">{message}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRecovery ? (
            <>
              <div>
                <label htmlFor={newPasswordId} className="mb-1 block text-sm font-medium">New password</label>
                <Input
                  className="border-[#cbd9e8] bg-white text-[#18344d] focus-visible:outline-[#2563eb]"
                  id={newPasswordId}
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <p className="mt-2 text-xs text-[#52677b]">Use 8–72 characters and include at least three: uppercase, lowercase, number, or symbol.</p>
              </div>
              <div>
                <label htmlFor={confirmPasswordId} className="mb-1 block text-sm font-medium">Confirm new password</label>
                <Input
                  className="border-[#cbd9e8] bg-white text-[#18344d] focus-visible:outline-[#2563eb]"
                  id={confirmPasswordId}
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <label htmlFor={emailId} className="mb-1 block text-sm font-medium">Email Address</label>
              <Input
                className="border-[#cbd9e8] bg-white text-[#18344d] placeholder:text-[#8092a4] focus-visible:outline-[#2563eb]"
                id={emailId}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
          )}
          <Button type="submit" variant="primary" fullWidth size="lg" disabled={loading} className="bg-[#2563eb] text-white hover:bg-[#1d4ed8]">
            {loading ? (isRecovery ? "Updating password..." : "Sending link...") : (isRecovery ? "Update Password" : "Send Recovery Link")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
