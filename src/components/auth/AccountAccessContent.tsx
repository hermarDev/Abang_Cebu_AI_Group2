"use client";

import type { Dispatch, SetStateAction } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import styles from "@/features/map/RestoredFinderShell.module.css";

export type AccountMode = "sign-in" | "sign-up" | "reset";

export function AccountAccessContent({ mode, onModeChange, isRecovery = false, statusMessage, onLoginSuccess }: {
  onLoginSuccess?: () => void;
  mode: AccountMode;
  onModeChange: Dispatch<SetStateAction<AccountMode>>;
  isRecovery?: boolean;
  statusMessage?: string;
}) {
  if (mode === "reset") {
    return <section className={styles.accountContent} aria-label="Password recovery">
      <ResetPasswordForm isRecovery={isRecovery} onBackToLogin={() => onModeChange("sign-in")} embedded />
    </section>;
  }
  return <section className={styles.accountContent} aria-labelledby="account-heading">
    <div className="mb-4">
      <h2 id="account-heading" tabIndex={-1} className={styles.accountHeading}>{mode === "sign-in" ? "Welcome back" : "Create your account"}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{mode === "sign-in" ? "Log in to your account to continue" : "Join AbangCebu to find or list rental properties"}</p>
    </div>
    {mode === "sign-in"
      ? <LoginForm onRegister={() => onModeChange("sign-up")} onForgotPassword={() => onModeChange("reset")} statusMessage={statusMessage} onSuccess={onLoginSuccess} />
      : <RegisterForm onLogin={() => onModeChange("sign-in")} />}
  </section>;
}
