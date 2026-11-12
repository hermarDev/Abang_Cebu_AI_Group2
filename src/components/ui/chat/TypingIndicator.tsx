"use client";

import styles from "./TypingIndicator.module.css";

export function TypingIndicator({ userName = "Someone" }: { userName?: string }) {
  return (
    <div className={styles.container} role="status" aria-live="polite" aria-label={`${userName} is typing`}>
      <span className={styles.dots} aria-hidden="true">
        <i></i>
        <i></i>
        <i></i>
      </span>
      <span className={styles.label}>{userName} is typing…</span>
    </div>
  );
}