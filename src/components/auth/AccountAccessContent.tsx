"use client";

import type { Dispatch, SetStateAction } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import styles from "@/features/map/RestoredFinderShell.module.css";

export type AccountMode = "sign-in" | "sign-up" | "reset";

export function AccountAccessContent({ mode, onModeChange, isRecovery = false, statusMessage }: {
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
    <h2 id="account-heading" className={styles.accountHeading}>{mode === "sign-in" ? "Welcome back" : "Create your account"}</h2>
    <div className={styles.accountModeTabs} role="group" aria-label="Account access">
      <button type="button" className={mode === "sign-in" ? styles.accountModeTabActive : styles.accountModeTab} aria-pressed={mode === "sign-in"} onClick={() => onModeChange("sign-in")}>Log In</button>
      <button type="button" className={mode === "sign-up" ? styles.accountModeTabActive : styles.accountModeTab} aria-pressed={mode === "sign-up"} onClick={() => onModeChange("sign-up")}>Register</button>
    </div>
    {mode === "sign-in"
      ? <LoginForm onRegister={() => onModeChange("sign-up")} onForgotPassword={() => onModeChange("reset")} statusMessage={statusMessage} />
      : <RegisterForm onLogin={() => onModeChange("sign-in")} />}
  </section>;
}
