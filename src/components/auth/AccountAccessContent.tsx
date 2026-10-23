"use client";

import type { Dispatch, SetStateAction } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import styles from "@/features/map/RestoredFinderShell.module.css";

type AccountMode = "sign-in" | "sign-up";

export function AccountAccessContent({ mode, onModeChange }: { mode: AccountMode; onModeChange: Dispatch<SetStateAction<AccountMode>> }) {
  return <>
    <div className={styles.accountModeTabs} role="group" aria-label="Account access" style={{ "--action": "#2563eb", "--action-foreground": "#ffffff", "--action-hover": "#1d4ed8" } as React.CSSProperties}>
      <button type="button" className={mode === "sign-in" ? styles.accountModeTabActive : styles.accountModeTab} aria-pressed={mode === "sign-in"} onClick={() => onModeChange("sign-in")}>Sign in</button>
      <button type="button" className={mode === "sign-up" ? styles.accountModeTabActive : styles.accountModeTab} aria-pressed={mode === "sign-up"} onClick={() => onModeChange("sign-up")}>Sign up</button>
    </div>
    {mode === "sign-in" ? <LoginForm onRegister={() => onModeChange("sign-up")} /> : <RegisterForm onLogin={() => onModeChange("sign-in")} />}
  </>;
}
